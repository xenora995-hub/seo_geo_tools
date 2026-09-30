import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function testHealth() {
  const tenant = await prisma.tenant.findFirst({
    where: { domain: 'baliphonerepair.com' }
  });
  if (!tenant) return;

  console.log('Testing endpoint:', `${tenant.cmsUrl}/api/seo/health`);
  try {
    const res = await axios.get(`${tenant.cmsUrl}/api/seo/health`, {
      headers: { Authorization: `Bearer ${tenant.cmsApiKey}` },
      timeout: 10000
    });
    console.log('Health response status:', res.status, res.data);
  } catch (err: any) {
    console.log('Health check failed:', err.response?.status, err.response?.data || err.message);
  }
  await prisma.$disconnect();
}

testHealth();
