import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, FAQCategory } from '@prisma/client';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';
import { QueryFAQDto } from './dto/query-faq.dto';

@Injectable()
export class FAQService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Create a new FAQ
   */
  async create(createFAQDto: CreateFAQDto) {
    // If productId is provided, verify product exists
    if (createFAQDto.productId) {
      const product = await this.prismaService.product.findUnique({
        where: { id: createFAQDto.productId, is_active: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found or inactive');
      }
    }

    return this.prismaService.fAQ.create({
      data: {
        question: createFAQDto.question,
        answer: createFAQDto.answer,
        category: createFAQDto.category,
        productId: createFAQDto.productId ?? null,
        images: createFAQDto.images || [],
        attachments: createFAQDto.attachments || [],
        order: createFAQDto.order ?? 0,
        is_active: createFAQDto.is_active ?? true,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get all FAQs with pagination and filters
   */
  async findAll(query: QueryFAQDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause conditionally
    const where: {
      category?: FAQCategory;
      productId?: string | null;
      is_active?: boolean;
    } = {};

    if (query.category !== undefined) {
      where.category = query.category;
    }

    if (query.productId !== undefined) {
      where.productId = query.productId;
    }

    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    const orderBy: Prisma.FAQOrderByWithRelationInput[] = [
      { order: query.order || 'asc' },
      { created_at: 'desc' },
    ];

    const [faqs, total] = await Promise.all([
      this.prismaService.fAQ.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prismaService.fAQ.count({ where }),
    ]);

    return {
      data: faqs,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single FAQ by ID
   */
  async findOne(id: string) {
    const faq = await this.prismaService.fAQ.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }

    return faq;
  }

  /**
   * Update a FAQ
   * Note: productId cannot be updated through this endpoint
   * If needed, create a new FAQ with different productId and delete the old one
   */
  async update(id: string, updateFAQDto: UpdateFAQDto) {
    // Verify FAQ exists
    const existingFAQ = await this.prismaService.fAQ.findUnique({
      where: { id },
    });

    if (!existingFAQ) {
      throw new NotFoundException('FAQ not found');
    }


    return this.prismaService.fAQ.update({
      where: { id },
      data: {
        ...(updateFAQDto.question !== undefined && {
          question: updateFAQDto.question,
        }),
        ...(updateFAQDto.answer !== undefined && {
          answer: updateFAQDto.answer,
        }),
        ...(updateFAQDto.category !== undefined && {
          category: updateFAQDto.category,
        }),
        ...(updateFAQDto.images !== undefined && {
          images: updateFAQDto.images,
        }),
        ...(updateFAQDto.attachments !== undefined && {
          attachments: updateFAQDto.attachments,
        }),
        ...(updateFAQDto.order !== undefined && {
          order: updateFAQDto.order,
        }),
        ...(updateFAQDto.is_active !== undefined && {
          is_active: updateFAQDto.is_active,
        }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Delete a FAQ (hard delete)
   */
  async remove(id: string) {
    const faq = await this.prismaService.fAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }

    await this.prismaService.fAQ.delete({
      where: { id },
    });

    return { message: 'FAQ deleted successfully' };
  }

  /**
   * Get FAQs for a specific product
   */
  async findByProduct(productId: string, query: QueryFAQDto) {
    // Verify product exists
    const product = await this.prismaService.product.findUnique({
      where: { id: productId, is_active: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: {
      productId: string;
      category?: FAQCategory;
      is_active?: boolean;
    } = {
      productId,
    };

    if (query.category !== undefined) {
      where.category = query.category;
    }

    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    const orderBy: Prisma.FAQOrderByWithRelationInput[] = [
      { order: query.order || 'asc' },
      { created_at: 'desc' },
    ];

    const [faqs, total] = await Promise.all([
      this.prismaService.fAQ.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prismaService.fAQ.count({ where }),
    ]);

    return {
      data: faqs,
      total,
      page,
      limit,
    };
  }
}

