import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from 'src/product/dto/query-product.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  /**
   * Create a new product
   * @param createProductDto - Product data including variants
   * @returns Created product with variants
   */
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.addProduct(createProductDto);
  }

  /**
   * Get all products with pagination and filters
   * @param query - Query parameters (page, limit, category, brand, is_featured, search)
   * @returns Paginated list of products
   */
  @Get()
  @Public()
  findAll(@Query() query: QueryProductDto) {
    return this.productService.findAll(query);
  }

  /**
   * Get a single product by ID
   * @param id - Product ID (UUID)
   * @returns Product details with variants and reviews
   */
  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.findOne(id);
  }

  /**
   * Update a product
   * @param id - Product ID (UUID)
   * @param updateProductDto - Data to update
   * @returns Updated product
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, updateProductDto);
  }

  /**
   * Soft delete a product (set is_active to false)
   * @param id - Product ID (UUID)
   * @returns Updated product with is_active = false
   */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.removeProduct(id);
  }

  /**
   * Cleanup expired sales (remove price_sale from variants when sale_end_date has passed)
   * @returns Cleanup result with count of cleaned products
   */
  @Post('cleanup-expired-sales')
  cleanupExpiredSales() {
    return this.productService.cleanupExpiredSales();
  }
}
