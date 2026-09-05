import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { requireAuth } from './middleware'

export const authRouter = Router()

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: { select: { id: true, name: true, domain: true, isActive: true } } }
    })

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Email atau password salah' })
    }

    if (user.tenantId && !user.tenant?.isActive) {
      return res.status(403).json({ success: false, error: 'TENANT_INACTIVE', message: 'Website sedang tidak aktif' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    )

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenant: user.tenant,
        }
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login gagal' })
  }
})

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { tenant: { select: { id: true, name: true, domain: true } } },
    omit: { password: true }
  })
  res.json({ success: true, data: user })
})
