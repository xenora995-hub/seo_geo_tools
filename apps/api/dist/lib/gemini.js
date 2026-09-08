"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWithFallback = generateWithFallback;
const GEMINI_MODELS = [
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-2.5-flash',
];
/**
 * Generate content with automatic model fallback for maximum resilience
 * against 429 Quota Exceeded and 503 temporary service spikes.
 */
async function generateWithFallback(genAI, prompt, options) {
    let lastError = null;
    for (const modelName of GEMINI_MODELS) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: options?.jsonMode
                    ? { responseMimeType: 'application/json' }
                    : undefined,
            });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            if (text) {
                console.log(`[GEMINI] Sukses generate menggunakan model: ${modelName}`);
                return text;
            }
        }
        catch (err) {
            console.warn(`[GEMINI] Model ${modelName} gagal: ${err.message}. Mencoba model alternatif...`);
            lastError = err;
        }
    }
    throw lastError || new Error('Semua model Gemini mengalami kendala kuota/koneksi.');
}
//# sourceMappingURL=gemini.js.map