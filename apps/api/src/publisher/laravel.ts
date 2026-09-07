import axios from 'axios'

interface PublishOptions {
  tenant: { cmsUrl: string; cmsApiKey: string }
  article: { title: string; content: string; excerpt: string; keywords: string[]; imageUrl?: string | null }
  imageUrl?: string | null
  publishDate?: string | Date | null
  timezone?: string
}

export function formatPublishDateTo0800(dateInput?: string | Date | null, timezone: string = 'Asia/Makassar'): string {
  const d = dateInput ? new Date(dateInput) : new Date()
  let datePart = ''
  try {
    datePart = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d)
  } catch {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    datePart = `${year}-${month}-${day}`
  }
  return `${datePart} 08:00:00`
}

export async function publishToLaravel(options: PublishOptions) {
  const { tenant, article, publishDate, timezone = 'Asia/Makassar' } = options
  const base = tenant.cmsUrl.replace(/\/$/, '')

  let finalContent = article.content
  const publishedAt = formatPublishDateTo0800(publishDate, timezone)

  const res = await axios.post(`${base}/api/seo/posts`, {
    title: article.title,
    content: finalContent,
    excerpt: article.excerpt,
    image_url: article.imageUrl || null,
    keywords: article.keywords,
    status: 'published',
    published_at: publishedAt,
  }, {
    headers: {
      'Authorization': `Bearer ${tenant.cmsApiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  })

  return {
    id: String(res.data.post_id),
    url: res.data.post_url,
  }
}

