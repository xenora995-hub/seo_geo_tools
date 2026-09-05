const axios = require('axios');

async function testScraper(keyword, cleanDomain) {
  try {
    const scrapeRes = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });

    const html = scrapeRes.data;
    const searchResults = html.match(/<a[^>]+class="result__url"[^>]*href="([^"]+)"/ig) || [];
    
    let position = null;
    let foundUrl = null;
    let currentRank = 1;
    
    const allLinks = [];
    
    for (const link of searchResults) {
      const match = link.match(/href="([^"]+)"/i);
      if (match) {
        let u = match[1];
        if (u.includes('//duckduckgo.com/l/?uddg=')) {
           u = u.split('uddg=')[1].split('&')[0];
           u = decodeURIComponent(u);
        }
        
        allLinks.push({ rank: currentRank, url: u });
        
        if (link.toLowerCase().includes(cleanDomain)) {
          position = currentRank;
          foundUrl = u;
          break;
        }
        currentRank++;
      }
      if (currentRank > 20) break;
    }
    
    console.log(JSON.stringify({ keyword, position, foundUrl, allLinks }, null, 2));
  } catch (err) {
    console.error("Error scraping:", err.message);
  }
}

testScraper('bali phone repair', 'baliphonerepair.com');
