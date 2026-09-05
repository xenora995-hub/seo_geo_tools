import { Router } from 'express'
import cron from 'node-cron'
import { requireAuth, requireTenant, getTenantId } from '../auth/middleware'
import { prisma } from '../lib/prisma'
import { registerCron, unregisterCron } from './cron'

export const schedulerRouter = Router()
schedulerRouter.use(requireAuth, requireTenant)

schedulerRouter.get('/', async (req, res) => {
  const tenantId = getTenantId(req)
  const schedules = await prisma.schedule.findMany({
    where: tenantId ? { tenantId } : {},
    orderBy: { createdAt: 'desc' }
  })
  res.json({ success: true, data: schedules })
})

schedulerRouter.post('/', async (req, res) => {
  const tenantId = getTenantId(req)
  if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' })

  const { name, cronExpr, topic, startDate, endDate } = req.body
  if (!cron.validate(cronExpr)) {
    return res.status(400).json({ success: false, message: 'Format jadwal cron tidak valid (contoh: "0 8 * * *")' })
  }

  let parsedEndDate: Date | undefined = undefined
  if (endDate) {
    parsedEndDate = new Date(endDate)
    if (parsedEndDate.getUTCHours() === 0 && parsedEndDate.getUTCMinutes() === 0) {
      parsedEndDate.setUTCHours(23, 59, 59, 999)
    }
  }

  const schedule = await prisma.schedule.create({
    data: {
      tenantId,
      name,
      cronExpr,
      topic,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: parsedEndDate,
      isActive: true,
    }
  })
  await registerCron(schedule)
  res.status(201).json({ success: true, data: schedule, message: 'Jadwal berhasil dibuat' })
})

schedulerRouter.patch('/:id', async (req, res) => {
  const tenantId = getTenantId(req)
  const updateData = { ...req.body }
  if (updateData.startDate !== undefined) {
    updateData.startDate = updateData.startDate ? new Date(updateData.startDate) : null
  }
  if (updateData.endDate !== undefined) {
    if (updateData.endDate) {
      const d = new Date(updateData.endDate)
      if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) {
        d.setUTCHours(23, 59, 59, 999)
      }
      updateData.endDate = d
    } else {
      updateData.endDate = null
    }
  }

  const schedule = await prisma.schedule.updateMany({
    where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) },
    data: updateData
  })

  if (req.body.isActive === false) {
    unregisterCron(req.params.id)
  } else {
    const updated = await prisma.schedule.findUnique({ where: { id: req.params.id } })
    if (updated) await registerCron(updated)
  }

  res.json({ success: true, message: 'Jadwal diperbarui' })
})

schedulerRouter.delete('/:id', async (req, res) => {
  const tenantId = getTenantId(req)
  unregisterCron(req.params.id)
  await prisma.schedule.deleteMany({ where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) } })
  res.json({ success: true, message: 'Jadwal dihapus' })
})

import { generateAndPublish } from '../generator/service'

// POST /api/schedules/trigger/:id
schedulerRouter.post('/trigger/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' })

    const schedule = await prisma.schedule.findFirst({
      where: { id: req.params.id, tenantId }
    })
    
    if (!schedule) return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan' })

    const { publishDate } = req.body
    
    // Execute immediately with the backdate
    const result = await generateAndPublish({ 
      tenantId: schedule.tenantId, 
      topic: schedule.topic || undefined,
      publishDate 
    })
    
    res.json({ success: true, data: result, message: 'Artikel backdate berhasil di-publish' })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Gagal memicu jadwal' })
  }
})

