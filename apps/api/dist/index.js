"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const router_1 = require("./auth/router");
const router_2 = require("./tenant/router");
const router_3 = require("./user/router");
const router_4 = require("./generator/router");
const router_5 = require("./scheduler/router");
const router_6 = require("./article/router");
const router_7 = require("./report/router");
const settingsRouter_1 = require("./tenant/settingsRouter");
const router_8 = require("./crawler/router");
const keywords_1 = require("./routes/keywords");
const rank_tracker_1 = require("./routes/rank-tracker");
const site_audit_1 = require("./routes/site-audit");
const content_gap_1 = require("./routes/content-gap");
const backlinks_1 = require("./routes/backlinks");
const local_listing_1 = require("./routes/local-listing");
const seo_writing_1 = require("./routes/seo-writing");
const niche_finder_1 = require("./routes/niche-finder");
const scraper_1 = require("./routes/scraper");
const cron_1 = require("./scheduler/cron");
const bot_1 = require("./telegram/bot");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Root & Health check
app.get('/', (_, res) => {
    res.json({
        status: 'online',
        service: 'SEO & GEO Content Automation Platform API',
        version: '1.0.0',
        frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
        docs: '/health'
    });
});
app.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/auth', router_1.authRouter);
app.use('/api/tenants', router_2.tenantRouter);
app.use('/api/users', router_3.userRouter);
app.use('/api/settings', settingsRouter_1.settingsRouter);
app.use('/api/crawler', router_8.crawlerRouter);
app.use('/api/generate', router_4.generatorRouter);
app.use('/api/schedules', router_5.schedulerRouter);
app.use('/api/articles', router_6.articleRouter);
app.use('/api/reports', router_7.reportRouter);
app.use('/api/keywords', keywords_1.keywordRouter);
app.use('/api/rank-tracker', rank_tracker_1.rankTrackerRouter);
app.use('/api/site-audit', site_audit_1.siteAuditRouter);
app.use('/api/content-gap', content_gap_1.contentGapRouter);
app.use('/api/backlinks', backlinks_1.backlinksRouter);
app.use('/api/local-listing', local_listing_1.localListingRouter);
app.use('/api/seo-writing', seo_writing_1.seoWritingRouter);
app.use('/api/niche-finder', niche_finder_1.nicheFinderRouter);
app.use('/api/scraper', scraper_1.scraperRouter);
// Error handler
app.use((err, _req, res, _next) => {
    console.error('[ERROR]', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Terjadi kesalahan server',
    });
});
app.listen(PORT, () => {
    console.log(`✅ API berjalan di port ${PORT}`);
    (0, cron_1.initScheduler)();
    (0, bot_1.initTelegramBots)();
});
//# sourceMappingURL=index.js.map