import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /**
   * Get hello message
   * @returns Hello world string
   */
  getHello(): string {
    return 'Hello World!';
  }
}
