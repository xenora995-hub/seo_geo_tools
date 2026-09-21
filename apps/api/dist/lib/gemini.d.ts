import { GoogleGenerativeAI } from '@google/generative-ai';
/**
 * Generate content with automatic model fallback for maximum resilience
 * against 429 Quota Exceeded, timeouts, and 503 temporary service spikes.
 */
export declare function generateWithFallback(genAI: GoogleGenerativeAI, prompt: string, options?: {
    jsonMode?: boolean;
    timeoutMs?: number;
}): Promise<string>;
//# sourceMappingURL=gemini.d.ts.map