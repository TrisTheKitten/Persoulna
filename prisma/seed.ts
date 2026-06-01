import { DEFAULT_USER_ID } from "../src/lib/constants";
import { prisma } from "../src/lib/db";

async function main() {
  await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: { email: process.env.DEFAULT_USER_EMAIL || null },
    create: {
      id: DEFAULT_USER_ID,
      email: process.env.DEFAULT_USER_EMAIL || null,
    },
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
