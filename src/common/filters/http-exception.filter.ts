import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationError,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const isProd = process.env.NODE_ENV === 'production';

    // Get validation errors if available
    const exceptionResponse = exception.getResponse();
    let message = exception.message || 'Internal server error';
    let errors: any = null;

    if (
      status === HttpStatus.BAD_REQUEST &&
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const responseObj = exceptionResponse as any;
      if (Array.isArray(responseObj.message)) {
        // Validation errors
        errors = responseObj.message;
        message = 'Validation failed';
      } else if (responseObj.message) {
        message = responseObj.message;
      }
    }

    this.logger.error(
      `HTTP Error: ${status} - ${request.method} ${request.url}`,
      exception.stack,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(errors && { errors }), // Include validation errors
      ...(isProd ? {} : { stack: exception.stack }), // Hide stack in production
    });
  }
}
