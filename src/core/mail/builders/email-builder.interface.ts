import { TemplateRendererService } from '../services/template-renderer.service';

export interface BaseEmailConfig {
  to: string;
  code: string;
}

export interface EmailBuilder<
  TConfig extends BaseEmailConfig = BaseEmailConfig,
> {
  setRecipient(to: string): this;
  setSubject(subject: string): this;
  setText(text: string): this;
  setHtml(html: string): this;
  build(config: TConfig): EmailContent;
  reset(): this;
}

export interface EmailContent {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export abstract class BaseEmailBuilder<
  TConfig extends BaseEmailConfig = BaseEmailConfig,
> implements EmailBuilder<TConfig>
{
  protected emailContent: Partial<EmailContent> = {};

  constructor(protected readonly renderer: TemplateRendererService) {}

  setRecipient(to: string): this {
    this.emailContent.to = to;
    return this;
  }

  setSubject(subject: string): this {
    this.emailContent.subject = subject;
    return this;
  }

  setText(text: string): this {
    this.emailContent.text = text;
    return this;
  }

  setHtml(html: string): this {
    this.emailContent.html = html;
    return this;
  }

  reset(): this {
    this.emailContent = {};
    return this;
  }

  protected render(
    template: string,
    variables: Record<string, any>,
    lang?: string,
  ) {
    return this.renderer.render(template, variables, lang);
  }

  abstract build(config: TConfig): EmailContent;
}
