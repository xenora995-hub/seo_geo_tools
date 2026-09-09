import { Router } from 'express'
import { requireAuth, requireTenant, getTenantId } from '../auth/middleware'
import { prisma } from '../lib/prisma'
import { publishExistingArticle } from '../generator/service'

export const articleRouter = Router()
articleRouter.use(requireAuth, requireTenant)

// GET /api/articles
articleRouter.get('/', async (req, res) => {
  const tenantId = getTenantId(req)
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const status = req.query.status as string | undefined

  const where: any = { ...(tenantId ? { tenantId } : {}), ...(status ? { status } : {}) }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.article.count({ where })
  ])

  res.json({ success: true, data: articles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
})

// GET /api/articles/:id
articleRouter.get('/:id', async (req, res) => {
  const tenantId = getTenantId(req)
  const article = await prisma.article.findFirst({
    where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) }
  })
  if (!article) return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan' })
  res.json({ success: true, data: article })
})

// POST /api/articles/:id/publish (Retry / Manual publish draft)
articleRouter.post('/:id/publish', async (req, res) => {
  try {
    const tenantId = getTenantId(req)
    const article = await prisma.article.findFirst({
      where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) }
    })
    if (!article) return res.status(404).json({ success: false, message: 'Artikel tidak ditemukan' })

    const { publishDate } = req.body || {}
    const published = await publishExistingArticle(article.id, publishDate)
    res.json({ success: true, data: published, message: 'Artikel berhasil dipublikasikan ke website!' })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message })
  }
})

// DELETE /api/articles/:id
articleRouter.delete('/:id', async (req, res) => {
  const tenantId = getTenantId(req)
  await prisma.article.deleteMany({ where: { id: req.params.id, ...(tenantId ? { tenantId } : {}) } })
  res.json({ success: true, message: 'Artikel dihapus' })
})

