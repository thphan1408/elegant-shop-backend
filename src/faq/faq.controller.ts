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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FAQService } from './faq.service';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';
import { QueryFAQDto } from './dto/query-faq.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Public } from 'src/auth/decorators/public.decorator';

@ApiTags('FAQs')
@Controller('faqs')
export class FAQController {
  constructor(
    private readonly faqService: FAQService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Create a new FAQ
   * @param createFAQDto - FAQ data
   * @returns Created FAQ
   */
  @Post()
  @ApiOperation({ summary: 'Create a new FAQ' })
  @ApiResponse({ status: 201, description: 'FAQ created successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  create(@Body() createFAQDto: CreateFAQDto) {
    return this.faqService.create(createFAQDto);
  }

  /**
   * Get all FAQs with pagination and filters
   * @param query - Query parameters (page, limit, category, productId, is_active)
   * @returns Paginated list of FAQs
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all FAQs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of FAQs' })
  findAll(@Query() query: QueryFAQDto) {
    return this.faqService.findAll(query);
  }

  /**
   * Get a single FAQ by ID
   * @param id - FAQ ID (UUID)
   * @returns FAQ details
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single FAQ by ID' })
  @ApiResponse({ status: 200, description: 'FAQ details' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.faqService.findOne(id);
  }

  /**
   * Update a FAQ
   * @param id - FAQ ID (UUID)
   * @param updateFAQDto - Data to update
   * @returns Updated FAQ
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a FAQ' })
  @ApiResponse({ status: 200, description: 'FAQ updated successfully' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFAQDto: UpdateFAQDto,
  ) {
    return this.faqService.update(id, updateFAQDto);
  }

  /**
   * Delete a FAQ
   * @param id - FAQ ID (UUID)
   * @returns Success message
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a FAQ' })
  @ApiResponse({ status: 200, description: 'FAQ deleted successfully' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.faqService.remove(id);
  }

  // ========== Product-specific FAQ Endpoints ==========

  /**
   * Get FAQs for a specific product
   * @param productId - Product ID (UUID)
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of FAQs for the product
   */
  @Get('products/:productId')
  @Public()
  @ApiOperation({
    summary: 'Get FAQs for a specific product',
    description: 'Get all FAQs associated with a specific product',
  })
  @ApiResponse({ status: 200, description: 'List of FAQs for the product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getProductFAQs(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: QueryFAQDto,
  ) {
    return this.faqService.findByProduct(productId, query);
  }

  // ========== File Upload Endpoints ==========

  /**
   * Upload image to Cloudinary
   * @param file - Image file (Multer file object)
   * @returns Cloudinary upload result with URL
   * @throws BadRequestException if file is invalid or too large
   */
  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload image to Cloudinary',
    description:
      'Upload an image file to Cloudinary. Returns Cloudinary URL that can be used in FAQ images array.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://res.cloudinary.com/...' },
        public_id: { type: 'string', example: 'faqs/images/1234567890-abc123' },
        secure_url: {
          type: 'string',
          example: 'https://res.cloudinary.com/...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: jpg, jpeg, png, gif, webp',
      );
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    try {
      const result = await this.cloudinaryService.uploadImage(file);
      return {
        url: result.secure_url,
        public_id: result.public_id,
        secure_url: result.secure_url,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload image: ${error.message}`,
      );
    }
  }

  /**
   * Upload file to Cloudinary
   * @param file - File (PDF, DOC, etc.) (Multer file object)
   * @returns Cloudinary upload result with URL
   * @throws BadRequestException if file is invalid or too large
   */
  @Post('upload/file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload file to Cloudinary',
    description:
      'Upload a file (PDF, DOC, etc.) to Cloudinary. Returns Cloudinary URL that can be used in FAQ attachments array.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://res.cloudinary.com/...' },
        public_id: { type: 'string', example: 'faqs/files/1234567890-abc123' },
        secure_url: {
          type: 'string',
          example: 'https://res.cloudinary.com/...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: pdf, doc, docx, txt',
      );
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    try {
      const result = await this.cloudinaryService.uploadFile(file);
      return {
        url: result.secure_url,
        public_id: result.public_id,
        secure_url: result.secure_url,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`      );
    }
  }

  /**
   * Delete file from Cloudinary
   * @param publicId - Cloudinary public_id
   * @returns Deletion result
   * @throws BadRequestException if deletion fails
   */
  @Delete('upload/:publicId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete file from Cloudinary',
    description:
      'Delete a file/image from Cloudinary using its public_id. This is optional for cleanup.',
  })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 400, description: 'Failed to delete file' })
  async deleteFile(@Param('publicId') publicId: string) {
    try {
      const result = await this.cloudinaryService.deleteFile(publicId);
      return {
        message: 'File deleted successfully',
        result: result.result,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }
}

