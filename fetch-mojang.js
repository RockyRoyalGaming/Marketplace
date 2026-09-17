const fs = require('fs');
const https = require('https');

async function fetchPage(page) {
    const url = `https://net-secondary.web.minecraft-services.net/api/v1.0/en-us/search?page=${page}&pageSize=100&sortType=Recent&category=Marketplace&geography=IN`;
    
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.minecraft.net/'
    };

    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.results || []);
                } catch (e) {
                    resolve([]);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    console.log("Starting Official Mojang Marketplace Extraction...");
    let allItems = [];
    
    // Mojang se pehle 50 pages (5,000 top items) direct extract karo
    for (let p = 1; p <= 50; p++) {
        console.log(`Fetching Page ${p} from Mojang Services...`);
        const items = await fetchPage(p);
        if (!items || items.length === 0) break;

        items.forEach(item => {
            let img = item.thumbnail || "";
            if (!img && item.images && item.images.length > 0) {
                img = item.images[0].url || item.images[0];
            }
            if (!img && item.id) {
                img = `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg`;
            }

            allItems.push({
                id: item.id || item.uuid,
                title: item.title,
                creator: item.author || "Mojang Partner",
                category: (item.packType || "addon").toLowerCase(),
                rating: item.rating ? Number(item.rating).toFixed(1) : "4.8",
                views: item.totalRatings || 1000,
                image: img,
                desc: item.description || "Official Marketplace Content"
            });
        });

        // Akamai rate-limit se bachne ke liye 200ms delay
        await new Promise(r => setTimeout(r, 200));
    }

    fs.writeFileSync('./marketplace-data.json', JSON.stringify(allItems, null, 2));
    console.log(`Successfully extracted ${allItems.length} OFFICIAL items directly from Mojang!`);
}

run();
