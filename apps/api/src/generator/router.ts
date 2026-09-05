import { Router } from 'express'
import { requireAuth, requireTenant, getTenantId } from '../auth/middleware'
import { generateAndPublish } from './service'

export const generatorRouter = Router()
generatorRouter.use(requireAuth, requireTenant)

// POST /api/generate/article — trigger manual
generatorRouter.post('/article', async (req, res) => {
  try {
    const tenantId = getTenantId(req)
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' })

    const { topic, keywords } = req.body
    const result = await generateAndPublish({ tenantId, topic, keywords })
    res.json({ success: true, data: result, message: 'Artikel berhasil dibuat dan dipublikasi' })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})
