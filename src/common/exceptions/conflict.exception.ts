import { HttpStatus } from '@nestjs/common';
import { BaseException, ExceptionOptions } from './base.exception';

/**
 * Excepción personalizada para conflictos de recursos (409)
 *
 * Extiende BaseException añadiendo el status HTTP 409 automáticamente.
 * Se debe usar cuando existe un conflicto con el estado actual del recurso,
 * como duplicados o violaciones de unicidad.
 *
 * @example
 * // Lanzar excepción cuando el email ya está en uso
 * throw new ConflictException({
 *   errorCode: 'EMAIL_ALREADY_EXISTS',
 *   i18nKey: 'errors.user.emailAlreadyInUse',
 *   args: { email: dto.email }
 * });
 *
 * @example
 * // Lanzar excepción cuando ya existe un KYC enviado
 * throw new ConflictException({
 *   errorCode: 'KYC_ALREADY_SUBMITTED',
 *   i18nKey: 'errors.kyc.alreadySubmitted',
 *   defaultMessage: 'KYC verification already submitted'
 * });
 */
export class ConflictException extends BaseException {
  constructor(options: ExceptionOptions) {
    super(HttpStatus.CONFLICT, options);
  }
}
