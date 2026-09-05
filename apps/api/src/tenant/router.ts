import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { requireAuth, requireSuperuser } from '../auth/middleware'
import { prisma } from '../lib/prisma'

export const tenantRouter = Router()
tenantRouter.use(requireAuth, requireSuperuser)

// GET /api/tenants
tenantRouter.get('/', async (_, res) => {
  const tenants = await prisma.tenant.findMany({
    include: { setting: true, _count: { select: { articles: true, users: true } } },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ success: true, data: tenants })
})

// GET /api/tenants/:id
tenantRouter.get('/:id', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    include: { setting: true, _count: { select: { articles: true, users: true } } }
  })
  if (!tenant) return res.status(404).json({ success: false, message: 'Tenant tidak ditemukan' })
  res.json({ success: true, data: tenant })
})

// POST /api/tenants
tenantRouter.post('/', async (req, res) => {
  try {
    const { name, domain, cmsType, cmsUrl, cmsApiKey, language, adminEmail, adminPassword, adminName } = req.body

    const tenant = await prisma.tenant.create({
      data: {
        name, domain, cmsType, cmsUrl, cmsApiKey,
        language: language || 'id',
        setting: {
          create: {
            geminiApiKey: '',
            targetKeywords: [],
            competitors: [],
          }
        },
        users: adminEmail ? {
          create: {
            email: adminEmail,
            password: await bcrypt.hash(adminPassword, 12),
            name: adminName || adminEmail,
            role: 'ADMIN',
          }
        } : undefined,
      },
      include: { users: { omit: { password: true } } }
    })

    res.status(201).json({ success: true, data: tenant, message: 'Website berhasil ditambahkan' })
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Domain sudah terdaftar' })
    res.status(500).json({ success: false, message: err.message })
  }
})

// PATCH /api/tenants/:id
tenantRouter.patch('/:id', async (req, res) => {
  const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: req.body })
  res.json({ success: true, data: tenant })
})

// DELETE /api/tenants/:id
tenantRouter.delete('/:id', async (req, res) => {
  await prisma.tenant.delete({ where: { id: req.params.id } })
  res.json({ success: true, message: 'Website dihapus' })
})
