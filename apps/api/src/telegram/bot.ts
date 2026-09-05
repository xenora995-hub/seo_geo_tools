import { Telegraf } from 'telegraf'
import { prisma } from '../lib/prisma'
import { generateAndPublish } from '../generator/service'

// Dictionary untuk menyimpan instance bot per tenant
const activeBots: Record<string, Telegraf> = {}
const userSessions: Record<string, { step: number; data: any }> = {}

export async function initTelegramBots() {
  console.log('[TELEGRAM] Menginisialisasi Command Center Bots...')
  
  try {
    const settingsWithBot = await prisma.tenantSetting.findMany({
      where: {
        telegramBotToken: { not: null },
      }
    })

    // Mulai bot untuk setiap tenant yang punya token
    for (const setting of settingsWithBot) {
      if (setting.telegramBotToken && setting.telegramBotToken.length > 20) {
        startBotForTenant(setting.tenantId, setting.telegramBotToken, setting.telegramChatId)
      }
    }
  } catch (error) {
    console.error('[TELEGRAM] Gagal inisialisasi bot awal:', error)
  }
}

export function startBotForTenant(tenantId: string, token: string, expectedChatId: string | null) {
  // Jika bot lama jalan, hentikan
  if (activeBots[tenantId]) {
    activeBots[tenantId].stop()
  }

  const bot = new Telegraf(token)

  bot.start((ctx) => {
    ctx.reply('Halo Bos! 🤖 Saya adalah asisten SEO Command Center Anda.\n\nGunakan perintah:\n`/tulis [keyword/topik]`\nContoh: `/tulis Harga emas hari ini`')
    // Simpan Chat ID jika belum tersimpan
    if (expectedChatId !== ctx.chat.id.toString()) {
      ctx.reply(`Chat ID Anda adalah: ${ctx.chat.id}\nSilakan masukkan ke pengaturan Dashboard jika belum.`)
    }
  })

  bot.command('tambah_blog', (ctx) => {
    if (expectedChatId && ctx.chat.id.toString() !== expectedChatId) return ctx.reply('Akses ditolak.')
    userSessions[ctx.chat.id.toString()] = { step: 1, data: {} }
    ctx.reply('Mari kita tambahkan blog baru!\n1. Silakan ketik *Nama Website* (misal: Toko Bunga Jakarta):', { parse_mode: 'Markdown' })
  })

  bot.command('tulis', async (ctx) => {
    // Validasi Chat ID agar orang lain tidak bisa memerintah bot ini
    if (expectedChatId && ctx.chat.id.toString() !== expectedChatId) {
      return ctx.reply('Maaf, Anda bukan bos saya. Chat ID tidak dikenali. 🛑')
    }

    const messageText = ctx.message.text
    const topic = messageText.replace('/tulis', '').trim()

    if (!topic) {
      return ctx.reply('Tolong berikan topiknya bos!\nContoh: `/tulis Asuransi Kesehatan`')
    }

    ctx.reply(`Baik bos! 🚀 Sedang riset dan menulis artikel super SEO tentang: *${topic}*...\nTunggu beberapa menit ya!`, { parse_mode: 'Markdown' })

    try {
      // Jalankan fungsi auto-publisher di background
      const result = await generateAndPublish({
        tenantId,
        topic,
        keywords: [topic]
      })

      if (result.success && result.article) {
        ctx.reply(`🎉 **SELESAI BOS!**\n\nArtikel sudah terbit dan Indexing API sudah ditembak (jika diaktifkan).\n\nCek hasilnya di sini:\n${result.article.cmsPostUrl}`, { parse_mode: 'Markdown' })
      }
    } catch (error: any) {
      ctx.reply(`❌ **Gagal Bos!**\nTerjadi kesalahan saat memposting:\n${error.message}`, { parse_mode: 'Markdown' })
    }
  })

  bot.on('text', async (ctx, next) => {
    const chatId = ctx.chat.id.toString()
    if (expectedChatId && chatId !== expectedChatId) return next()

    const session = userSessions[chatId]
    if (!session) return next()

    const text = ctx.message.text
    if (text.startsWith('/')) {
      delete userSessions[chatId]
      return next()
    }

    try {
      if (session.step === 1) {
        session.data.name = text
        session.step = 2
        return ctx.reply('2. Ketik *Domain* (misal: bungajakarta.com):', { parse_mode: 'Markdown' })
      } else if (session.step === 2) {
        session.data.domain = text
        session.step = 3
        return ctx.reply('3. Ketik *Tipe CMS* (Pilih angka:\n1 = WORDPRESS\n2 = LARAVEL\n3 = BLOGGER):')
      } else if (session.step === 3) {
        if (text === '1') session.data.cmsType = 'WORDPRESS'
        else if (text === '2') session.data.cmsType = 'LARAVEL'
        else if (text === '3') session.data.cmsType = 'BLOGGER'
        else return ctx.reply('Harap balas dengan angka 1, 2, atau 3.')
        session.step = 4
        return ctx.reply('4. Ketik *URL API/CMS*:\n- WP: https://domain.com/wp-json/wp/v2\n- Blogger: [Blog ID]')
      } else if (session.step === 4) {
        session.data.cmsUrl = text
        session.step = 5
        return ctx.reply('5. Terakhir, ketik *API Key/Password*:\n- WP: username:app_password\n- Blogger: Teks JSON Service Account')
      } else if (session.step === 5) {
        session.data.cmsApiKey = text
        ctx.reply('⏳ Sedang menyimpan konfigurasi blog baru ke database...')

        const currentSetting = await prisma.tenantSetting.findUnique({ where: { tenantId } })
        
        const newTenant = await prisma.tenant.create({
          data: {
            name: session.data.name,
            domain: session.data.domain,
            cmsType: session.data.cmsType,
            cmsUrl: session.data.cmsUrl,
            cmsApiKey: session.data.cmsApiKey,
            setting: {
              create: {
                telegramBotToken: token,
                telegramChatId: expectedChatId,
                geminiApiKey: currentSetting?.geminiApiKey || '',
              }
            }
          }
        })
        
        delete userSessions[chatId]
        return ctx.reply(`✅ **SUKSES!**\nBlog *${newTenant.name}* berhasil didaftarkan!\nAnda bisa memanage SEO dan keywords nya via Dashboard web.`, { parse_mode: 'Markdown' })
      }
    } catch (err: any) {
      delete userSessions[chatId]
      return ctx.reply(`❌ Terjadi kesalahan saat menyimpan: ${err.message}`)
    }
  })

  bot.launch()
  activeBots[tenantId] = bot
  console.log(`[TELEGRAM] Bot berjalan untuk tenant: ${tenantId}`)
}
