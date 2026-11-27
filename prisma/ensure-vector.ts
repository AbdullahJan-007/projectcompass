import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    },
  },
});

async function ensureVectorExtension() {
  await prisma.$executeRawUnsafe(
    `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;`
  );
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
