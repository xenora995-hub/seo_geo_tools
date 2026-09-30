import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
  const tenant = await prisma.tenant.findFirst({
    where: { domain: 'baliphonerepair.com' },
    select: { cmsUrl: true, cmsApiKey: true }
  });
  console.log('cmsUrl:', tenant?.cmsUrl, 'hasApiKey:', Boolean(tenant?.cmsApiKey));
  await prisma.$disconnect();
}
check();
