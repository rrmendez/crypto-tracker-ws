import { HttpStatus } from '@nestjs/common';
import { BaseException, ExceptionOptions } from './base.exception';

/**
 * Excepción personalizada para acceso prohibido (403)
 *
 * Extiende BaseException añadiendo el status HTTP 403 automáticamente.
 * Se debe usar cuando el usuario está autenticado pero no tiene permisos
 * suficientes para realizar la acción solicitada.
 *
 * @example
 * // Lanzar excepción cuando el usuario no tiene el rol requerido
 * throw new ForbiddenException({
 *   errorCode: 'INSUFFICIENT_PERMISSIONS',
 *   i18nKey: 'errors.auth.insufficientPermissions',
 *   args: { requiredRole: 'ADMIN', userRole: 'USER' }
 * });
 *
 * @example
 * // Lanzar excepción cuando se intenta acceder a recurso de otro usuario
 * throw new ForbiddenException({
 *   errorCode: 'RESOURCE_ACCESS_DENIED',
 *   i18nKey: 'errors.auth.resourceAccessDenied',
 *   defaultMessage: 'You do not have access to this resource'
 * });
 */
export class ForbiddenException extends BaseException {
  constructor(options: ExceptionOptions) {
    super(HttpStatus.FORBIDDEN, options);
  }
}
