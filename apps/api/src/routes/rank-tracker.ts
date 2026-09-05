import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

export const rankTrackerRouter = Router()
const prisma = new PrismaClient()

// Menambahkan project tracking baru
rankTrackerRouter.post('/projects', async (req, res) => {
  try {
    const { domain, location, tenantId } = req.body
    
    if (!domain || !location || !tenantId) {
      return res.status(400).json({ error: 'Domain, location, and tenantId are required' })
    }

    const project = await prisma.rankTrackingProject.create({
      data: {
        domain,
        location,
        tenantId
      }
    })

    res.json({ success: true, data: project })
  } catch (error) {
    console.error('[Rank Tracker Error]', error)
    res.status(500).json({ success: false, error: 'Failed to create project' })
  }
})

// Mengambil daftar project
rankTrackerRouter.get('/projects', async (req, res) => {
  try {
    const { tenantId } = req.query
    const projects = await prisma.rankTrackingProject.findMany({
      where: tenantId ? { tenantId: String(tenantId) } : undefined,
      include: {
        histories: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
    res.json({ success: true, data: projects })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch projects' })
  }
})
