import Handlebars from 'handlebars';
import { EmailTemplateType } from '../dto/send-email.dto';

type TemplateDefinition = {
  defaultSubject: string;
  html: string;
};

type CompiledTemplate = {
  defaultSubject: string;
  render: (context: Record<string, any>) => string;
};

const templateSources: Record<EmailTemplateType, TemplateDefinition> = {
  [EmailTemplateType.ORDER_CONFIRMATION]: {
    defaultSubject: 'Your order has been received',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Thank you for your order, {{name}}{{#if name}}!{{/if}}</h2>
        <p>We have received your order <strong>{{orderNumber}}</strong>.</p>
        {{#if items}}
          <p>Items:</p>
          <ul>
            {{#each items}}
              <li>{{this.name}} - Qty: {{this.quantity}} - Price: {{this.price}}</li>
            {{/each}}
          </ul>
        {{/if}}
        <p>Total: <strong>{{total}}</strong></p>
        {{#if trackingLink}}
          <p>Track your order: <a href="{{trackingLink}}">{{trackingLink}}</a></p>
        {{/if}}
        <p>We will notify you when the order status updates.</p>
      </div>
    `,
  },
  [EmailTemplateType.ORDER_STATUS_UPDATE]: {
    defaultSubject: 'Your order status has been updated',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Order Update for {{orderNumber}}</h2>
        <p>Status: <strong>{{status}}</strong></p>
        {{#if notes}}
          <p>Notes: {{notes}}</p>
        {{/if}}
        {{#if trackingLink}}
          <p>Track your order: <a href="{{trackingLink}}">{{trackingLink}}</a></p>
        {{/if}}
      </div>
    `,
  },
  [EmailTemplateType.PASSWORD_RESET]: {
    defaultSubject: 'Password reset instructions',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hello {{name}}{{#if name}}!{{/if}}</h2>
        <p>We received a request to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="{{resetLink}}">{{resetLink}}</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  },
  [EmailTemplateType.WELCOME]: {
    defaultSubject: 'Welcome to Elegant Shop',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Welcome, {{name}}{{#if name}}!{{/if}}</h2>
        <p>We are excited to have you on board.</p>
        <p>Explore our latest products and promotions.</p>
      </div>
    `,
  },
  [EmailTemplateType.REVIEW_NOTIFICATION]: {
    defaultSubject: 'New review received',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>New review for {{productName}}</h2>
        <p>Rating: {{rating}}/5</p>
        <p>Comment: {{comment}}</p>
        {{#if link}}
          <p>View review: <a href="{{link}}">{{link}}</a></p>
        {{/if}}
      </div>
    `,
  },
  [EmailTemplateType.PROMOTION]: {
    defaultSubject: 'Exclusive promotion for you',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hi {{name}}{{#if name}}!{{/if}}</h2>
        <p>{{message}}</p>
        {{#if ctaLink}}
          <p><a href="{{ctaLink}}">{{ctaText}}</a></p>
        {{/if}}
      </div>
    `,
  },
};

const compiledTemplates: Record<EmailTemplateType, CompiledTemplate> = Object.entries(
  templateSources,
).reduce((acc, [key, value]) => {
  acc[key as EmailTemplateType] = {
    defaultSubject: value.defaultSubject,
    render: (context: Record<string, any>) =>
      Handlebars.compile(value.html, { noEscape: true })(context ?? {}),
  };
  return acc;
}, {} as Record<EmailTemplateType, CompiledTemplate>);

export const getEmailTemplate = (template: EmailTemplateType): CompiledTemplate =>
  compiledTemplates[template];
