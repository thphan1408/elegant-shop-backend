import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload image to Cloudinary
   * @param file Express.Multer.File
   * @returns Promise with Cloudinary upload result
   */
  async uploadImage(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const uuid = this.generateUUID();
      const publicId = `faqs/images/${timestamp}-${uuid}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'faqs/images',
          public_id: `${timestamp}-${uuid}`,
          overwrite: false,
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          max_file_size: 5 * 1024 * 1024, // 5MB
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as UploadApiResponse);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload file to Cloudinary
   * @param file Express.Multer.File
   * @returns Promise with Cloudinary upload result
   */
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const uuid = this.generateUUID();

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'faqs/files',
          public_id: `${timestamp}-${uuid}`,
          overwrite: false,
          allowed_formats: ['pdf', 'doc', 'docx', 'txt'],
          max_file_size: 10 * 1024 * 1024, // 10MB
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as UploadApiResponse);
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Delete file from Cloudinary
   * @param publicId Cloudinary public_id
   * @returns Promise with deletion result
   */
  async deleteFile(publicId: string): Promise<any> {
    try {
      // Try to delete as image first
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });

      // If not found as image, try as raw file
      if (result.result === 'not found') {
        return await cloudinary.uploader.destroy(publicId, {
          resource_type: 'raw',
        });
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate a simple UUID
   * @returns UUID string
   */
  private generateUUID(): string {
    return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
