import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { generateAndPublish } from '../generator/service'
import { sendDailyReport, sendWeeklyReport } from '../reporter/telegram'
import { Telegraf } from 'telegraf'

const activeCrons = new Map<string, cron.ScheduledTask>()

export async function initScheduler() {
  console.log('[SCHEDULER] Memuat jadwal dari database...')
  const schedules = await prisma.schedule.findMany({
    where: { isActive: true },
    include: { tenant: { select: { isActive: true } } }
  })

  for (const schedule of schedules) {
    if (!schedule.tenant.isActive) continue
    await registerCron(schedule)
  }

  // Laporan harian - setiap hari jam 23:00
  cron.schedule('0 23 * * *', async () => {
    console.log('[SCHEDULER] Mengirim laporan harian...')
    const tenants = await prisma.tenant.findMany({ where: { isActive: true } })
    for (const tenant of tenants) {
      await sendDailyReport(tenant.id).catch(console.error)
    }
  })

  // Laporan mingguan - setiap Minggu jam 08:00
  cron.schedule('0 8 * * 0', async () => {
    console.log('[SCHEDULER] Mengirim laporan mingguan...')
    const tenants = await prisma.tenant.findMany({ where: { isActive: true } })
    for (const tenant of tenants) {
      await sendWeeklyReport(tenant.id).catch(console.error)
    }
  })

  console.log(`[SCHEDULER] ✅ ${schedules.length} jadwal aktif dimuat`)
}

export async function registerCron(schedule: { id: string; cronExpr: string; tenantId: string; topic?: string | null; startDate?: Date | null; endDate?: Date | null }) {
  // Stop yang lama kalau ada
  if (activeCrons.has(schedule.id)) {
    activeCrons.get(schedule.id)!.stop()
  }

  if (!cron.validate(schedule.cronExpr)) {
    console.warn(`[SCHEDULER] Cron expression tidak valid: ${schedule.cronExpr}`)
    return
  }

  const setting = await prisma.tenantSetting.findUnique({ where: { tenantId: schedule.tenantId } })
  const timezone = setting?.timezone || 'Asia/Jakarta'

  const task = cron.schedule(schedule.cronExpr, async () => {
    console.log(`[SCHEDULER] Menjalankan jadwal: ${schedule.id} (Timezone: ${timezone})`)
    
    // Pengecekan Tanggal Mulai dan Selesai
    const now = new Date()
    if (schedule.startDate && now < schedule.startDate) {
      console.log(`[SCHEDULER] ⏳ Jadwal ${schedule.id} belum saatnya dimulai (Mulai: ${schedule.startDate})`)
      return
    }
    
    if (schedule.endDate) {
      const end = new Date(schedule.endDate)
      // Jika endDate tersimpan tepat di 00:00:00, perluas sampai 23:59:59 agar berlaku penuh di hari tersebut
      if (end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && end.getUTCSeconds() === 0) {
        end.setUTCHours(23, 59, 59, 999)
      }
      if (now > end) {
        console.log(`[SCHEDULER] 🛑 Jadwal ${schedule.id} sudah kedaluwarsa. Menonaktifkan jadwal...`)
        await prisma.schedule.update({ where: { id: schedule.id }, data: { isActive: false } })
        unregisterCron(schedule.id)
        return
      }
    }

    await prisma.schedule.update({ where: { id: schedule.id }, data: { lastRun: new Date() } })

    const executeWithRetry = async () => {
      try {
        const result = await generateAndPublish({ tenantId: schedule.tenantId, topic: schedule.topic || undefined })
        console.log(`[SCHEDULER] ✅ Artikel berhasil diposting untuk jadwal: ${schedule.id}`)
        
        // Notifikasi Telegram (Sukses)
        if (setting?.telegramBotToken && setting?.telegramChatId && result?.article?.cmsPostUrl) {
          try {
            const bot = new Telegraf(setting.telegramBotToken)
            const tenant = await prisma.tenant.findUnique({ where: { id: schedule.tenantId } })
            const msg = `✅ *Artikel Web ${tenant?.name} publish done!*\n\nJudul: ${result.article.title}\n🔗 Link: ${result.article.cmsPostUrl}`
            await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' })
          } catch (telErr) {
            console.error('[SCHEDULER] Gagal kirim notif telegram sukses', telErr)
          }
        }
      } catch (err: any) {
        console.error(`[SCHEDULER] ❌ Gagal: ${err.message}`)
        
        // Notifikasi Telegram (Gagal)
        if (setting?.telegramBotToken && setting?.telegramChatId) {
          try {
            const bot = new Telegraf(setting.telegramBotToken)
            const tenant = await prisma.tenant.findUnique({ where: { id: schedule.tenantId } })
            const msg = `❌ *Artikel Web ${tenant?.name} publish gagal!*\n\nError: ${err.message}\n⏳ Sistem akan mengulangi secara otomatis 5 menit lagi...`
            await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' })
          } catch (telErr) {
            console.error('[SCHEDULER] Gagal kirim notif telegram error', telErr)
          }
        }

        console.log(`[SCHEDULER] ⏳ Server AI sedang sibuk/gagal. Mencoba ulang dalam 5 menit...`)
        setTimeout(executeWithRetry, 5 * 60 * 1000)
      }
    }

    // Menambahkan jeda acak (jitter) 1 - 30 detik agar jika ada 2 web jalan bersamaan,
    // tidak membombardir AI API di milidetik yang sama persis (mencegah 429 Error).
    const jitterDelay = Math.floor(Math.random() * 30000) + 1000
    setTimeout(() => {
      executeWithRetry()
    }, jitterDelay)
  }, { timezone })

  activeCrons.set(schedule.id, task)
}

export function unregisterCron(scheduleId: string) {
  if (activeCrons.has(scheduleId)) {
    activeCrons.get(scheduleId)!.stop()
    activeCrons.delete(scheduleId)
  }
}
