import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function bcryptHash(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function bcryptCompare(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
