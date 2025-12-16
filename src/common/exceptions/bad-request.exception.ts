import { HttpStatus } from '@nestjs/common';
import { BaseException, ExceptionOptions } from './base.exception';

/**
 * Excepción personalizada para solicitudes mal formadas o inválidas (400)
 *
 * Extiende BaseException añadiendo el status HTTP 400 automáticamente.
 * Se debe usar cuando los datos de entrada son inválidos o no cumplen
 * con las reglas de negocio.
 *
 * @example
 * // Lanzar excepción cuando una operación tiene monto inválido
 * throw new BadRequestException({
 *   errorCode: 'INVALID_AMOUNT',
 *   i18nKey: 'errors.transaction.invalidAmount',
 *   args: { amount: amount, minimum: minimumAmount }
 * });
 *
 * @example
 * // Lanzar excepción cuando el usuario no está verificado
 * throw new BadRequestException({
 *   errorCode: 'USER_NOT_VERIFIED',
 *   i18nKey: 'errors.user.notVerified',
 *   defaultMessage: 'User must be verified to perform this action'
 * });
 */
export class BadRequestException extends BaseException {
  constructor(options: ExceptionOptions) {
    super(HttpStatus.BAD_REQUEST, options);
  }
}
