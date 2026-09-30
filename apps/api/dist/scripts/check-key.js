"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function check() {
    const tenant = await prisma.tenant.findFirst({
        where: { domain: 'baliphonerepair.com' },
        select: { cmsUrl: true, cmsApiKey: true }
    });
    console.log('cmsUrl:', tenant?.cmsUrl, 'hasApiKey:', Boolean(tenant?.cmsApiKey));
    await prisma.$disconnect();
}
check();
//# sourceMappingURL=check-key.js.map