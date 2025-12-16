/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { RoleEnum } from '@/common/enums/role.enum';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * Valida que un array de roles no contenga ciertos roles prohibidos.
 * Ejemplo:
 *   @NoForbiddenRoles([RoleEnum.USER, RoleEnum.MERCHANT])
 */
export function NoForbiddenRoles(
  forbiddenRoles: RoleEnum[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'noForbiddenRoles',
      target: object.constructor,
      propertyName,
      constraints: [forbiddenRoles],
      options: {
        ...validationOptions,
        message:
          validationOptions?.message ??
          i18nValidationMessage('validations.noForbiddenRoles', {
            args: { roles: forbiddenRoles.join(', ') },
          }),
      },
      validator: {
        validate(value: any[], args: ValidationArguments) {
          if (!Array.isArray(value)) return false;
          const [forbidden] = args.constraints;
          return !value.some((role) => forbidden.includes(role));
        },
        defaultMessage(args: ValidationArguments) {
          const [forbidden] = args.constraints;
          return `roles cannot contain: ${forbidden.join(', ')}`;
        },
      },
    });
  };
}
