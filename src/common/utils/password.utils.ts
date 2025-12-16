import { promisify } from 'util';
import { randomBytes, scrypt as _scrypt } from 'crypto';

const scrypt = promisify(_scrypt);

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = randomBytes(8).toString('hex');
  const hash = (await scrypt(plainPassword, salt, 32)) as Buffer;
  return `${salt}.${hash.toString('hex')}`;
}

export async function verifyPassword(
  storedSaltDotHash: string,
  candidate: string,
): Promise<boolean> {
  const [salt, storedHash] = storedSaltDotHash.split('.');
  const hash = (await scrypt(candidate, salt, 32)) as Buffer;
  return storedHash === hash.toString('hex');
}
