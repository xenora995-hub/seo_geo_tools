import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

export interface AuthUser {
  id: string
  email: string
  role: string
  tenantId: string | null
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Token tidak ditemukan' })
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'INVALID_TOKEN', message: 'Token tidak valid atau sudah expired' })
  }
}

export const requireSuperuser = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'SUPERUSER') {
    return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Hanya superuser yang bisa mengakses ini' })
  }
  next()
}

// Pastikan user hanya bisa akses data tenant mereka sendiri
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === 'SUPERUSER') return next()
  if (!req.user?.tenantId) {
    return res.status(403).json({ success: false, error: 'NO_TENANT', message: 'Akun tidak terhubung ke website manapun' })
  }
  next()
}

// Inject tenantId ke query — superuser bisa override via query param
export const getTenantId = (req: Request): string | null => {
  if (req.user?.role === 'SUPERUSER') {
    return (req.query.tenantId as string) || req.params.tenantId || null
  }
  return req.user?.tenantId || null
}
