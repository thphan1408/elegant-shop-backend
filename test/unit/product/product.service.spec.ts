import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from 'src/product/product.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { UpdateProductDto } from 'src/product/dto/update-product.dto';
import { NotFoundException } from '@nestjs/common';

describe('ProductService', () => {
  let service: ProductService;
  let prismaMock: any;

  // Mock data
  const mockProduct = {
    id: 'uuid-1234-5678',
    name: 'Test Product',
    slug: 'test-product',
    category: 'Electronics',
    measurement: '10x20 cm',
    description: 'Test description',
    stars_evaluation: 0,
    rating_count: 1,
    is_active: true,
    is_featured: false,
    views_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
    variants: [
      {
        id: 'variant-uuid',
        productId: 'uuid-1234-5678',
        color: 'Red',
        sku: 'SKU001',
        price: 100,
        quantity: 10,
        image: 'image.jpg',
      },
    ],
    reviews: [],
    relatedProducts: [],
  };

  const mockProductWithReviews = {
    ...mockProduct,
    reviews: [{ rating: 5 }, { rating: 4 }, { rating: 3 }],
  };

  beforeEach(async () => {
    prismaMock = {
      $transaction: jest.fn().mockImplementation((fn) => fn(prismaMock)),
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addProduct', () => {
    it('should create product with variants in transaction', async () => {
      const dto: CreateProductDto = {
        name: 'Test Product',
        category: 'Electronics',
        measurement: '10x20 cm',
        description: 'Test description',
        variants: [
          {
            color: 'Red',
            sku: 'SKU001',
            price: 100,
            quantity: 10,
            image: 'image.jpg',
          },
        ],
      };

      prismaMock.product.create.mockResolvedValue(mockProduct);

      const result = await service.addProduct(dto);

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Product',
            slug: 'test-product',
            stars_evaluation: 0,
            variants: {
              create: dto.variants,
            },
          }),
          include: { variants: true },
        }),
      );
      expect(result).toEqual(mockProduct);
    });

    it('should auto-generate slug from product name', async () => {
      const dto: CreateProductDto = {
        name: 'My Amazing Product Name',
        category: 'Fashion',
        measurement: 'L',
        description: 'Description',
        variants: [
          {
            color: 'Blue',
            sku: 'SKU002',
            price: 50,
            quantity: 5,
            image: 'img.jpg',
          },
        ],
      };

      prismaMock.product.create.mockResolvedValue({
        ...mockProduct,
        name: dto.name,
        slug: 'my-amazing-product-name',
      });

      await service.addProduct(dto);

      expect(prismaMock.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'my-amazing-product-name',
          }),
        }),
      );
    });

    it('should create product with all optional fields', async () => {
      const dto: CreateProductDto = {
        name: 'Full Product',
        category: 'Fashion',
        measurement: 'L',
        description: 'Full description',
        brand: 'TestBrand',
        material: 'Cotton',
        weight: 0.5,
        warranty: '1 year',
        tags: ['new', 'hot'],
        images: ['img1.jpg'],
        meta_title: 'SEO Title',
        meta_description: 'SEO Desc',
        is_featured: true,
        is_active: true,
        variants: [
          {
            color: 'Green',
            sku: 'SKU003',
            price: 200,
            quantity: 20,
            image: 'main.jpg',
          },
        ],
      };

      prismaMock.product.create.mockResolvedValue({ ...mockProduct, ...dto });

      await service.addProduct(dto);

      expect(prismaMock.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            brand: 'TestBrand',
            material: 'Cotton',
            weight: 0.5,
            warranty: '1 year',
            tags: ['new', 'hot'],
            is_featured: true,
          }),
        }),
      );
    });

    it('should create product with multiple variants', async () => {
      const dto: CreateProductDto = {
        name: 'Multi Variant Product',
        category: 'Clothing',
        measurement: 'M',
        description: 'Has multiple variants',
        variants: [
          {
            color: 'Red',
            sku: 'SKU-R',
            price: 100,
            quantity: 10,
            image: 'red.jpg',
          },
          {
            color: 'Blue',
            sku: 'SKU-B',
            price: 100,
            quantity: 15,
            image: 'blue.jpg',
          },
          {
            color: 'Green',
            sku: 'SKU-G',
            price: 110,
            quantity: 8,
            image: 'green.jpg',
          },
        ],
      };

      prismaMock.product.create.mockResolvedValue({
        ...mockProduct,
        variants: dto.variants,
      });

      await service.addProduct(dto);

      expect(prismaMock.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variants: {
              create: dto.variants,
            },
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated products with default pagination', async () => {
      prismaMock.product.findMany.mockResolvedValue([
        { ...mockProduct, reviews: [] },
      ]);
      prismaMock.product.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: expect.objectContaining({ is_active: true }),
        }),
      );
      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should calculate correct skip for pagination', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(0);

      await service.findAll({ page: 3, limit: 20 });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3-1) * 20
          take: 20,
        }),
      );
    });

    it('should filter by category', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10, category: 'Electronics' });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'Electronics' }),
        }),
      );
    });

    it('should filter by brand', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10, brand: 'Nike' });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ brand: 'Nike' }),
        }),
      );
    });

    it('should filter by is_featured', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10, is_featured: true });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_featured: true }),
        }),
      );
    });

    it('should search in name and description', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10, search: 'laptop' });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'laptop' } },
              { description: { contains: 'laptop' } },
            ],
          }),
        }),
      );
    });

    it('should calculate stars_evaluation as average of reviews', async () => {
      prismaMock.product.findMany.mockResolvedValue([mockProductWithReviews]);
      prismaMock.product.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      // Average of [5, 4, 3] = 4
      expect(result.data[0].stars_evaluation).toBe(4);
      expect(result.data[0].rating_count).toBe(3);
    });

    it('should return 0 stars_evaluation when no reviews', async () => {
      prismaMock.product.findMany.mockResolvedValue([
        { ...mockProduct, reviews: [] },
      ]);
      prismaMock.product.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data[0].stars_evaluation).toBe(0);
      expect(result.data[0].rating_count).toBe(0);
    });

    it('should order by updated_at desc', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updated_at: 'desc' },
        }),
      );
    });

    it('should include variants and reviews', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            variants: true,
            reviews: { select: { rating: true } },
          }),
        }),
      );
    });

    it('should use default values when page and limit not provided', async () => {
      prismaMock.product.findMany.mockResolvedValue([]);
      prismaMock.product.count.mockResolvedValue(0);

      await service.findAll({});

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return product by id with relations', async () => {
      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        views_count: 1,
      });

      const result = await service.findOne('uuid-1234-5678');

      expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-1234-5678', is_active: true },
        include: { variants: true, reviews: true, relatedProducts: true },
      });
      expect(result.id).toBe('uuid-1234-5678');
    });

    it('should throw NotFoundException when product not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(
        'Product not found',
      );
    });

    it('should increment views_count atomically', async () => {
      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        views_count: 1,
      });

      await service.findOne('uuid-1234-5678');

      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1234-5678' },
        data: { views_count: { increment: 1 } },
      });
    });

    it('should calculate stars_evaluation from reviews', async () => {
      prismaMock.product.findUnique.mockResolvedValue(mockProductWithReviews);
      prismaMock.product.update.mockResolvedValue(mockProductWithReviews);

      const result = await service.findOne('uuid-1234-5678');

      expect(result.stars_evaluation).toBe(4); // (5+4+3)/3 = 4
      expect(result.rating_count).toBe(3);
    });

    it('should return 0 stars when no reviews', async () => {
      prismaMock.product.findUnique.mockResolvedValue({
        ...mockProduct,
        reviews: [],
      });
      prismaMock.product.update.mockResolvedValue(mockProduct);

      const result = await service.findOne('uuid-1234-5678');

      expect(result.stars_evaluation).toBe(0);
      expect(result.rating_count).toBe(0);
    });

    it('should only return active products', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('inactive-product-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_active: true }),
        }),
      );
    });
  });

  describe('updateProduct', () => {
    it('should update product fields', async () => {
      const updateDto: UpdateProductDto = {
        name: 'Updated Product',
        description: 'Updated description',
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        ...updateDto,
      });

      const result = await service.updateProduct('uuid-1234-5678', updateDto);

      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1234-5678' },
        data: expect.objectContaining({
          name: 'Updated Product',
          description: 'Updated description',
        }),
        include: { variants: true },
      });
      expect(result.name).toBe('Updated Product');
    });

    it('should throw NotFoundException when product not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProduct('non-existent-uuid', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.product.update).not.toHaveBeenCalled();
    });

    it('should replace all variants when variants provided', async () => {
      const updateDto: UpdateProductDto = {
        variants: [
          {
            color: 'Green',
            sku: 'NEWSKU',
            price: 150,
            quantity: 5,
            image: 'new.jpg',
          },
        ],
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        variants: updateDto.variants,
      });

      await service.updateProduct('uuid-1234-5678', updateDto);

      expect(prismaMock.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variants: {
              deleteMany: {},
              create: updateDto.variants,
            },
          }),
        }),
      );
    });

    it('should not modify variants when not provided', async () => {
      const updateDto: UpdateProductDto = { name: 'New Name Only' };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        name: 'New Name Only',
      });

      await service.updateProduct('uuid-1234-5678', updateDto);

      expect(prismaMock.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            variants: expect.anything(),
          }),
        }),
      );
    });

    it('should handle partial update with single field', async () => {
      const updateDto: UpdateProductDto = { is_featured: true };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        is_featured: true,
      });

      const result = await service.updateProduct('uuid-1234-5678', updateDto);

      expect(result.is_featured).toBe(true);
    });

    it('should auto-update slug when name changes', async () => {
      const updateDto: UpdateProductDto = { name: 'New Product Name' };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        name: 'New Product Name',
        slug: 'new-product-name',
      });

      await service.updateProduct('uuid-1234-5678', updateDto);

      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1234-5678' },
        data: expect.objectContaining({
          name: 'New Product Name',
          slug: 'new-product-name',
        }),
        include: { variants: true },
      });
    });
  });

  describe('removeProduct', () => {
    it('should soft delete product by setting is_active to false', async () => {
      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.product.update.mockResolvedValue({
        ...mockProduct,
        is_active: false,
        variants: [],
      });

      const result = await service.removeProduct('uuid-1234-5678');

      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1234-5678' },
        data: { is_active: false },
        include: { variants: true },
      });
      expect(result.is_active).toBe(false);
    });

    it('should throw NotFoundException when product not found', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      await expect(service.removeProduct('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.product.update).not.toHaveBeenCalled();
    });

    it('should preserve product data when soft deleting', async () => {
      prismaMock.product.findUnique.mockResolvedValue(mockProductWithReviews);
      prismaMock.product.update.mockResolvedValue({
        ...mockProductWithReviews,
        is_active: false,
      });

      const result = await service.removeProduct('uuid-1234-5678');

      // Verify product still exists but is inactive
      expect(prismaMock.product.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1234-5678' },
        data: { is_active: false },
        include: { variants: true },
      });
      expect(result.id).toBe('uuid-1234-5678');
      expect(result.is_active).toBe(false);
    });
  });
});
