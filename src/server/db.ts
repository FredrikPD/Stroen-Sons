import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof makePrisma>;
};

const makePrisma = () => {
  return new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL
  }).$extends(withAccelerate());
}

export const db = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export { db as prisma };