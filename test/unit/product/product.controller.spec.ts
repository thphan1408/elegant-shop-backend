import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from 'src/product/product.controller';
import { ProductService } from 'src/product/product.service';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { UpdateProductDto } from 'src/product/dto/update-product.dto';
import { QueryProductDto } from 'src/product/dto/query-product.dto';
import { NotFoundException } from '@nestjs/common';

describe('ProductController', () => {
  let controller: ProductController;
  let serviceMock: jest.Mocked<ProductService>;

  // Mock data
  const mockProduct = {
    id: 'uuid-1234-5678',
    name: 'Test Product',
    slug: 'test-product',
    category: 'Electronics',
    measurement: '10x20 cm',
    description: 'Test description',
    stars_evaluation: 4.5,
    rating_count: 10,
    is_active: true,
    is_featured: false,
    views_count: 100,
    created_at: new Date(),
    updated_at: new Date(),
    variants: [
      {
        id: 'variant-uuid',
        color: 'Red',
        sku: 'SKU001',
        price: 100,
        quantity: 10,
        image: 'image.jpg',
      },
    ],
  };

  const mockPaginatedResponse = {
    data: [mockProduct],
    total: 1,
    page: 1,
    limit: 10,
  };

  beforeEach(async () => {
    serviceMock = {
      addProduct: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateProduct: jest.fn(),
      removeProduct: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [{ provide: ProductService, useValue: serviceMock }],
    }).compile();

    controller = module.get<ProductController>(ProductController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product and return it', async () => {
      const createDto: CreateProductDto = {
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

      serviceMock.addProduct.mockResolvedValue(mockProduct as any);

      const result = await controller.create(createDto);

      expect(serviceMock.addProduct).toHaveBeenCalledWith(createDto);
      expect(serviceMock.addProduct).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProduct);
    });

    it('should pass all DTO fields to service', async () => {
      const createDto: CreateProductDto = {
        name: 'Full Product',
        category: 'Fashion',
        measurement: 'L',
        description: 'Full description',
        brand: 'TestBrand',
        material: 'Cotton',
        weight: 0.5,
        warranty: '1 year',
        tags: ['new', 'hot'],
        images: ['img1.jpg', 'img2.jpg'],
        meta_title: 'SEO Title',
        meta_description: 'SEO Description',
        is_featured: true,
        is_active: true,
        variants: [
          {
            color: 'Blue',
            colorHex: '#0000FF',
            sku: 'SKU002',
            price: 200,
            price_sale: 150,
            quantity: 20,
            image: 'main.jpg',
            images: ['gallery1.jpg'],
            size: 'M',
            material: 'Silk',
          },
        ],
      };

      serviceMock.addProduct.mockResolvedValue({
        ...mockProduct,
        ...createDto,
      } as any);

      await controller.create(createDto);

      expect(serviceMock.addProduct).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all products with default pagination', async () => {
      const query: QueryProductDto = { page: 1, limit: 10 };
      serviceMock.findAll.mockResolvedValue(mockPaginatedResponse as any);

      const result = await controller.findAll(query);

      expect(serviceMock.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should pass category filter to service', async () => {
      const query: QueryProductDto = {
        page: 1,
        limit: 10,
        category: 'Electronics',
      };
      serviceMock.findAll.mockResolvedValue(mockPaginatedResponse as any);

      await controller.findAll(query);

      expect(serviceMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Electronics' }),
      );
    });

    it('should pass brand filter to service', async () => {
      const query: QueryProductDto = { page: 1, limit: 10, brand: 'TestBrand' };
      serviceMock.findAll.mockResolvedValue(mockPaginatedResponse as any);

      await controller.findAll(query);

      expect(serviceMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ brand: 'TestBrand' }),
      );
    });

    it('should pass search query to service', async () => {
      const query: QueryProductDto = { page: 1, limit: 10, search: 'laptop' };
      serviceMock.findAll.mockResolvedValue(mockPaginatedResponse as any);

      await controller.findAll(query);

      expect(serviceMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'laptop' }),
      );
    });

    it('should pass is_featured filter to service', async () => {
      const query: QueryProductDto = { page: 1, limit: 10, is_featured: true };
      serviceMock.findAll.mockResolvedValue(mockPaginatedResponse as any);

      await controller.findAll(query);

      expect(serviceMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ is_featured: true }),
      );
    });

    it('should handle custom pagination', async () => {
      const query: QueryProductDto = { page: 3, limit: 25 };
      serviceMock.findAll.mockResolvedValue({
        ...mockPaginatedResponse,
        page: 3,
        limit: 25,
      } as any);

      const result = await controller.findAll(query);

      expect(serviceMock.findAll).toHaveBeenCalledWith({ page: 3, limit: 25 });
      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
    });

    it('should return empty array when no products', async () => {
      const query: QueryProductDto = { page: 1, limit: 10 };
      serviceMock.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      } as any);

      const result = await controller.findAll(query);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      const productId = 'uuid-1234-5678';
      serviceMock.findOne.mockResolvedValue(mockProduct as any);

      const result = await controller.findOne(productId);

      expect(serviceMock.findOne).toHaveBeenCalledWith(productId);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      const productId = 'non-existent-uuid';
      serviceMock.findOne.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(controller.findOne(productId)).rejects.toThrow(
        NotFoundException,
      );
      expect(serviceMock.findOne).toHaveBeenCalledWith(productId);
    });
  });

  describe('update', () => {
    it('should update product and return updated data', async () => {
      const productId = 'uuid-1234-5678';
      const updateDto: UpdateProductDto = {
        name: 'Updated Product',
        description: 'Updated description',
      };
      const updatedProduct = { ...mockProduct, ...updateDto };
      serviceMock.updateProduct.mockResolvedValue(updatedProduct as any);

      const result = await controller.update(productId, updateDto);

      expect(serviceMock.updateProduct).toHaveBeenCalledWith(
        productId,
        updateDto,
      );
      expect(result.name).toBe('Updated Product');
    });

    it('should update product with new variants', async () => {
      const productId = 'uuid-1234-5678';
      const updateDto: UpdateProductDto = {
        variants: [
          {
            color: 'Green',
            sku: 'NEWSKU',
            price: 150,
            quantity: 5,
            image: 'new-image.jpg',
          },
        ],
      };
      serviceMock.updateProduct.mockResolvedValue({
        ...mockProduct,
        variants: updateDto.variants,
      } as any);

      const result = await controller.update(productId, updateDto);

      expect(serviceMock.updateProduct).toHaveBeenCalledWith(
        productId,
        updateDto,
      );
      expect(result.variants).toEqual(updateDto.variants);
    });

    it('should throw NotFoundException when updating non-existent product', async () => {
      const productId = 'non-existent-uuid';
      const updateDto: UpdateProductDto = { name: 'New Name' };
      serviceMock.updateProduct.mockRejectedValue(
        new NotFoundException(`Product with id ${productId} not found`),
      );

      await expect(controller.update(productId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle partial update (only some fields)', async () => {
      const productId = 'uuid-1234-5678';
      const updateDto: UpdateProductDto = { is_featured: true };
      serviceMock.updateProduct.mockResolvedValue({
        ...mockProduct,
        is_featured: true,
      } as any);

      const result = await controller.update(productId, updateDto);

      expect(serviceMock.updateProduct).toHaveBeenCalledWith(productId, {
        is_featured: true,
      });
      expect(result.is_featured).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete product and return deleted data', async () => {
      const productId = 'uuid-1234-5678';
      serviceMock.removeProduct.mockResolvedValue(mockProduct as any);

      const result = await controller.remove(productId);

      expect(serviceMock.removeProduct).toHaveBeenCalledWith(productId);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when deleting non-existent product', async () => {
      const productId = 'non-existent-uuid';
      serviceMock.removeProduct.mockRejectedValue(
        new NotFoundException(`Product with id ${productId} not found`),
      );

      await expect(controller.remove(productId)).rejects.toThrow(
        NotFoundException,
      );
      expect(serviceMock.removeProduct).toHaveBeenCalledWith(productId);
    });
  });
});
