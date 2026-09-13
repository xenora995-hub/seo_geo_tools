import axios from 'axios'

interface PublishOptions {
  tenant: { cmsUrl: string; cmsApiKey: string }
  article: { title: string; content: string; excerpt: string; keywords: string[]; imageUrl?: string | null; author?: string }
  imageUrl?: string | null
  publishDate?: string
}

export async function publishToWordPress(options: PublishOptions) {
  const { tenant, article, publishDate } = options
  const headers = {
    'Authorization': `Basic ${tenant.cmsApiKey}`,
    'Content-Type': 'application/json',
  }
  const base = tenant.cmsUrl.replace(/\/$/, '')

  // 1. Upload gambar ke media library
  let mediaId: number | null = null
  if (article.imageUrl) {
    try {
      const imgResponse = await axios.get(article.imageUrl, { responseType: 'arraybuffer' })
      const imgBuffer = Buffer.from(imgResponse.data)
      const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)

      const mediaRes = await axios.post(`${base}/wp-json/wp/v2/media`, imgBuffer, {
        headers: {
          'Authorization': `Basic ${tenant.cmsApiKey}`,
          'Content-Type': 'image/jpeg',
          'Content-Disposition': `attachment; filename="${slug}.jpg"`,
        }
      })
      mediaId = mediaRes.data.id
    } catch (e) {
      console.warn('[WP] Gagal upload gambar, lanjut tanpa gambar')
    }
  }

  // 2. Buat post
  const postData: any = {
    title: article.title,
    content: article.content,
    excerpt: article.excerpt,
    status: 'publish',
    tags: article.keywords.slice(0, 5),
  }
  if (mediaId) postData.featured_media = mediaId
  if (publishDate) postData.date = new Date(publishDate).toISOString()

  const postRes = await axios.post(`${base}/wp-json/wp/v2/posts`, postData, { headers })

  return {
    id: String(postRes.data.id),
    url: postRes.data.link,
  }
}
