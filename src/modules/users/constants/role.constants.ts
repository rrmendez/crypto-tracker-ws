import { RoleEnum } from '@/common/enums/role.enum';

/**
 * Roles de administrador que pueden ser asignados a usuarios
 * Excluye roles de usuario normal y comerciante
 */
export const ADMIN_ROLES = Object.values(RoleEnum).filter(
  (role) => ![RoleEnum.USER, RoleEnum.MERCHANT].includes(role),
);

export const USER_ROLES = [RoleEnum.USER, RoleEnum.MERCHANT] as const;
