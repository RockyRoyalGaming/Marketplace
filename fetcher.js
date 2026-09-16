const admin = require('firebase-admin');
const axios = require('axios');

// Firebase Admin Initialize
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://strikemarket-32a5e-default-rtdb.firebaseio.com"
});

const db = admin.database();

async function syncMarketplace() {
  console.log("Fetching latest items from Minecraft Marketplace...");
  try {
    // Official Discovery Search API (Bedrock Catalog)
    const response = await axios.get('https://catalog.minecraftservices.com/v1.0/items?pageSize=40&sort=releaseDateDesc', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const items = response.data.items || [];
    console.log(`Found ${items.length} items. Updating Firebase...`);

    const ref = db.ref('marketplace_catalog');
    
    for (const item of items) {
      const id = item.id || item.uuid;
      if (!id) continue;

      const itemData = {
        id: id,
        title: item.title || item.name || 'Untitled Addon',
        creator: item.creatorName || 'Mojang Partner',
        category: (item.primaryCategory || 'addon').toLowerCase(),
        rating: item.averageRating ? item.averageRating.toFixed(1) : "4.5",
        thumbnail: (item.images && item.images[0]) ? (item.images[0].url || item.images[0]) : '',
        description: item.description || '',
        marketplaceUrl: `https://www.minecraft.net/en-us/marketplace/pdp?id=${id}`,
        updatedAt: Date.now()
      };

      // Har item ko uske unique ID ke saath update/add karo
      await ref.child(id).set(itemData);
    }

    console.log("✅ Successfully synced latest Marketplace items to Firebase!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync Error:", error.message);
    process.exit(1);
  }
}

syncMarketplace();
