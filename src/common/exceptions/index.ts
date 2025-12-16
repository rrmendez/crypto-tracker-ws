/**
 * Barrel export para todas las excepciones personalizadas
 *
 * Este archivo centraliza las exportaciones de todas las excepciones
 * personalizadas del sistema, permitiendo importarlas desde un solo lugar.
 *
 * @example
 * import { NotFoundException, BadRequestException } from '@/common/exceptions';
 */

export * from './base.exception';
export * from './not-found.exception';
export * from './bad-request.exception';
export * from './unauthorized.exception';
export * from './forbidden.exception';
export * from './conflict.exception';
export * from './internal-server-error.exception';
