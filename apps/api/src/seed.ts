import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from './lib/prisma'

async function main() {
  const email = process.env.SUPERUSER_EMAIL || 'admin@seogeo.com'
  const password = process.env.SUPERUSER_PASSWORD || 'Admin@2024!'

  let superuser = await prisma.user.findUnique({ where: { email } })
  if (!superuser) {
    superuser = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 12),
        name: 'Super Admin',
        role: 'SUPERUSER',
        tenantId: null,
      }
    })
    console.log(`✅ Superuser berhasil dibuat: ${email}`)
  } else {
    console.log(`ℹ️ Superuser sudah ada: ${email}`)
  }

  // Seed Primary Tenant: baliphonerepair.com
  let baliTenant = await prisma.tenant.findUnique({ where: { domain: 'baliphonerepair.com' } })
  if (!baliTenant) {
    baliTenant = await prisma.tenant.create({
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
2. Human Touch Experience Paragraph (Crucial for E-E-A-T): Right after the quick answer or at the beginning of the article, add one short paragraph (2-3 sentences) that sounds like a real technician speaking from experience. Use phrases like 'In our experience handling hundreds of devices in Bali...', 'Our technicians in Canggu frequently see this issue...', or 'After fixing this problem for tourists and expats across Bali...'. This paragraph must feel authentic and human, not generic.
3. Key Takeaways: Right after the introduction, provide a bulleted list:
   <ul>
     <li><strong>Crucial Point 1:</strong> ...</li>
     <li><strong>Crucial Point 2:</strong> ...</li>
     <li><strong>Crucial Point 3:</strong> ...</li>
   </ul>
4. Structured Headings: Every H2 must answer a standalone user intent question. Break down steps using H3 and numbered lists.
5. Data Comparison Table: Where relevant, insert an HTML table comparing repair options (e.g., Original vs OEM parts, water damage repair timelines, diagnostic symptoms).
6. Contextual Internal Linking: At the end of the article body, before the FAQ section, add a natural paragraph that internally links to at least 2 relevant service pages using contextual anchor text. Example: If you need immediate help, our iPhone repair Canggu team at https://baliphonerepair.com/services/iphone-repair-bali is available same-day, or you can book a MacBook repair Bali session at https://baliphonerepair.com/services/macbook-repair-bali directly from our service page. Available service links:
   - iPhone Repair: https://baliphonerepair.com/services/iphone-repair-bali
   - MacBook Repair: https://baliphonerepair.com/services/macbook-repair-bali
   - iPad Repair: https://baliphonerepair.com/services/ipad-repair-bali
   - Water Damage Repair: https://baliphonerepair.com/services/water-damage-repair-bali
   - Android Repair: https://baliphonerepair.com/services/android-repair-bali
   - Screen Replacement: https://baliphonerepair.com/services/screen-replacement-bali
   - Battery Replacement: https://baliphonerepair.com/services/battery-replacement-bali
7. Comprehensive FAQ Section: At the end, include an FAQ section with at least 4 common questions (H3 ending with a question mark followed by a direct answer paragraph):
   <div class="faq-section">
     <h3>Question?</h3>
     <p>Direct, actionable answer.</p>
   </div>
8. Local Bali Context: Naturally mention practical Bali locations (Denpasar, Canggu, Seminyak, Kuta, Ubud, Sanur) and tropical challenges (humidity, sea salt air, rain exposure, overheating).
9. High-Converting Call to Action (CTA): Conclude with a warm, helpful invitation for readers to get a free device diagnostic or express repair at Bali Phone Repair with genuine warranty.`,
            articlesPerDay: 2,
            timezone: 'Asia/Makassar'
          }
        },
        users: {
          create: [
            {
              email: 'admin@baliphonerepair.com',
              password: await bcrypt.hash('DemoPassword123!', 12),
              name: 'Admin Bali Phone Repair',
              role: 'ADMIN'
            },
            {
              email: 'admin@democlient.com',
              password: await bcrypt.hash('DemoPassword123!', 12),
              name: 'Demo Client Admin',
              role: 'ADMIN'
            }
          ]
        }
      }
    })
    console.log(`✅ Tenant ${baliTenant.name} (${baliTenant.domain}) berhasil dibuat & direstore!`)
  } else {
    console.log(`ℹ️ Tenant baliphonerepair.com sudah ada di database.`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())

