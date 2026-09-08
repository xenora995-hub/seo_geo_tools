"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatorRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../auth/middleware");
const service_1 = require("./service");
exports.generatorRouter = (0, express_1.Router)();
exports.generatorRouter.use(middleware_1.requireAuth, middleware_1.requireTenant);
// POST /api/generate/article — trigger manual
exports.generatorRouter.post('/article', async (req, res) => {
    try {
        const tenantId = (0, middleware_1.getTenantId)(req);
        if (!tenantId)
            return res.status(400).json({ success: false, message: 'Tenant ID diperlukan' });
        const { topic, keywords } = req.body;
        const result = await (0, service_1.generateAndPublish)({ tenantId, topic, keywords });
        res.json({ success: true, data: result, message: 'Artikel berhasil dibuat dan dipublikasi' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
//# sourceMappingURL=router.js.map