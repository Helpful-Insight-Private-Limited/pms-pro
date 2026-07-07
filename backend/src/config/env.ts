import "dotenv/config";

function readRequired(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readNumber(name: string, fallback: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsedValue;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: readNumber("PORT", 4000),
  databaseUrl: readRequired("DATABASE_URL"),
  jwtAccessSecret: readRequired("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: readRequired("JWT_REFRESH_SECRET"),
  credentialEncryptionKey: readRequired("CREDENTIAL_ENCRYPTION_KEY"),
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:3000",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtlDays: readNumber("REFRESH_TOKEN_TTL_DAYS", 30),
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
    firstName: process.env.SEED_ADMIN_FIRST_NAME ?? "System",
    lastName: process.env.SEED_ADMIN_LAST_NAME ?? "Admin"
  }
};
