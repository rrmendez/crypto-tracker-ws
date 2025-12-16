import { HttpException, HttpStatus } from '@nestjs/common';
import { I18nPath } from '@/generated/i18n.generated';

/**
 * Interface para opciones de excepciones personalizadas
 */
export interface ExceptionOptions {
  /**
   * Código de error único para identificar el tipo de error en el frontend
   * Ejemplo: 'USER_NOT_FOUND', 'WALLET_INSUFFICIENT_BALANCE'
   */
  errorCode: string;

  /**
   * Clave de traducción i18n para el mensaje de error
   * Ejemplo: 'errors.user.notFound'
   */
  i18nKey: I18nPath;

  /**
   * Argumentos opcionales para interpolar en la traducción
   * Ejemplo: { username: 'john_doe' } para "User {username} not found"
   */
  args?: Record<string, any>;

  /**
   * Mensaje de error por defecto en caso de que falle la traducción
   * Se recomienda que sea en inglés como fallback
   */
  defaultMessage?: string;
}

/**
 * Clase base para todas las excepciones personalizadas del sistema
 *
 * Esta clase extiende HttpException de NestJS y añade:
 * - errorCode: Código único para identificar el error en el frontend
 * - i18nKey: Clave para traducir el mensaje según el idioma del request
 * - args: Argumentos para interpolación de mensajes
 *
 * @example
 * throw new BaseException(
 *   HttpStatus.NOT_FOUND,
 *   {
 *     errorCode: 'USER_NOT_FOUND',
 *     i18nKey: 'errors.user.notFound',
 *     args: { userId: '123' }
 *   }
 * );
 */
export class BaseException extends HttpException {
  public readonly errorCode: string;
  public readonly i18nKey: I18nPath;
  public readonly args?: Record<string, any>;

  constructor(status: HttpStatus, options: ExceptionOptions) {
    super(
      {
        errorCode: options.errorCode,
        i18nKey: options.i18nKey,
        args: options.args,
        message: options.defaultMessage || options.i18nKey,
      },
      status,
    );

    this.errorCode = options.errorCode;
    this.i18nKey = options.i18nKey;
    this.args = options.args;
  }
}
