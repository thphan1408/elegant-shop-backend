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

  async findAll(query: QueryProductDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const where = {
      category: query.category,
      brand: query.brand,
      is_featured: query.is_featured,
      is_active: true,
      ...(query.search && {
        OR: [
          { name: { contains: query.search } },
          { description: { contains: query.search } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prismaService.product.findMany({
        where,
        skip,
        take: query.limit,
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
    const enhanced = products.map((product) => {
      const reviewCount = product.reviews.length;
      const avgRating = reviewCount
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviewCount
        : 0;

      return {
        ...product,
        stars_evaluation: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        rating_count: reviewCount,
      };
    });

    return { data: enhanced, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const product = await this.prismaService.product.findUnique({
      where: { id, is_active: true }, // Bảo mật: Chỉ active
      include: { variants: true, reviews: true, relatedProducts: true }, // Eager load chống N+1
    });

    if (!product) throw new NotFoundException('Product not found');

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
