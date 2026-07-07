import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

const algorithm = "scrypt";
const keyLength = 64;
const scryptOptions: ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024
};

function scrypt(password: string, salt: string, length: number, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt, keyLength, scryptOptions);

  return `${algorithm}$${scryptOptions.N}$${scryptOptions.r}$${scryptOptions.p}$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(passwordHash: string, password: string) {
  const [hashAlgorithm, cost, blockSize, parallelization, salt, storedKey] = passwordHash.split("$");

  if (hashAlgorithm !== algorithm || !cost || !blockSize || !parallelization || !salt || !storedKey) {
    return false;
  }

  const expectedKey = Buffer.from(storedKey, "base64url");
  const derivedKey = await scrypt(password, salt, expectedKey.length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization),
    maxmem: 64 * 1024 * 1024
  });

  return expectedKey.length === derivedKey.length && timingSafeEqual(expectedKey, derivedKey);
}
