"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
//# sourceMappingURL=check-tenant.js.map