import { GoogleGenerativeAI } from '@google/generative-ai';
/**
 * Generate content with automatic model fallback for maximum resilience
 * against 429 Quota Exceeded and 503 temporary service spikes.
 */
export declare function generateWithFallback(genAI: GoogleGenerativeAI, prompt: string, options?: {
    jsonMode?: boolean;
}): Promise<string>;
//# sourceMappingURL=gemini.d.ts.map