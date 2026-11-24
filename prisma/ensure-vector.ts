import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function ensureVectorExtension() {
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
}

ensureVectorExtension()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    process.stderr.write(`Failed to enable pgvector extension: ${String(err)}\n`);
    await prisma.$disconnect();
    process.exit(1);
  });
