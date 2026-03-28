import dotenv from "dotenv";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// explicitly load env from api folder
dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  transactionOptions: {
    maxWait: 15_000,
    timeout: 30_000,
  },
});
