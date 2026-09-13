"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPublishDateTo0800 = formatPublishDateTo0800;
exports.publishToLaravel = publishToLaravel;
const axios_1 = __importDefault(require("axios"));
function formatPublishDateTo0800(dateInput, timezone = 'Asia/Makassar') {
    if (!dateInput) {
        const now = new Date();
        try {
            const datePart = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(now);
            return `${datePart} 08:00:00`;
        }
        catch {
            return `${now.toISOString().split('T')[0]} 08:00:00`;
        }
    }
    if (typeof dateInput === 'string') {
        const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match && !dateInput.includes('Z') && !dateInput.includes('T')) {
            return `${match[1]} 08:00:00`;
        }
    }
    const d = new Date(dateInput);
    let datePart = '';
    try {
        datePart = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(d);
    }
    catch {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        datePart = `${year}-${month}-${day}`;
    }
    return `${datePart} 08:00:00`;
}
async function publishToLaravel(options) {
    const { tenant, article, publishDate, timezone = 'Asia/Makassar' } = options;
    const base = tenant.cmsUrl.replace(/\/$/, '');
    let finalContent = article.content;
    const publishedAt = formatPublishDateTo0800(publishDate, timezone);
    const res = await axios_1.default.post(`${base}/api/seo/posts`, {
        title: article.title,
        content: finalContent,
        excerpt: article.excerpt,
        image_url: article.imageUrl || null,
        keywords: article.keywords,
        author: article.author || 'Bali Phone Repair Team',
        status: 'published',
        published_at: publishedAt,
    }, {
        headers: {
            'Authorization': `Bearer ${tenant.cmsApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
    });
    return {
        id: String(res.data.post_id),
        url: res.data.post_url,
    };
}
//# sourceMappingURL=laravel.js.map