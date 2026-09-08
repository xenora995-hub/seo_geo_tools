"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishToBlogger = publishToBlogger;
const googleapis_1 = require("googleapis");
async function publishToBlogger({ tenant, article, imageUrl }) {
    // Asumsi: tenant.cmsApiKey berisi string JSON Service Account
    // Asumsi: tenant.cmsUrl berisi Blog ID
    if (!tenant.cmsApiKey) {
        throw new Error('Kredensial Service Account Google belum diatur di kolom API Key');
    }
    if (!tenant.cmsUrl) {
        throw new Error('Blog ID belum diatur di kolom CMS URL');
    }
    let credentials;
    try {
        credentials = JSON.parse(tenant.cmsApiKey);
    }
    catch (err) {
        throw new Error('Format API Key tidak valid. Harus berupa teks JSON dari Google Service Account.');
    }
    const auth = new googleapis_1.google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/blogger'],
    });
    const blogger = googleapis_1.google.blogger({
        version: 'v3',
        auth,
    });
    let contentHtml = article.content;
    if (imageUrl) {
        contentHtml = `<img src="${imageUrl}" alt="${article.title}" style="max-width: 100%; height: auto;" /><br><br>${contentHtml}`;
    }
    try {
        const res = await blogger.posts.insert({
            blogId: tenant.cmsUrl,
            requestBody: {
                title: article.title,
                content: contentHtml,
                labels: article.keywords,
            },
        });
        return {
            id: res.data.id || '',
            url: res.data.url || '',
        };
    }
    catch (error) {
        console.error('[Blogger API Error]', error);
        throw new Error(`Gagal publish ke Blogger: ${error.message}`);
    }
}
//# sourceMappingURL=blogger.js.map