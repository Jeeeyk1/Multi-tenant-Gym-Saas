/**
 * Creates the first system admin account.
 * Run with: pnpm seed:admin
 *
 * Email and password come from env vars:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret pnpm seed:admin
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Usage: ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pass> pnpm seed:admin');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.systemAdmin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`✓ System admin ready: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
