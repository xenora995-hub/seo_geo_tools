import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
]

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout setelah ${ms / 1000} detik`)), ms)
    ),
  ])
}

/**
 * Generate content with automatic model fallback for maximum resilience
 * against 429 Quota Exceeded, timeouts, and 503 temporary service spikes.
 */
export async function generateWithFallback(
  genAI: GoogleGenerativeAI,
  prompt: string,
  options?: { jsonMode?: boolean; timeoutMs?: number }
): Promise<string> {
  let lastError: any = null
  const timeoutMs = options?.timeoutMs || 60000

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: options?.jsonMode
          ? { responseMimeType: 'application/json' }
          : undefined,
      })

      const result = await withTimeout(model.generateContent(prompt), timeoutMs)
      const text = result.response.text()
      if (text) {
        console.log(`[GEMINI] Sukses generate menggunakan model: ${modelName}`)
        return text
      }
    } catch (err: any) {
      console.warn(`[GEMINI] Model ${modelName} gagal: ${err.message}. Mencoba model alternatif...`)
      lastError = err
    }
  }

  throw lastError || new Error('Semua model Gemini mengalami kendala kuota/koneksi.')
}
