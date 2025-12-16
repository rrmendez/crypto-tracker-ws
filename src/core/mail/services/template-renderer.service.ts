import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateRendererService {
  private readonly templatesDir = path.join(
    process.cwd(),
    'src/core/mail/templates',
  );
  private readonly distTemplatesDir = path.join(
    process.cwd(),
    'dist/core/mail/templates',
  );

  render(
    templateName: string,
    context: Record<string, any>,
    lang: string = 'pt',
  ): string {
    const filePath = this.resolveTemplatePath(templateName, lang);

    // Registrar partials dinámicamente
    const headerPath = this.resolveTemplatePath('partials/header', lang);
    Handlebars.registerPartial('header', fs.readFileSync(headerPath, 'utf8'));

    const footerPath = this.resolveTemplatePath('partials/footer', lang);
    Handlebars.registerPartial('footer', fs.readFileSync(footerPath, 'utf8'));

    const templateSource = fs.readFileSync(filePath, 'utf8');
    const template = Handlebars.compile(templateSource);

    return template(context);
  }

  private resolveTemplatePath(templateName: string, lang: string): string {
    const distPath = path.join(
      this.distTemplatesDir,
      lang,
      `${templateName}.hbs`,
    );
    const srcPath = path.join(this.templatesDir, lang, `${templateName}.hbs`);

    if (fs.existsSync(distPath)) {
      return distPath;
    }
    if (fs.existsSync(srcPath)) {
      return srcPath;
    }

    throw new Error(`Template ${templateName} not found in dist or src`);
  }
}
