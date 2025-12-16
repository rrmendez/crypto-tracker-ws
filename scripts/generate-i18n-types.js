const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '../src/generated/i18n.generated.ts');

if (fs.existsSync(outputPath)) {
  console.log('✅ i18n.generated.ts ya existe, no se regenera');
  process.exit(0);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const content = `
// Archivo temporal autogenerado para evitar errores de compilación.
// Será reemplazado por nestjs-i18n cuando la app se ejecute.

export type I18nTranslations = Record<string, any>;
export type I18nPath = string;
`;

fs.writeFileSync(outputPath, content);
console.log('📝 Archivo temporal i18n.generated.ts creado');
