import { HttpStatus } from '@nestjs/common';
import { BaseException, ExceptionOptions } from './base.exception';

/**
 * Excepción personalizada para recursos no encontrados (404)
 *
 * Extiende BaseException añadiendo el status HTTP 404 automáticamente.
 * Se debe usar cuando un recurso solicitado no existe en el sistema.
 *
 * @example
 * // Lanzar excepción cuando un usuario no se encuentra
 * throw new NotFoundException({
 *   errorCode: 'USER_NOT_FOUND',
 *   i18nKey: 'errors.user.notFound',
 *   args: { userId: id }
 * });
 *
 * @example
 * // Lanzar excepción cuando una wallet no se encuentra
 * throw new NotFoundException({
 *   errorCode: 'WALLET_NOT_FOUND',
 *   i18nKey: 'errors.wallet.notFound',
 *   defaultMessage: 'Wallet not found'
 * });
 */
export class NotFoundException extends BaseException {
  constructor(options: ExceptionOptions) {
    super(HttpStatus.NOT_FOUND, options);
  }
}
