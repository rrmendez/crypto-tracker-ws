import { HttpStatus } from '@nestjs/common';
import { BaseException, ExceptionOptions } from './base.exception';

/**
 * Excepción personalizada para errores de autenticación (401)
 *
 * Extiende BaseException añadiendo el status HTTP 401 automáticamente.
 * Se debe usar cuando el usuario no está autenticado o las credenciales
 * son inválidas.
 *
 * @example
 * // Lanzar excepción cuando el token es inválido
 * throw new UnauthorizedException({
 *   errorCode: 'INVALID_TOKEN',
 *   i18nKey: 'errors.auth.invalidToken',
 *   defaultMessage: 'Invalid authentication token'
 * });
 *
 * @example
 * // Lanzar excepción cuando las credenciales son incorrectas
 * throw new UnauthorizedException({
 *   errorCode: 'INVALID_CREDENTIALS',
 *   i18nKey: 'errors.user.invalidCredentials',
 *   args: { email: user.email }
 * });
 */
export class UnauthorizedException extends BaseException {
  constructor(options: ExceptionOptions) {
    super(HttpStatus.UNAUTHORIZED, options);
  }
}
