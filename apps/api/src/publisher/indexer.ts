import { google } from 'googleapis'

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
