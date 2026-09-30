import axios from 'axios'
import { google } from 'googleapis'

export interface IndexResult {
  engine: string
  success: boolean
  status?: number
  message?: string
}

/**
 * Pushes URLs to Microsoft Bing and IndexNow protocol (used by ChatGPT Search & Yandex)
 */
export async function pingIndexNow(params: {
  host: string
  urlList: string[]
  key?: string
}): Promise<IndexResult[]> {
  const cleanHost = params.host.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()
  const key = params.key || '4c3b28b78912443a9d94943fcf13db1b'
  const urls = Array.from(new Set(params.urlList.filter(Boolean)))

  if (urls.length === 0) return []

  const payload = {
    host: cleanHost,
    key: key,
    keyLocation: `https://${cleanHost}/${key}.txt`,
    urlList: urls
  }

  const results: IndexResult[] = []

  // 1. Universal IndexNow API (Bing, Yandex, Seznam, Naver)
  try {
    const res = await axios.post('https://api.indexnow.org/indexnow', payload, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      timeout: 8000
    })
    console.log(`[INDEXNOW] ✅ Universal Gateway accepted ${urls.length} URLs for ${cleanHost} (Status: ${res.status})`)
    results.push({ engine: 'IndexNow (Bing / ChatGPT Search)', success: true, status: res.status })
  } catch (err: any) {
    const status = err.response?.status
    console.warn(`[INDEXNOW] Universal gateway status: ${status || err.message}`)
    // If 200 or 202, consider success
    if (status === 200 || status === 202) {
      results.push({ engine: 'IndexNow (Bing / ChatGPT Search)', success: true, status })
    } else {
      // Fallback directly to Bing IndexNow endpoint
      try {
        const bingRes = await axios.post('https://www.bing.com/indexnow', payload, {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          timeout: 8000
        })
        console.log(`[INDEXNOW] ✅ Bing direct accepted ${urls.length} URLs for ${cleanHost} (Status: ${bingRes.status})`)
        results.push({ engine: 'Bing IndexNow Direct', success: true, status: bingRes.status })
      } catch (bErr: any) {
        results.push({ engine: 'IndexNow', success: false, message: bErr.message })
      }
    }
  }

  return results
}

/**
 * Meminta Google untuk mengindeks URL baru secara instan
 * @param url URL artikel yang baru dipublikasikan
 * @param serviceAccountJsonString JSON credential dari Google Cloud (harus memiliki akses ke GSC)
 */
export async function pingGoogleIndexing(url: string, serviceAccountJsonString: string) {
  try {
    const credentials = JSON.parse(serviceAccountJsonString)
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    })

    const indexing = google.indexing({
      version: 'v3',
      auth,
    })

    const res = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: 'URL_UPDATED',
      },
    })

    console.log(`[INDEXING API] Berhasil menembak URL ke Google: ${url}`)
    return res.data
  } catch (error: any) {
    console.error(`[INDEXING API ERROR] Gagal mengindeks ${url}:`, error.message)
    throw error
  }
}

/**
 * Multi-Engine Automated Pinger (IndexNow + Google)
 */
export async function pingAllEngines(params: {
  urls: string[]
  host: string
  googleServiceAccountJson?: string | null
}): Promise<IndexResult[]> {
  const results: IndexResult[] = []

  // 1. IndexNow for Bing / ChatGPT Search
  try {
    const indexNowResults = await pingIndexNow({
      host: params.host,
      urlList: params.urls
    })
    results.push(...indexNowResults)
  } catch (e: any) {
    results.push({ engine: 'IndexNow', success: false, message: e.message })
  }

  // 2. Google Indexing if JSON key configured
  if (params.googleServiceAccountJson) {
    for (const url of params.urls) {
      try {
        await pingGoogleIndexing(url, params.googleServiceAccountJson)
        results.push({ engine: 'Google Indexing API', success: true, message: `Pinged ${url}` })
      } catch (gErr: any) {
        results.push({ engine: 'Google Indexing API', success: false, message: gErr.message })
      }
    }
  }

  return results
}
