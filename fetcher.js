const fs = require('fs');
const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log("Fetching live marketplace items...");
    // Public Bedrock Catalog Feed
    const res = await fetchUrl('https://catalog.minecraftservices.com/v1.0/items?pageSize=100&sort=releaseDateDesc');
    const rawItems = res.items || [];

    const formatted = rawItems.map(item => ({
      id: item.id || item.uuid,
      title: item.title || item.name || 'Minecraft Item',
      creator: item.creatorName || 'Mojang Partner',
      category: (item.primaryCategory || 'addon').toLowerCase(),
      rating: item.averageRating ? item.averageRating.toFixed(1) : "4.6",
      thumbnail: (item.images && item.images[0]) ? (item.images[0].url || item.images[0]) : '',
      description: item.description || '',
      marketplaceUrl: `https://www.minecraft.net/en-us/marketplace/pdp?id=${item.id || item.uuid}`
    }));

    fs.writeFileSync('catalog.json', JSON.stringify(formatted, null, 2));
    console.log(`Saved ${formatted.length} items to catalog.json successfully.`);
  } catch (err) {
    console.error("Fetcher error:", err.message);
    process.exit(1);
  }
}

run();
