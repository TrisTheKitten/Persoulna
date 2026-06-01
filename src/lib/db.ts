import type { PrismaClient } from "@prisma/client";

function blockedPrismaAccess(): never {
  throw new Error("Prisma runtime persistence is disabled in local-only mode.");
}

export const prisma = new Proxy(
  {},
  {
    get() {
      blockedPrismaAccess();
    },
  },
) as PrismaClient;
