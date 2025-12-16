/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsUnlimitedOrPositive(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isUnlimitedOrPositive',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'number') return false;
          return value === -1 || value >= 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} debe ser -1 (ilimitado) o mayor o igual que 0`;
        },
      },
    });
  };
}
