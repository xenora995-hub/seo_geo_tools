import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.5-flash',
]

/**
 * Generate content with automatic model fallback for maximum resilience
 * against 429 Quota Exceeded and 503 temporary service spikes.
 */
export async function generateWithFallback(
  genAI: GoogleGenerativeAI,
  prompt: string,
  options?: { jsonMode?: boolean }
): Promise<string> {
  let lastError: any = null

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: options?.jsonMode
          ? { responseMimeType: 'application/json' }
          : undefined,
      })

      const result = await model.generateContent(prompt)
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
