"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingGoogleIndexing = pingGoogleIndexing;
const googleapis_1 = require("googleapis");
/**
 * Meminta Google untuk mengindeks URL baru secara instan
 * @param url URL artikel yang baru dipublikasikan
 * @param serviceAccountJsonString JSON credential dari Google Cloud (harus memiliki akses ke GSC)
 */
async function pingGoogleIndexing(url, serviceAccountJsonString) {
    try {
        const credentials = JSON.parse(serviceAccountJsonString);
        const auth = new googleapis_1.google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/indexing'],
        });
        const indexing = googleapis_1.google.indexing({
            version: 'v3',
            auth,
        });
        const res = await indexing.urlNotifications.publish({
            requestBody: {
                url: url,
                type: 'URL_UPDATED',
            },
        });
        console.log(`[INDEXING API] Berhasil menembak URL ke Google: ${url}`);
        return res.data;
    }
    catch (error) {
        console.error(`[INDEXING API ERROR] Gagal mengindeks ${url}:`, error.message);
        throw error;
    }
}
//# sourceMappingURL=indexer.js.map