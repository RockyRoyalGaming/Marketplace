const fs = require('fs');
const https = require('https');

function fetchCatalog() {
  return new Promise((resolve, reject) => {
    const url = 'https://catalog.minecraftservices.com/v1.0/items?pageSize=100&sort=releaseDateDesc';
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve(parsed);
        } catch (e) {
          reject(new Error("JSON Parse failed: " + e.message));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

async function main() {
  try {
    console.log("Fetching live items...");
    const res = await fetchCatalog();
    const items = res.items || [];

    if (items.length === 0) {
      throw new Error("No items returned from endpoint");
    }

    const output = items.map(i => ({
      id: i.id || i.uuid,
      title: i.title || i.name || 'Minecraft DLC',
      creator: i.creatorName || 'Mojang Partner',
      category: (i.primaryCategory || 'addon').toLowerCase(),
      rating: i.averageRating ? i.averageRating.toFixed(1) : "4.5",
      thumbnail: (i.images && i.images[0]) ? (i.images[0].url || i.images[0]) : '',
      description: i.description || '',
      marketplaceUrl: `https://www.minecraft.net/en-us/marketplace/pdp?id=${i.id || i.uuid}`
    }));

    fs.writeFileSync('catalog.json', JSON.stringify(output, null, 2));
    console.log(`Successfully written ${output.length} items to catalog.json`);
  } catch (err) {
    console.error("Fetch error:", err.message);
    process.exit(1);
  }
}

main();
