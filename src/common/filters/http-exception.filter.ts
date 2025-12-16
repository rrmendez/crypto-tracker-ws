import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { I18nContext } from 'nestjs-i18n';
import { I18nTranslations, I18nPath } from '@/generated/i18n.generated';
import { BaseException } from '../exceptions/base.exception';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';

/**
 * Interface para la estructura de respuesta de error
 */
interface ErrorResponse {
  /**
   * Código de estado HTTP
   */
  statusCode: number;

  /**
   * Código de error único para identificación en el frontend
   */
  errorCode: string;

  /**
   * Mensaje de error traducido según el idioma del request
   */
  message: string;

  /**
   * Timestamp de cuando ocurrió el error
   */
  timestamp: string;

  /**
   * Path del endpoint donde ocurrió el error
   */
  path: string;

  /**
   * Detalles adicionales del error (opcional, solo en desarrollo)
   */
  details?: any;
}

/**
 * Filtro global de excepciones HTTP con soporte para i18n
 *
 * Este filtro captura todas las excepciones HTTP del sistema y:
 * 1. Traduce los mensajes según el idioma del request (Accept-Language header)
 * 2. Formatea las respuestas en una estructura consistente
 * 3. Incluye códigos de error únicos para identificación en el frontend
 * 4. Registra errores para debugging
 *
 * Se aplica automáticamente a todas las rutas cuando se registra como filtro global.
 *
 * @example
 * // En main.ts
 * app.useGlobalFilters(new HttpExceptionFilter());
 *
 * Ejemplo de respuesta generada:
 * {
 *   "statusCode": 404,
 *   "errorCode": "USER_NOT_FOUND",
 *   "message": "Usuario no encontrado",
 *   "timestamp": "2024-01-15T10:30:00.000Z",
 *   "path": "/api/users/123"
 * }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly configService: ConfigService;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.configService = configService;
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const i18n = I18nContext.current<I18nTranslations>(host);

    // Obtener el objeto de respuesta de la excepción
    const exceptionResponse = exception.getResponse();

    let errorCode: string;
    let message: string;
    let i18nKey: I18nPath | undefined;
    let args: Record<string, any> | undefined;

    // Verificar si es nuestra excepción personalizada (BaseException)
    if (exception instanceof BaseException) {
      errorCode = exception.errorCode;
      i18nKey = exception.i18nKey;
      args = exception.args;

      // Traducir el mensaje usando i18n
      if (i18n && i18nKey) {
        message = i18n.t(i18nKey, { args });
      } else {
        // Fallback si i18n no está disponible
        message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message || 'An error occurred';
      }
    } else {
      // Manejar excepciones HTTP estándar de NestJS (sin nuestro formato)
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;

        // Si la excepción tiene un array de mensajes (validaciones)
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
        } else {
          message = responseObj.message || exception.message;
        }

        // Generar un errorCode basado en el status HTTP si no tiene uno
        errorCode = responseObj.errorCode || status.toString();
      } else {
        message = exceptionResponse;
        errorCode = status.toString();
      }
    }

    // Construir la respuesta estandarizada
    const errorResponse: ErrorResponse = {
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // En desarrollo, incluir detalles adicionales para debugging
    if (this.configService.get<string>('ENV') === 'development') {
      errorResponse.details = {
        stack: exception.stack,
        originalMessage: exception.message,
        ...(args && { args }),
        ...(i18nKey && { i18nKey }),
      };
    }

    // Log del error
    this.logger.error(
      `[${errorCode}] ${message} - ${request.method} ${request.url}`,
      exception.stack,
    );

    // Enviar la respuesta
    response.status(status).json(errorResponse);
  }
}
