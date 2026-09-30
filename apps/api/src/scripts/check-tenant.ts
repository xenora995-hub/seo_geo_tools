import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
  const tenant = await prisma.tenant.findFirst({
    where: { domain: 'baliphonerepair.com' },
    include: { setting: true }
  });
  console.log('Tenant:', tenant?.name, tenant?.domain, 'cmsUrl:', tenant?.cmsUrl);
  console.log('Settings:', JSON.stringify(tenant?.setting, null, 2));
  await prisma.$disconnect();
}
check();
