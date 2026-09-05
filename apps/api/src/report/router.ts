import { Router } from 'express'
import { requireAuth, requireTenant, getTenantId } from '../auth/middleware'
import { prisma } from '../lib/prisma'
import { sendDailyReport, sendWeeklyReport } from '../reporter/telegram'

export const reportRouter = Router()
reportRouter.use(requireAuth, requireTenant)

reportRouter.get('/', async (req, res) => {
  const tenantId = getTenantId(req)
  const reports = await prisma.report.findMany({
    where: tenantId ? { tenantId } : {},
    orderBy: { sentAt: 'desc' },
    take: 30
  })
  res.json({ success: true, data: reports })
})

// Trigger laporan manual
reportRouter.post('/send-daily', async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' })
  await sendDailyReport(tenantId)
  res.json({ success: true, message: 'Laporan harian dikirim ke Telegram' })
})

reportRouter.post('/send-weekly', async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' })
  await sendWeeklyReport(tenantId)
  res.json({ success: true, message: 'Laporan mingguan dikirim ke Telegram' })
})
