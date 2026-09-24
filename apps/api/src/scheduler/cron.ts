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

  // Catch-up check: 20 detik setelah booting untuk memeriksa jika ada jadwal yang terlewat karena downtime
  setTimeout(async () => {
    await checkMissedSchedules().catch(console.error)
  }, 20000)

  // Polling pemulihan berkala (menit 15 dan 45 setiap jam) untuk menangkal sleep/downtime Hostinger
  cron.schedule('15,45 * * * *', async () => {
    await checkMissedSchedules().catch(console.error)
  })

  console.log(`[SCHEDULER] ✅ ${schedules.length} jadwal aktif dimuat`)
}

export async function checkMissedSchedules() {
  console.log('[SCHEDULER] 🔍 Memeriksa jadwal yang terlewat hari ini...')
  const schedules = await prisma.schedule.findMany({
    where: { isActive: true },
    include: { tenant: { include: { setting: true } } }
  })

  for (const schedule of schedules) {
    if (!schedule.tenant.isActive) continue

    const timezone = schedule.tenant.setting?.timezone || 'Asia/Makassar'
    const now = new Date()
    const todayStr = getDateStringInTimezone(now, timezone)

    // Cek apakah sudah berjalan hari ini
    if (schedule.lastRun) {
      const lastRunStr = getDateStringInTimezone(schedule.lastRun, timezone)
      if (lastRunStr === todayStr) continue
    }

    // Cek rentang tanggal jadwal
    if (schedule.startDate) {
      const startStr = getDateStringInTimezone(schedule.startDate, timezone)
      if (todayStr < startStr) continue
    }
    if (schedule.endDate) {
      const endStr = getDateStringInTimezone(schedule.endDate, timezone)
      if (todayStr > endStr) continue
    }

    // Periksa apakah waktu jadwal telah terlewati hari ini
    const parts = schedule.cronExpr.trim().split(/\s+/)
    if (parts.length >= 2) {
      const targetMin = parseInt(parts[0], 10)
      const targetHour = parseInt(parts[1], 10)

      if (!isNaN(targetHour) && !isNaN(targetMin)) {
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        })
        const timeParts = timeFormatter.formatToParts(now)
        const currentHour = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0', 10)
        const currentMin = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0', 10)

        if (currentHour > targetHour || (currentHour === targetHour && currentMin >= targetMin)) {
          console.log(`[SCHEDULER] ⚡ Mendeteksi jadwal terlewat hari ini: "${schedule.name}" (${schedule.tenant.name}). Mengeksekusi catch-up sekarang...`)
          await runScheduleJob(schedule.id).catch(err => console.error(`[SCHEDULER] Gagal eksekusi catch-up ${schedule.name}:`, err))
        }
      }
    }
  }
}

export function getDateStringInTimezone(d: Date, tz: string = 'Asia/Jakarta'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d)
  } catch {
    return d.toISOString().split('T')[0]
  }
}

export async function runScheduleJob(scheduleId: string, options?: { force?: boolean }): Promise<{ success: boolean; message: string; article?: any }> {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { tenant: { include: { setting: true } } }
  })

  if (!schedule) {
    return { success: false, message: `Jadwal ID ${scheduleId} tidak ditemukan` }
  }

  if (!schedule.isActive && !options?.force) {
    return { success: false, message: `Jadwal ${schedule.name} sedang tidak aktif` }
  }

  if (!schedule.tenant.isActive) {
    return { success: false, message: `Tenant ${schedule.tenant.name} sedang non-aktif` }
  }

  const setting = schedule.tenant.setting
  const timezone = setting?.timezone || 'Asia/Jakarta'
  const now = new Date()
  const todayStr = getDateStringInTimezone(now, timezone)

  if (!options?.force) {
    if (schedule.lastRun) {
      const lastRunStr = getDateStringInTimezone(schedule.lastRun, timezone)
      if (lastRunStr === todayStr) {
        const msg = `⏳ Jadwal ${schedule.name} sudah dieksekusi hari ini (${todayStr}). Melewati eksekusi ganda.`
        console.log(`[SCHEDULER] ${msg}`)
        return { success: true, message: msg }
      }
    }

    if (schedule.startDate) {
      const startStr = getDateStringInTimezone(schedule.startDate, timezone)
      if (todayStr < startStr) {
        const msg = `⏳ Jadwal ${schedule.name} belum saatnya dimulai (Hari ini: ${todayStr}, Mulai: ${startStr})`
        console.log(`[SCHEDULER] ${msg}`)
        return { success: false, message: msg }
      }
    }

    if (schedule.endDate) {
      const endStr = getDateStringInTimezone(schedule.endDate, timezone)
      if (todayStr > endStr) {
        const msg = `🛑 Jadwal ${schedule.name} sudah kedaluwarsa (Hari ini: ${todayStr}, Berakhir: ${endStr}). Menonaktifkan jadwal...`
        console.log(`[SCHEDULER] ${msg}`)
        await prisma.schedule.update({ where: { id: schedule.id }, data: { isActive: false } })
        unregisterCron(schedule.id)
        return { success: false, message: msg }
      }
    }
  }

  try {
    const result = await generateAndPublish({ tenantId: schedule.tenantId, topic: schedule.topic || undefined })
    await prisma.schedule.update({ where: { id: schedule.id }, data: { lastRun: new Date() } })
    console.log(`[SCHEDULER] ✅ Artikel berhasil diposting untuk jadwal: ${schedule.name} (${schedule.id})`)

    // Notifikasi Telegram (Sukses)
    if (setting?.telegramBotToken && setting?.telegramChatId && result?.article?.cmsPostUrl) {
      try {
        const bot = new Telegraf(setting.telegramBotToken)
        const msg = `✅ *Artikel Web ${schedule.tenant.name} publish done!*\n\nJudul: ${result.article.title}\n🔗 Link: ${result.article.cmsPostUrl}`
        await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' })
      } catch (telErr) {
        console.error('[SCHEDULER] Gagal kirim notif telegram sukses', telErr)
      }
    }

    return { success: true, message: 'Artikel berhasil di-generate dan di-publish', article: result?.article }
  } catch (err: any) {
    console.error(`[SCHEDULER] ❌ Gagal: ${err.message}`)

    // Notifikasi Telegram (Gagal)
    if (setting?.telegramBotToken && setting?.telegramChatId) {
      try {
        const bot = new Telegraf(setting.telegramBotToken)
        const msg = `❌ *Artikel Web ${schedule.tenant.name} publish gagal!*\n\nError: ${err.message}\n⏳ Silakan periksa limit kuota AI atau konfigurasi CMS.`
        await bot.telegram.sendMessage(setting.telegramChatId, msg, { parse_mode: 'Markdown' })
      } catch (telErr) {
        console.error('[SCHEDULER] Gagal kirim notif telegram error', telErr)
      }
    }

    return { success: false, message: err.message || 'Gagal memproses pembuatan artikel' }
  }
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
    console.log(`[SCHEDULER] ⏰ Memicu eksekusi cron: ${schedule.id} (Timezone: ${timezone})`)
    
    // Jeda acak 1 - 20 detik untuk mencegah race condition / 429 jika ada beberapa tenant dijadwalkan bersamaan
    const jitterDelay = Math.floor(Math.random() * 20000) + 1000
    setTimeout(async () => {
      await runScheduleJob(schedule.id)
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

