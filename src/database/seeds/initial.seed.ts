import { DataSource, In } from 'typeorm';
import { Role } from '@/modules/users/entities/role.entity';
import { User } from '@/modules/users/entities/user.entity';
import { RoleEnum } from '@/common/enums/role.enum';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

export const runInitialSeed = async (dataSource: DataSource) => {
  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);

  // 1. Crear roles por defecto
  const roleNames = Object.values(RoleEnum);
  const existingRoles = await roleRepo.find({ where: { name: In(roleNames) } });
  const existingNames = existingRoles.map((r) => r.name);
  const missingRoles = roleNames.filter(
    (name) => !existingNames.includes(name),
  );

  if (missingRoles.length > 0) {
    const newRoles = missingRoles.map((name) => roleRepo.create({ name }));
    await roleRepo.save(newRoles);
    console.log(`🟢 Roles creados: ${missingRoles.join(', ')}`);
  }

  // 2. Crear usuario admin si no existe
  const adminEmail = 'vainotecnologia@gmail.com';
  const adminExists = await userRepo.findOne({ where: { email: adminEmail } });

  if (!adminExists) {
    const salt = randomBytes(8).toString('hex');
    const hash = (await scrypt('Admin*123', salt, 32)) as Buffer;
    const saltAndHash = `${salt}.${hash.toString('hex')}`;

    const adminRole = await roleRepo.findOne({
      where: { name: RoleEnum.ADMIN },
    });

    const admin = userRepo.create({
      email: adminEmail,
      password: saltAndHash,
      firstName: 'Vaino',
      lastName: 'Tecnologia',
      fullName: 'Vaino Tecnologia',
      phone: '+5555997162573',
      verified: true,
      avatar: '',
      roles: [adminRole as Role],
    });

    await userRepo.save(admin);
    console.log('🟢 Usuario admin creado');
  } else {
    console.log('🟡 El usuario admin ya existe');
  }
};
