"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantId = exports.requireTenant = exports.requireSuperuser = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const requireAuth = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Token tidak ditemukan' });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ success: false, error: 'INVALID_TOKEN', message: 'Token tidak valid atau sudah expired' });
    }
};
exports.requireAuth = requireAuth;
const requireSuperuser = (req, res, next) => {
    if (req.user?.role !== 'SUPERUSER') {
        return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Hanya superuser yang bisa mengakses ini' });
    }
    next();
};
exports.requireSuperuser = requireSuperuser;
// Pastikan user hanya bisa akses data tenant mereka sendiri
const requireTenant = (req, res, next) => {
    if (req.user?.role === 'SUPERUSER')
        return next();
    if (!req.user?.tenantId) {
        return res.status(403).json({ success: false, error: 'NO_TENANT', message: 'Akun tidak terhubung ke website manapun' });
    }
    next();
};
exports.requireTenant = requireTenant;
// Inject tenantId ke query — superuser bisa override via query param
const getTenantId = (req) => {
    if (req.user?.role === 'SUPERUSER') {
        return req.query.tenantId || req.params.tenantId || null;
    }
    return req.user?.tenantId || null;
};
exports.getTenantId = getTenantId;
//# sourceMappingURL=middleware.js.map