import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import slugify from 'slugify';
import { QueryProductDto } from 'src/product/dto/query-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prismaService: PrismaService) {}

  addProduct(createProductDto: CreateProductDto) {
    return this.prismaService.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...createProductDto,
          slug: slugify(createProductDto.name, { lower: true }),
          stars_evaluation: 0,
          variants: {
            create: createProductDto.variants,
          },
        },
        include: { variants: true },
      });
      return product;
    });
  }

  /**
   * Cleanup expired sales: Remove price_sale from variants when sale_end_date has passed
   * This method should be called periodically or on-demand
   */
  async cleanupExpiredSales() {
    const now = new Date();

    // Find all products with expired sales
    const expiredProducts = await this.prismaService.product.findMany({
      where: {
        sale_end_date: {
          lte: now, // sale_end_date <= now (expired)
          not: null,
        },
      },
      include: {
        variants: {
          where: {
            price_sale: {
              not: null,
            },
          },
        },
      },
    });

    // Remove price_sale from all variants of expired products
    for (const product of expiredProducts) {
      await this.prismaService.productVariant.updateMany({
        where: {
          productId: product.id,
          price_sale: { not: null },
        },
        data: {
          price_sale: null,
        },
      });
    }

    // Clear sale dates from products
    await this.prismaService.product.updateMany({
      where: {
        sale_end_date: {
          lte: now,
          not: null,
        },
      },
      data: {
        sale_start_date: null,
        sale_end_date: null,
      },
    });

    return {
      cleanedProducts: expiredProducts.length,
      message: `Cleaned up ${expiredProducts.length} expired sales`,
    };
  }

  async findAll(query: QueryProductDto) {
    // Cleanup expired sales in background (non-blocking for better performance)
    // Note: For production, consider using a scheduled task (cron job) instead
    this.cleanupExpiredSales().catch((error) => {
      // Log error but don't block the request
      console.error('Error cleaning up expired sales:', error);
    });

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const where: {
      category?: string;
      brand?: string;
      is_featured?: boolean;
      is_active: boolean;
      OR?: Array<
        { name: { contains: string } } | { description: { contains: string } }
      >;
    } = {
      is_active: true,
    };

    // Only include filters if they are defined (not undefined)
    if (query.category !== undefined) {
      where.category = query.category;
    }
    if (query.brand !== undefined) {
      where.brand = query.brand;
    }
    if (query.is_featured !== undefined) {
      where.is_featured = query.is_featured;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updated_at: 'desc' },
        include: {
          variants: true,
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      }),
      this.prismaService.product.count({ where }),
    ]);

    // Optimize: Calculate average rating more efficiently
    // Filter out expired sales on variants in response
    const now = new Date();
    const enhanced = products.map((product) => {
      const reviewCount = product.reviews.length;
      const avgRating = reviewCount
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviewCount
        : 0;

      // Remove price_sale from variants if sale has expired (for display)
      // Actual database cleanup happens in background or scheduled task
      const isSaleExpired =
        product.sale_end_date && new Date(product.sale_end_date) < now;
      const variants = product.variants.map((variant) => {
        if (isSaleExpired && variant.price_sale !== null) {
          return { ...variant, price_sale: null };
        }
        return variant;
      });

      return {
        ...product,
        variants,
        // Clear sale dates in response if expired
        sale_start_date: isSaleExpired ? null : product.sale_start_date,
        sale_end_date: isSaleExpired ? null : product.sale_end_date,
        stars_evaluation: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        rating_count: reviewCount,
      };
    });

    return { data: enhanced, total, page, limit };
  }

  async findOne(id: string) {
    const product = await this.prismaService.product.findUnique({
      where: { id, is_active: true }, // Bảo mật: Chỉ active
      include: { variants: true, reviews: true, relatedProducts: true }, // Eager load chống N+1
    });

    if (!product) throw new NotFoundException('Product not found');

    // Check if sale has expired and filter in response
    // Actual database cleanup happens in background or scheduled task
    const now = new Date();
    const isSaleExpired =
      product.sale_end_date && new Date(product.sale_end_date) < now;

    if (isSaleExpired) {
      // Remove price_sale from variants in response (filter expired sales)
      product.variants = product.variants.map((variant) => ({
        ...variant,
        price_sale: null,
      }));
      product.sale_start_date = null;
      product.sale_end_date = null;

      // Trigger background cleanup for this product (non-blocking)
      this.prismaService.productVariant
        .updateMany({
          where: {
            productId: id,
            price_sale: { not: null },
          },
          data: {
            price_sale: null,
          },
        })
        .catch((error) => {
          console.error(
            `Error cleaning up expired sale for product ${id}:`,
            error,
          );
        });

      this.prismaService.product
        .update({
          where: { id },
          data: {
            sale_start_date: null,
            sale_end_date: null,
          },
        })
        .catch((error) => {
          console.error(`Error clearing sale dates for product ${id}:`, error);
        });
    }

    // Increment views atomic (chống race attack)
    await this.prismaService.product.update({
      where: { id },
      data: { views_count: { increment: 1 } },
    });

    // Calc ratings (round to 1 decimal for consistency)
    const reviewCount = product.reviews.length;
    const avgRating = reviewCount
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;
    product.stars_evaluation = Math.round(avgRating * 10) / 10;
    product.rating_count = reviewCount;

    return product;
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    // Check if product exists
    const existingProduct = await this.prismaService.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    const { variants, name, ...productData } = updateProductDto;

    // Auto-update slug if name changes
    const updateData: {
      [key: string]: unknown;
    } = {
      ...productData,
      ...(name && { name, slug: slugify(name, { lower: true }) }),
      ...(variants && {
        variants: {
          deleteMany: {},
          create: variants,
        },
      }),
    };

    return this.prismaService.product.update({
      where: { id },
      data: updateData,
      include: { variants: true },
    });
  }

  async removeProduct(id: string) {
    // Check if product exists
    const existingProduct = await this.prismaService.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // Soft delete: Set is_active to false instead of hard delete
    // This preserves data integrity and allows recovery if needed
    return this.prismaService.product.update({
      where: { id },
      data: { is_active: false },
      include: { variants: true },
    });
  }
}
