import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { requireAuth, requireTenant, getTenantId } from '../auth/middleware'
import { prisma } from '../lib/prisma'

export const userRouter = Router()
userRouter.use(requireAuth, requireTenant)

userRouter.get('/', async (req, res) => {
  const tenantId = getTenantId(req)
  const users = await prisma.user.findMany({
    where: tenantId ? { tenantId } : {},
    omit: { password: true },
    orderBy: { createdAt: 'desc' }
  })
  res.json({ success: true, data: users })
})

userRouter.post('/', async (req, res) => {
  const tenantId = getTenantId(req)
  const { email, password, name, role } = req.body
  const user = await prisma.user.create({
    data: { email, password: await bcrypt.hash(password, 12), name, role: role || 'ADMIN', tenantId },
    omit: { password: true }
  })
  res.status(201).json({ success: true, data: user })
})

userRouter.delete('/:id', async (req, res) => {
  const tenantId = getTenantId(req)
  await prisma.user.deleteMany({ where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) } })
  res.json({ success: true, message: 'User dihapus' })
})
