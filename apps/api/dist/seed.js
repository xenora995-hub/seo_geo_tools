"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("./lib/prisma");
async function main() {
    const email = process.env.SUPERUSER_EMAIL || 'admin@seogeo.com';
    const password = process.env.SUPERUSER_PASSWORD || 'Admin@2024!';
    let superuser = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!superuser) {
        superuser = await prisma_1.prisma.user.create({
            data: {
                email,
                password: await bcryptjs_1.default.hash(password, 12),
                name: 'Super Admin',
                role: 'SUPERUSER',
                tenantId: null,
            }
        });
        console.log(`✅ Superuser berhasil dibuat: ${email}`);
    }
    else {
        console.log(`ℹ️ Superuser sudah ada: ${email}`);
    }
    // Seed Primary Tenant: baliphonerepair.com
    let baliTenant = await prisma_1.prisma.tenant.findUnique({ where: { domain: 'baliphonerepair.com' } });
    if (!baliTenant) {
        baliTenant = await prisma_1.prisma.tenant.create({
            data: {
                name: 'Bali Phone Repair',
                domain: 'baliphonerepair.com',
                cmsType: 'WORDPRESS',
                cmsUrl: 'https://baliphonerepair.com',
                cmsApiKey: 'wp_app_password_baliphone',
                language: 'en',
                isActive: true,
                setting: {
                    create: {
                        businessNiche: 'Professional Smartphone, iPhone, MacBook and Electronics Repair in Bali',
                        targetKeywords: [
                            'iphone repair bali',
                            'phone screen replacement bali',
                            'apple service center canggu',
                            'water damage repair denpasar',
                            'macbook repair seminyak'
                        ],
                        competitors: ['irepairaba.co.id', 'fixitbali.com'],
                        imageStyle: 'professional photography, electronics repair workbench, high quality 4k',
                        customPrompt: `You are Solon, an elite Senior SEO & Generative Engine Optimization (GEO) Content Strategist and Master Electronics Technician for Bali Phone Repair (baliphonerepair.com).

=== PRIMARY MISSION ===
Your goal is to write comprehensive, authoritative, human-like technical articles (1,500 - 2,500 words) in fluent English that rank #1 on Google Organic Search and get prioritized as the primary cited source in AI Search Engines (ChatGPT Search, Perplexity AI, Google AI Overviews, and Claude).

=== STRICT LANGUAGE REQUIREMENT ===
- The entire article MUST be written in 100% natural, engaging, professional English.
- Tone: Empathetic, expert, highly practical, and trustworthy (Google E-E-A-T compliant).

=== GEO & AI SEARCH CITATION RULES (MANDATORY) ===
1. Direct Quick Answer: Open the article immediately with:
   <p class="geo-summary"><strong>Quick Answer:</strong> [Provide a direct, 2-3 sentence answer to the search query, highlighting solution, cost range, and turnaround time]</p>
2. Key Takeaways: Right after the introduction, provide a bulleted list:
   <ul>
     <li><strong>Crucial Point 1:</strong> ...</li>
     <li><strong>Crucial Point 2:</strong> ...</li>
     <li><strong>Crucial Point 3:</strong> ...</li>
   </ul>
3. Structured Headings: Every H2 must answer a standalone user intent question. Break down steps using H3 and numbered lists.
4. Data Comparison Table: Where relevant, insert an HTML table comparing repair options (e.g., Original vs OEM parts, water damage repair timelines, diagnostic symptoms).
5. Comprehensive FAQ Section: At the end, include an FAQ section with at least 4 common questions:
   <div class="faq-section">
     <h3>Question?</h3>
     <p>Direct, actionable answer.</p>
   </div>
6. Local Bali Context: Naturally mention practical Bali locations (Denpasar, Canggu, Seminyak, Kuta, Ubud, Sanur) and tropical challenges (humidity, sea salt air, rain exposure, overheating).
7. High-Converting Call to Action (CTA): Conclude with a warm, helpful invitation for readers to get a free device diagnostic or express repair at Bali Phone Repair with genuine warranty.`,
                        articlesPerDay: 2,
                        timezone: 'Asia/Makassar'
                    }
                },
                users: {
                    create: [
                        {
                            email: 'admin@baliphonerepair.com',
                            password: await bcryptjs_1.default.hash('DemoPassword123!', 12),
                            name: 'Admin Bali Phone Repair',
                            role: 'ADMIN'
                        },
                        {
                            email: 'admin@democlient.com',
                            password: await bcryptjs_1.default.hash('DemoPassword123!', 12),
                            name: 'Demo Client Admin',
                            role: 'ADMIN'
                        }
                    ]
                }
            }
        });
        console.log(`✅ Tenant ${baliTenant.name} (${baliTenant.domain}) berhasil dibuat & direstore!`);
    }
    else {
        console.log(`ℹ️ Tenant baliphonerepair.com sudah ada di database.`);
    }
}
main().catch(console.error).finally(() => prisma_1.prisma.$disconnect());
//# sourceMappingURL=seed.js.map