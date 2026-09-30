import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRouter } from './auth/router'
import { tenantRouter } from './tenant/router'
import { userRouter } from './user/router'
import { generatorRouter } from './generator/router'
import { schedulerRouter } from './scheduler/router'
import { articleRouter } from './article/router'
import { reportRouter } from './report/router'
import { settingsRouter } from './tenant/settingsRouter'
import { crawlerRouter } from './crawler/router'
import { keywordRouter } from './routes/keywords'
import { rankTrackerRouter } from './routes/rank-tracker'
import { siteAuditRouter } from './routes/site-audit'
import { contentGapRouter } from './routes/content-gap'
import { backlinksRouter } from './routes/backlinks'
import { localListingRouter } from './routes/local-listing'
import { seoWritingRouter } from './routes/seo-writing'
import { nicheFinderRouter } from './routes/niche-finder'
import { scraperRouter } from './routes/scraper'
import { aiVisibilityRouter } from './routes/ai-visibility'
import { auditEngineRouter } from './routes/audit-engine'
import { initScheduler } from './scheduler/cron'
import { initTelegramBots } from './telegram/bot'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// Root & Health check
app.get('/', (_, res) => {
  res.json({
    status: 'online',
    service: 'SEO & GEO Content Automation Platform API',
    version: '1.0.0',
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
    docs: '/health'
  })
})

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/tenants', tenantRouter)
app.use('/api/users', userRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/crawler', crawlerRouter)
app.use('/api/generate', generatorRouter)
app.use('/api/schedules', schedulerRouter)
app.use('/api/articles', articleRouter)
app.use('/api/reports', reportRouter)
app.use('/api/keywords', keywordRouter)
app.use('/api/rank-tracker', rankTrackerRouter)
app.use('/api/site-audit', siteAuditRouter)
app.use('/api/content-gap', contentGapRouter)
app.use('/api/backlinks', backlinksRouter)
app.use('/api/local-listing', localListingRouter)
app.use('/api/seo-writing', seoWritingRouter)
app.use('/api/niche-finder', nicheFinderRouter)
app.use('/api/scraper', scraperRouter)
app.use('/api/ai-visibility', aiVisibilityRouter)
app.use('/api/audit-engine', auditEngineRouter)

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err)
  res.status(err.status || 500).json({
    success: false,
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Terjadi kesalahan server',
  })
})

import fs from 'fs'
import path from 'path'

// Crash Prevention Shield
process.on('uncaughtException', (err: any) => {
  console.error('[UNCAUGHT EXCEPTION SHIELD]', err?.message || err)
  if (err?.stack) console.error(err.stack)
})

process.on('unhandledRejection', (reason: any) => {
  console.error('[UNHANDLED REJECTION SHIELD]', reason?.message || reason)
})

const SOCKET_PATH = process.env.UNIX_SOCKET_PATH || (process.platform === 'linux' ? path.resolve(__dirname, '../api.sock') : null)

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`✅ API berjalan di port ${PORT}`)
  try {
    initScheduler().catch((e) => console.error('[SCHEDULER INIT ERROR]', e))
  } catch (e) {
    console.error('[SCHEDULER INIT ERROR]', e)
  }
  try {
    initTelegramBots().catch((e) => console.error('[TELEGRAM INIT ERROR]', e))
  } catch (e) {
    console.error('[TELEGRAM INIT ERROR]', e)
  }
})

if (SOCKET_PATH) {
  try {
    if (fs.existsSync(SOCKET_PATH)) {
      try { fs.unlinkSync(SOCKET_PATH) } catch {}
    }
    app.listen(SOCKET_PATH, () => {
      try { fs.chmodSync(SOCKET_PATH, 0o777) } catch {}
      console.log(`✅ API berjalan via Unix Domain Socket di ${SOCKET_PATH}`)
    })

    const cleanup = () => {
      try {
        if (fs.existsSync(SOCKET_PATH)) fs.unlinkSync(SOCKET_PATH)
      } catch {}
    }
    process.on('exit', cleanup)
    process.on('SIGINT', () => { cleanup(); process.exit(0) })
    process.on('SIGTERM', () => { cleanup(); process.exit(0) })
  } catch (err) {
    console.error('[SOCKET ERROR]', err)
  }
}
