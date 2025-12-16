import { HttpStatus } from '@nestjs/common';
import { BaseException, ExceptionOptions } from './base.exception';

/**
 * Excepción personalizada para errores internos del servidor (500)
 *
 * Extiende BaseException añadiendo el status HTTP 500 automáticamente.
 * Se debe usar cuando ocurre un error inesperado en el servidor que
 * no puede ser manejado por el código de negocio.
 *
 * @example
 * // Lanzar excepción cuando falla una operación crítica
 * throw new InternalServerErrorException({
 *   errorCode: 'DATABASE_ERROR',
 *   i18nKey: 'errors.server.databaseError',
 *   defaultMessage: 'An unexpected database error occurred'
 * });
 *
 * @example
 * // Lanzar excepción cuando falla una integración externa
 * throw new InternalServerErrorException({
 *   errorCode: 'EXTERNAL_SERVICE_ERROR',
 *   i18nKey: 'errors.server.externalServiceError',
 *   args: { service: 'PaymentGateway' }
 * });
 */
export class InternalServerErrorException extends BaseException {
  constructor(options: ExceptionOptions) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, options);
  }
}
