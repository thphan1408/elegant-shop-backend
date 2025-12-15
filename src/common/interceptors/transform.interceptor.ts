import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { map, Observable } from 'rxjs';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: T & { message?: string }) => {
        const response = context.switchToHttp().getResponse<ExpressResponse>();
        const message = (data as { message?: string })?.message || 'Success';
        return {
          statusCode: response.statusCode,
          message,
          data: data as T,
        };
      }),
    );
  }
}
