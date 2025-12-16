/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { validateBr } from 'js-brasil';
import { CountryEnum } from '@/common/enums/country-enum';

export function IsBrazilianDocument(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBrazilianDocument',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;

          // Si no hay address o country, no validar
          const country = obj.address?.country;
          if (country !== CountryEnum.BR) return true;

          return (
            typeof value === 'string' &&
            (validateBr.cnpj(value) || validateBr.cpf(value))
          );
        },
        defaultMessage() {
          return 'Documento inválido';
        },
      },
    });
  };
}
