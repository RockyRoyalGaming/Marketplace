// --- CLOUDFLARE WORKER ENDPOINT ---
const PLAYFAB_WORKER = 'https://shy-wind-42b7.rockyroyalgaming.workers.dev';

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

// --- MONETIZATION SHORTENERS CONFIG ---
const SHORTENERS = {
    linkvertise: (id, link) => `https://link-target.net/your_id/download?url=${encodeURIComponent(link || id)}`,
    workink: (id, link) => `https://work.ink/your_id/${encodeURIComponent(link || id)}`,
    lootlabs: (id, link) => `https://loot-link.com/s?your_id=${encodeURIComponent(link || id)}`
};

let fullCatalog = [];
let availableDb = new Map();
let currentCategory = 'all';
let searchQuery = '';
let nextContinuationToken = null;
let isFetching = false;
let currentModalItem = null;

const itemsGrid = document.getElementById('itemsGrid');
const scrollLoader = document.getElementById('scrollLoader');
const itemCountLabel = document.getElementById('itemCountLabel');
const pdpModal = document.getElementById('pdpModal');
const sideDrawer = document.getElementById('sideDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

window.onload = function() {
    loadKeysDatabase();
    fetchNextBatch(true);
};

function toggleDrawer() {
    if (sideDrawer) sideDrawer.classList.toggle('active');
    if (drawerOverlay) drawerOverlay.classList.toggle('active');
}

// 1. Firebase Availability Check (Toolcoin is_key_available replication)
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
        document.querySelectorAll('.item-card').forEach(updateCardBadge);
    });
}

function updateCardBadge(card) {
    const uuid = card.dataset.uuid;
    const isAvail = availableDb.has(uuid);
    const existing = card.querySelector('.available-badge, .unavailable-overlay');
    if (existing) existing.remove();

    const holder = card.querySelector('.thumb-holder');
    if (!holder) return;

    if (isAvail) {
        const b = document.createElement('div');
        b.className = 'available-badge';
        b.innerHTML = '<i class="fas fa-check"></i>';
        holder.appendChild(b);
    } else {
        const o = document.createElement('div');
        o.className = 'unavailable-overlay';
        o.innerHTML = '<i class="fas fa-ban"></i><span>Unavailable</span>';
        holder.appendChild(o);
    }
}

// 2. PlayFab Continuous Stream Catalog Fetch
async function fetchNextBatch(reset = false) {
    if (isFetching) return;
    isFetching = true;
    if (scrollLoader) scrollLoader.style.display = 'block';

    if (reset) {
        nextContinuationToken = null;
        fullCatalog = [];
        if (itemsGrid) itemsGrid.innerHTML = '';
    }

    try {
        let url = `${PLAYFAB_WORKER}?category=${encodeURIComponent(currentCategory)}&search=${encodeURIComponent(searchQuery)}&count=50`;
        if (nextContinuationToken) {
            url += `&token=${encodeURIComponent(nextContinuationToken)}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        nextContinuationToken = data.continuationToken || null;

        if (items.length > 0) {
            if (reset && items[0]) {
                updateSpotlightBanner(items[0]);
            }
            renderItems(items);
        }

        if (itemCountLabel) {
            itemCountLabel.innerText = `${fullCatalog.length.toLocaleString()} ITEMS LOADED`;
        }

        // Auto-stream agle items jab tak screen fill na ho jaaye
        if (reset && nextContinuationToken && fullCatalog.length < 100) {
            setTimeout(() => { isFetching = false; fetchNextBatch(false); }, 300);
            return;
        }

    } catch (err) {
        console.error("PlayFab Stream Error:", err);
    } finally {
        isFetching = false;
        if (scrollLoader) scrollLoader.style.display = 'none';
    }
}

// 3. Dynamic Spotlight Card
function updateSpotlightBanner(firstItem) {
    const card = document.getElementById('spotlightCard');
    if (!card) return;

    let title = getItemTitle(firstItem);
    let creator = getItemCreator(firstItem);
    let thumb = getValidThumb(firstItem);

    card.style.background = `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(13,12,18,0.95) 100%), url('${thumb}') center/cover`;
    const h2 = card.querySelector('h2');
    const p = card.querySelector('p');
    if (h2) h2.innerText = title;
    if (p) p.innerText = `By ${creator}`;
    card.onclick = () => openPdp(firstItem);
}

// 4. Safe Image & Metadata Parsers (Filtering Panoramas)
function getValidThumb(item) {
    if (Array.isArray(item.Images) && item.Images.length > 0) {
        const nonPano = item.Images.find(i => i.Tag === 'Thumbnail' || i.Tag === 'KeyArt');
        if (nonPano && nonPano.Url) return nonPano.Url;
        const screen = item.Images.find(i => i.Tag !== 'Panorama');
        if (screen && screen.Url) return screen.Url;
    }
    return `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.Id}/Thumbnail_0.jpg`;
}

function getItemTitle(item) {
    if (!item.Title) return "Minecraft Pack";
    return item.Title['neutral'] || item.Title['NEUTRAL'] || item.Title['en-US'] || Object.values(item.Title)[0] || "Minecraft Pack";
}

function getItemCreator(item) {
    return item.CreatorEntityKey?.Id || (item.Tags && item.Tags[0]) || "Mojang Partner";
}

// 5. Render Grid Cards
function renderItems(items) {
    if (!itemsGrid) return;

    items.forEach(item => {
        fullCatalog.push(item);
        const uuid = String(item.Id).toLowerCase();
        const title = getItemTitle(item);
        const creator = getItemCreator(item);
        const thumb = getValidThumb(item);

        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.uuid = uuid;

        card.innerHTML = `
            <div class="thumb-holder">
                <img src="${thumb}" alt="${title}" loading="lazy" onerror="this.src='https://placehold.co/300x170/171420/a855f7?text=Minecraft+DLC'">
            </div>
            <div class="item-card-body">
                <h4 class="card-title">${title}</h4>
                <div class="card-creator">By ${creator}</div>
            </div>
        `;

        updateCardBadge(card);
        card.onclick = () => openPdp(item);
        itemsGrid.appendChild(card);
    });
}

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 900) {
        if (nextContinuationToken && !isFetching) {
            fetchNextBatch(false);
        }
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
    fetchNextBatch(true);
}

let searchTimer = null;
function handleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchQuery = document.getElementById('globalSearch').value.trim();
        fetchNextBatch(true);
    }, 400);
}

// 6. PDP Modal with Real Details
function openPdp(item) {
    currentModalItem = item;
    const uuid = String(item.Id).toLowerCase();
    const title = getItemTitle(item);
    
    let desc = "Official Minecraft Marketplace DLC.";
    if (item.Description) {
        desc = item.Description['neutral'] || item.Description['NEUTRAL'] || item.Description['en-US'] || Object.values(item.Description)[0] || desc;
    }

    const rating = item.Rating?.Average ? Number(item.Rating.Average).toFixed(1) : "4.8";
    const votes = item.Rating?.TotalRatingsCount || 0;
    const coins = item.PriceOptions?.Prices?.[0]?.Amounts?.[0]?.Amount || 830;

    document.getElementById('pdpTitle').innerText = title;
    document.getElementById('pdpDescription').innerText = desc;
    document.getElementById('pdpStars').innerText = `★ ${rating}`;
    document.getElementById('pdpVotes').innerText = `(${votes})`;
    document.getElementById('pdpCoins').innerText = `🪙 ${coins}`;

    // Real Metadata
    const version = item.DisplayProperties?.package_version || "v1.0.0";
    const date = item.CreationDate ? item.CreationDate.split('T')[0] : "2026-09-01";
    document.getElementById('pdpVersion').innerText = `# ${version}`;
    document.getElementById('pdpDate').innerHTML = `<i class="far fa-calendar-alt"></i> ${date}`;

    // Exclude Panoramas from Main Viewer
    const stage = document.getElementById('pdpStage');
    const thumbs = document.getElementById('pdpThumbs');
    thumbs.innerHTML = '';

    let galleryImages = [];
    if (Array.isArray(item.Images) && item.Images.length > 0) {
        galleryImages = item.Images.filter(img => img.Tag !== 'Panorama');
    }
    if (galleryImages.length === 0) {
        galleryImages.push({ Url: getValidThumb(item) });
    }

    stage.innerHTML = `<img src="${galleryImages[0].Url}" alt="preview">`;

    galleryImages.forEach((imgObj, idx) => {
        let t = document.createElement('div');
        t.className = `pdp-thumb ${idx === 0 ? 'active' : ''}`;
        t.innerHTML = `<img src="${imgObj.Url}">`;
        t.onclick = () => {
            stage.innerHTML = `<img src="${imgObj.Url}" alt="preview">`;
            thumbs.querySelectorAll('.pdp-thumb').forEach(el => el.classList.remove('active'));
            t.classList.add('active');
        };
        thumbs.appendChild(t);
    });

    // Available vs Request Box
    const isAvail = availableDb.has(uuid);
    const dlBox = document.getElementById('downloadContainer');
    const reqBox = document.getElementById('unavailableContainer');
    const linksList = document.getElementById('shortenerLinks');

    if (isAvail) {
        let availData = availableDb.get(uuid);
        let directUrl = availData.fileBlocks?.[0]?.mainLink?.url || "";

        linksList.innerHTML = `
            <a href="${SHORTENERS.linkvertise(uuid, directUrl)}" target="_blank" class="short-btn linkvertise">
                <span><i class="fas fa-bolt"></i> Download via Linkvertise</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.workink(uuid, directUrl)}" target="_blank" class="short-btn workink">
                <span><i class="fas fa-download"></i> Download via Work.ink</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.lootlabs(uuid, directUrl)}" target="_blank" class="short-btn lootlabs">
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

    let title = getItemTitle(currentModalItem);

    database.ref('requests').push().set({
        addon: title,
        link: `https://www.minecraft.net/en-us/marketplace/pdp?id=${currentModalItem.Id}`,
        user: name,
        status: "pending",
        timestamp: Date.now()
    }).then(() => {
        alert("✅ Request sent to Admin!");
        closePdp();
    });
}
