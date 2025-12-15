import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import DailyRotateFile from 'winston-daily-rotate-file';
const isProduction = process.env.NODE_ENV === 'production';

export const winstonConfig = {
  level: isProduction ? 'info' : 'debug',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike('3elegant.', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),

    ...(isProduction
      ? [
          new DailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'DD-MM-YYYY',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'info',
          }),
          new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'DD-MM-YYYY',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
            level: 'error',
          }),
        ]
      : []),
  ],
};
