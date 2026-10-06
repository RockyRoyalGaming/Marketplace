// --- STRIKE MARKET FULL-CATALOG CORE ENGINE ---
const PLAYFAB_WORKER = 'https://shy-wind-42b7.rockyroyalgaming.workers.dev';
const MASTER_CATALOG_URL = 'https://raw.githubusercontent.com/bedrock-dot-dev/packs/master/marketplace_manifest.json';
const BACKUP_CATALOG_CDN = 'https://cdn.jsdelivr.net/gh/bedrock-dot-dev/packs@master/marketplace_manifest.json';

// --- FIREBASE REALTIME DATABASE CONFIGURATION ---
var firebaseConfig = {
  apiKey: "AIzaSyDOnkkfPgIX9rlEXefUKnZ3atV6zdBu1RU",
  authDomain: "strikemarket-32a5e.firebaseapp.com",
  databaseURL: "https://strikemarket-32a5e-default-rtdb.firebaseio.com",
  projectId: "strikemarket-32a5e",
  storageBucket: "strikemarket-32a5e.firebasestorage.app",
  messagingSenderId: "719596182121",
  appId: "1:719596182121:web:d02dfdd3089f560fc560f8",
  measurementId: "G-KTVM3J2491"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
var database = firebase.database();

// Monetization Shorteners
const SHORTENERS = {
    linkvertise: (id, link) => `https://link-target.net/your_id/download?url=${encodeURIComponent(link || id)}`,
    workink: (id, link) => `https://work.ink/your_id/${encodeURIComponent(link || id)}`,
    lootlabs: (id, link) => `https://loot-link.com/s?your_id=${encodeURIComponent(link || id)}`
};

let masterCatalog = [];
let filteredCatalog = [];
let availableDb = new Map();
let currentCategory = 'all';
let currentSearch = '';
let renderedCount = 0;
const PAGE_CHUNK = 40;
let isRendering = false;
let currentModalItem = null;

const itemsGrid = document.getElementById('itemsGrid');
const scrollLoader = document.getElementById('scrollLoader');
const itemCountLabel = document.getElementById('itemCountLabel');
const pdpModal = document.getElementById('pdpModal');
const sideDrawer = document.getElementById('sideDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

window.onload = function() {
    loadKeysDatabase();
    initFullCatalog();
};

function toggleDrawer() {
    if (sideDrawer) sideDrawer.classList.toggle('active');
    if (drawerOverlay) drawerOverlay.classList.toggle('active');
}

// 1. Firebase Available Keys Sync
function loadKeysDatabase() {
    database.ref('market_items').on('value', snapshot => {
        availableDb.clear();
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                let data = child.val();
                let uuid = (data.uuid || data.id || child.key).toLowerCase();
                availableDb.set(uuid, data);
            });
        }
        renderNextBatch(true);
    });
}

// 2. Full Catalog Loader (Fast IndexedDB + Real Metadata)
const DB_NAME = 'strike_market_meta_v9';
const STORE_NAME = 'catalog_items';

function openLocalDB() {
    return new Promise((resolve) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

async function getCachedCatalog() {
    try {
        const db = await openLocalDB();
        if (!db) return null;
        return new Promise(resolve => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).get('full_data');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}

async function setCachedCatalog(data) {
    try {
        const db = await openLocalDB();
        if (!db) return;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(data, 'full_data');
    } catch {}
}

async function initFullCatalog() {
    if (scrollLoader) scrollLoader.style.display = 'block';

    // 1. Local Cache Check
    const cached = await getCachedCatalog();
    if (cached && Array.isArray(cached) && cached.length > 5000) {
        masterCatalog = cached;
        applyFilters();
        if (scrollLoader) scrollLoader.style.display = 'none';
        return;
    }

    // 2. Direct Official Pipeline Fetch
    try {
        let res = await fetch(MASTER_CATALOG_URL);
        if (!res.ok) res = await fetch(BACKUP_CATALOG_CDN);
        
        const raw = await res.json();
        const items = Array.isArray(raw) ? raw : (raw.items || raw.packs || []);

        masterCatalog = items.map(item => {
            const id = (item.id || item.uuid || "").toLowerCase();
            let cat = (item.category || item.type || item.packType || 'addon').toLowerCase();
            if (cat.includes('world')) cat = 'worlds';
            else if (cat.includes('skin')) cat = 'skins';
            else if (cat.includes('texture')) cat = 'textures';
            else cat = 'addons';

            // High-res CDN image with safe fallback
            let thumb = item.thumbnail || item.image || item.keyArt || `https://xforgeassets001.xboxlive.com/serviceid-15954734-${id}/Thumbnail_0.jpg`;
            if (thumb.startsWith('http://')) thumb = thumb.replace('http://', 'https://');

            return {
                id: id,
                title: item.title || item.name || "Minecraft DLC",
                creator: item.creator || item.creatorName || item.author || "Mojang Creator",
                category: cat,
                rating: item.rating ? Number(item.rating).toFixed(1) : "4.8",
                votes: item.totalRatings || item.votes || 42,
                coins: item.coins || item.price || 830,
                desc: item.description || item.desc || "Official Minecraft Bedrock Marketplace content.",
                image: thumb,
                gallery: item.images || item.screenshots || [thumb],
                version: item.version || "1.0.0",
                date: item.releaseDate || item.date || "2026-08-15"
            };
        });

        setCachedCatalog(masterCatalog);
        applyFilters();

    } catch (err) {
        console.error("Master catalog load failed, falling back to PlayFab worker:", err);
        fetchFromWorkerFallback();
    } finally {
        if (scrollLoader) scrollLoader.style.display = 'none';
    }
}

async function fetchFromWorkerFallback() {
    try {
        const res = await fetch(`${PLAYFAB_WORKER}?count=100`);
        const json = await res.json();
        if (json.items) {
            masterCatalog = json.items.map(i => {
                const id = String(i.Id).toLowerCase();
                let title = i.Title ? (i.Title['neutral'] || i.Title['en-US'] || Object.values(i.Title)[0]) : "Minecraft Pack";
                let thumb = `https://xforgeassets001.xboxlive.com/serviceid-15954734-${id}/Thumbnail_0.jpg`;
                return {
                    id: id,
                    title: title,
                    creator: i.Tags?.[0] || "Mojang Partner",
                    category: 'addons',
                    rating: "4.8",
                    votes: 18,
                    coins: 830,
                    desc: i.Description ? (i.Description['neutral'] || i.Description['en-US'] || Object.values(i.Description)[0]) : "Minecraft DLC",
                    image: thumb,
                    gallery: [thumb],
                    version: "1.0.0",
                    date: "2026-08-15"
                };
            });
            applyFilters();
        }
    } catch (e) {
        console.error("Worker fallback failed:", e);
    }
}

// 3. Dynamic Filter & Search
function applyFilters() {
    filteredCatalog = masterCatalog.filter(item => {
        const matchCat = (currentCategory === 'all') || (item.category === currentCategory);
        const matchSearch = !currentSearch || 
            item.title.toLowerCase().includes(currentSearch) || 
            item.creator.toLowerCase().includes(currentSearch);
        return matchCat && matchSearch;
    });

    if (itemCountLabel) {
        itemCountLabel.innerText = `${filteredCatalog.length.toLocaleString()} ITEMS LOADED`;
    }

    if (filteredCatalog.length > 0) {
        updateSpotlight(filteredCatalog[0]);
    }

    renderNextBatch(true);
}

function updateSpotlight(topItem) {
    const card = document.getElementById('spotlightCard');
    if (!card) return;

    card.style.background = `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(13,12,18,0.95) 100%), url('${topItem.image}') center/cover`;
    const h2 = card.querySelector('h2');
    const p = card.querySelector('p');
    if (h2) h2.innerText = topItem.title;
    if (p) p.innerText = `By ${topItem.creator}`;
    card.onclick = () => openPdp(topItem);
}

// 4. Render Grid Items with High-Performance Batching
function renderNextBatch(reset = false) {
    if (!itemsGrid) return;

    if (reset) {
        renderedCount = 0;
        itemsGrid.innerHTML = '';
    }

    if (isRendering || renderedCount >= filteredCatalog.length) return;
    isRendering = true;

    const slice = filteredCatalog.slice(renderedCount, renderedCount + PAGE_CHUNK);

    slice.forEach(item => {
        const isAvail = availableDb.has(item.id);
        const badgeHtml = isAvail 
            ? `<div class="available-badge"><i class="fas fa-check"></i></div>` 
            : `<div class="unavailable-overlay"><i class="fas fa-ban"></i><span>Unavailable</span></div>`;

        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="thumb-holder">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/300x170/171420/a855f7?text=Minecraft+DLC'">
                ${badgeHtml}
            </div>
            <div class="item-card-body">
                <h4 class="card-title">${item.title}</h4>
                <div class="card-creator">By ${item.creator}</div>
            </div>
        `;

        card.onclick = () => openPdp(item);
        itemsGrid.appendChild(card);
    });

    renderedCount += slice.length;
    isRendering = false;
}

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 800) {
        renderNextBatch(false);
    }
}, { passive: true });

function navigateCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.drawer-item').forEach(d => d.classList.remove('active'));

    if (event && event.target) {
        event.target.closest('.chip')?.classList.add('active');
        event.target.closest('.drawer-item')?.classList.add('active');
    }

    if (sideDrawer && sideDrawer.classList.contains('active')) toggleDrawer();
    applyFilters();
}

let debounce = null;
function handleSearch() {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
        currentSearch = document.getElementById('globalSearch').value.toLowerCase().trim();
        applyFilters();
    }, 300);
}

// 5. Rich PDP Modal (Photos, Desc, HowTo, FAQ, Mirrors)
function openPdp(item) {
    currentModalItem = item;

    document.getElementById('pdpTitle').innerText = item.title;
    document.getElementById('pdpDescription').innerText = item.desc;
    document.getElementById('pdpStars').innerText = `★ ${item.rating}`;
    document.getElementById('pdpVotes').innerText = `(${item.votes})`;
    document.getElementById('pdpCoins').innerText = `🪙 ${item.coins}`;
    document.getElementById('pdpVersion').innerText = `# v${item.version}`;
    document.getElementById('pdpDate').innerHTML = `<i class="far fa-calendar-alt"></i> ${item.date}`;

    // Clean Stage & Gallery
    const stage = document.getElementById('pdpStage');
    const thumbs = document.getElementById('pdpThumbs');
    stage.innerHTML = `<img src="${item.image}" alt="${item.title}" onerror="this.src='https://placehold.co/400x225/171420/a855f7?text=DLC+Preview'">`;
    thumbs.innerHTML = '';

    const validImages = Array.isArray(item.gallery) && item.gallery.length > 0 ? item.gallery : [item.image];
    validImages.forEach((imgUrl, idx) => {
        let t = document.createElement('div');
        t.className = `pdp-thumb ${idx === 0 ? 'active' : ''}`;
        t.innerHTML = `<img src="${imgUrl}" onerror="this.src='https://placehold.co/60x60/171420/a855f7?text=DLC'">`;
        t.onclick = () => {
            stage.innerHTML = `<img src="${imgUrl}">`;
            thumbs.querySelectorAll('.pdp-thumb').forEach(el => el.classList.remove('active'));
            t.classList.add('active');
        };
        thumbs.appendChild(t);
    });

    // Check Availability
    const isAvail = availableDb.has(item.id);
    const dlBox = document.getElementById('downloadContainer');
    const reqBox = document.getElementById('unavailableContainer');
    const linksList = document.getElementById('shortenerLinks');

    if (isAvail) {
        let availData = availableDb.get(item.id);
        let directUrl = availData.fileBlocks?.[0]?.mainLink?.url || "";

        linksList.innerHTML = `
            <a href="${SHORTENERS.linkvertise(item.id, directUrl)}" target="_blank" class="short-btn linkvertise">
                <span><i class="fas fa-bolt"></i> Download via Linkvertise</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.workink(item.id, directUrl)}" target="_blank" class="short-btn workink">
                <span><i class="fas fa-download"></i> Download via Work.ink</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.lootlabs(item.id, directUrl)}" target="_blank" class="short-btn lootlabs">
                <span><i class="fas fa-gift"></i> Download via Lootlabs</span>
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        dlBox.style.display = 'block';
        reqBox.style.display = 'none';
    } else {
        dlBox.style.display = 'none';
        reqBox.style.display = 'block';
    }

    pdpModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePdp() {
    pdpModal.style.display = 'none';
    document.body.style.overflow = '';
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-body').forEach(t => t.style.display = 'none');

    if (event && event.target) event.target.closest('.tab-btn')?.classList.add('active');

    if (tabName === 'desc') document.getElementById('tabDesc').style.display = 'block';
    if (tabName === 'howto') document.getElementById('tabHowTo').style.display = 'block';
    if (tabName === 'faq') document.getElementById('tabFaq').style.display = 'block';
}

function submitRequest() {
    if (!currentModalItem) return;
    let name = prompt("Enter your Name or Discord ID to request this pack:");
    if (!name) return;

    database.ref('requests').push().set({
        addon: currentModalItem.title,
        link: `https://www.minecraft.net/en-us/marketplace/pdp?id=${currentModalItem.id}`,
        user: name,
        status: "pending",
        timestamp: Date.now()
    }).then(() => {
        alert("✅ Request sent to Admin!");
        closePdp();
    });
}
