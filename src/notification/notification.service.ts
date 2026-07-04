import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailTemplateType, SendEmailDto } from './dto/send-email.dto';
import { getEmailTemplate } from './templates/email-templates';
import { Prisma, UserRole, EmailStatus, type User } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Send an email using predefined templates.
   * Only ADMIN or MODERATOR can trigger manual send.
   */
  async sendEmail(dto: SendEmailDto, currentUser?: User) {
    if (
      currentUser &&
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.MODERATOR
    ) {
      throw new ForbiddenException(
        'Only admin or moderator can send notification emails',
      );
    }

    const template = getEmailTemplate(dto.template);

    if (!template) {
      throw new BadRequestException('Unsupported email template');
    }

    const subject = dto.subject || template.defaultSubject;
    const context = dto.context || {};

    const html = template.render({
      name: dto.name,
      ...context,
    });

    try {
      await this.mailerService.sendMail({
        to: dto.to,
        subject,
        html,
      });

      await this.prismaService.emailLog.create({
        data: {
          to: dto.to,
          subject,
          template: dto.template,
          context,
          status: EmailStatus.SUCCESS,
        },
      });

      return { message: 'Email sent successfully', template: dto.template };
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${dto.to}: ${error.message}`,
        (error as Error).stack,
      );

      try {
        await this.prismaService.emailLog.create({
          data: {
            to: dto.to,
            subject,
            template: dto.template,
            context,
          status: EmailStatus.FAILED,
            error: error.message,
          },
        });
      } catch (logError) {
        this.logger.error(
          `Failed to log email error: ${logError.message}`,
          (logError as Error).stack,
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Email already queued. Please try again later.',
        );
      }

      throw new BadRequestException('Failed to send email');
    }
  }
}
