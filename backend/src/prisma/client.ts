import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/index.js";
import { env } from "../config/env.js";

const adapter = new PrismaMariaDb(env.databaseUrl);

export const prisma = new PrismaClient({ adapter });
