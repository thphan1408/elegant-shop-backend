import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export enum EmailTemplateType {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  WELCOME = 'WELCOME',
  REVIEW_NOTIFICATION = 'REVIEW_NOTIFICATION',
  PROMOTION = 'PROMOTION',
}

export class SendEmailDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  to: string;

  @ApiProperty({
    required: false,
    description: 'Optional recipient name for template rendering',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    enum: EmailTemplateType,
    description: 'Predefined email template to use',
  })
  @IsEnum(EmailTemplateType)
  template: EmailTemplateType;

  @ApiProperty({
    required: false,
    description: 'Override email subject if needed',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    required: false,
    description: 'Template context variables',
    example: { orderNumber: 'ORD-20250120-001', link: 'https://...' },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}
