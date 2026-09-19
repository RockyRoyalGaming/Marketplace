// --- TOOLCOIN OFFICIAL ENGINE CONFIG ---
const TOOLCOIN_WORKER_URL = 'https://damp-snowflake-b822.rockyroyalgaming.workers.dev';

// Firebase Setup
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

// Custom Shorteners
const SHORTENERS = {
    linkvertise: (id, link) => `https://link-target.net/your_id/download?url=${encodeURIComponent(link || id)}`,
    workink: (id, link) => `https://work.ink/your_id/${encodeURIComponent(link || id)}`,
    lootlabs: (id, link) => `https://loot-link.com/s?your_id=${encodeURIComponent(link || id)}`
};

let currentItems = [];
let availableDb = new Map();
let currentCategory = 'all';
let currentQuery = '';
let currentPdpItem = null;

const itemsGrid = document.getElementById('itemsGrid');
const scrollLoader = document.getElementById('scrollLoader');
const itemCountLabel = document.getElementById('itemCountLabel');
const pdpModal = document.getElementById('pdpModal');
const sideDrawer = document.getElementById('sideDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const downloadToast = document.getElementById('downloadToast');

window.onload = function() {
    loadAvailableDatabase();
    loadLivePlayFabCatalog();
};

function toggleDrawer() {
    if (sideDrawer) sideDrawer.classList.toggle('active');
    if (drawerOverlay) drawerOverlay.classList.toggle('active');
}

// 1. Firebase Available DB (Checkmark & Mirrors)
function loadAvailableDatabase() {
    database.ref('market_items').on('value', snapshot => {
        availableDb.clear();
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                let data = child.val();
                let uuid = (data.uuid || data.id || child.key).toLowerCase();
                availableDb.set(uuid, data);
            });
        }
        renderCatalog();
    });
}

// 2. Direct Official PlayFab Fetch (Catalog/Search)
async function loadLivePlayFabCatalog() {
    if (scrollLoader) scrollLoader.style.display = 'block';
    
    try {
        let endpoint = `${TOOLCOIN_WORKER_URL}?category=${encodeURIComponent(currentCategory)}&search=${encodeURIComponent(currentQuery)}`;
        const res = await fetch(endpoint);
        const rawItems = await res.json();

        currentItems = (Array.isArray(rawItems) ? rawItems : []).map(item => {
            // PlayFab Catalog v2 Images extraction
            let thumbUrl = `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.Id}/Thumbnail_0.jpg`;
            if (Array.isArray(item.Images) && item.Images.length > 0) {
                const found = item.Images.find(i => i.Tag === 'Thumbnail') || item.Images[0];
                if (found && found.Url) thumbUrl = found.Url;
            }

            let priceCoins = 830;
            if (item.PriceOptions?.Prices?.[0]?.Amounts?.[0]) {
                priceCoins = item.PriceOptions.Prices[0].Amounts[0].Amount;
            }

            return {
                id: item.Id,
                title: item.Title?.['NEUTRAL'] || item.Title?.['en-US'] || "Minecraft DLC",
                creator: item.CreatorEntityKey?.Id || item.Tags?.[0] || "Mojang Partner",
                category: currentCategory === 'all' ? 'addons' : currentCategory,
                rating: item.Rating?.Average ? Number(item.Rating.Average).toFixed(1) : "4.8",
                votes: item.Rating?.TotalRatingsCount || 19,
                desc: item.Description?.['NEUTRAL'] || item.Description?.['en-US'] || "Official Marketplace content.",
                image: thumbUrl,
                coins: priceCoins,
                images: item.Images || []
            };
        });

        if (itemCountLabel) {
            itemCountLabel.innerText = `${currentItems.length} ITEMS LOADED`;
        }

        renderCatalog();

    } catch (err) {
        console.error("Live PlayFab Error:", err);
    } finally {
        if (scrollLoader) scrollLoader.style.display = 'none';
    }
}

// 3. Render Cards with Checkmark / Unavailable Badge
function renderCatalog() {
    if (!itemsGrid) return;
    itemsGrid.innerHTML = "";

    if (currentItems.length === 0) {
        itemsGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#9ca3af;padding:30px;">No items returned by PlayFab.</p>`;
        return;
    }

    currentItems.forEach(item => {
        let isAvail = availableDb.has(String(item.id).toLowerCase());
        
        let badgeHtml = isAvail 
            ? `<div class="available-badge"><i class="fas fa-check"></i></div>` 
            : `<div class="unavailable-overlay"><i class="fas fa-ban"></i><span>Unavailable</span></div>`;

        let card = document.createElement('div');
        card.className = "item-card";
        card.innerHTML = `
            <div class="thumb-holder">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.src='https://placehold.co/300x170/171420/a855f7?text=PlayFab+DLC'">
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
}

// 4. Filters & Search Navigation
function navigateCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.drawer-item').forEach(d => d.classList.remove('active'));

    if (event && event.target) {
        event.target.closest('.chip')?.classList.add('active');
        event.target.closest('.drawer-item')?.classList.add('active');
    }

    if (sideDrawer && sideDrawer.classList.contains('active')) toggleDrawer();
    loadLivePlayFabCatalog();
}

let searchTimeout = null;
function handleSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentQuery = document.getElementById('globalSearch').value.trim();
        loadLivePlayFabCatalog();
    }, 400);
}

// 5. PDP Modal with Toolcoin Tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-body').forEach(t => t.style.display = 'none');

    if (event && event.target) event.target.closest('.tab-btn')?.classList.add('active');

    if (tabName === 'desc') document.getElementById('tabDesc').style.display = 'block';
    if (tabName === 'howto') document.getElementById('tabHowTo').style.display = 'block';
    if (tabName === 'faq') document.getElementById('tabFaq').style.display = 'block';
}

function openPdp(item) {
    currentPdpItem = item;
    document.getElementById('pdpTitle').innerText = item.title;
    document.getElementById('pdpDescription').innerText = item.desc;
    document.getElementById('pdpStars').innerText = `★ ${item.rating}`;
    document.getElementById('pdpVotes').innerText = `(${item.votes})`;
    document.getElementById('pdpCoins').innerText = `🪙 ${item.coins}`;

    const stage = document.getElementById('pdpStage');
    const thumbs = document.getElementById('pdpThumbs');
    stage.innerHTML = `<img src="${item.image}">`;
    thumbs.innerHTML = "";

    // Screenshots carousel
    if (Array.isArray(item.images) && item.images.length > 0) {
        item.images.forEach((imgObj, idx) => {
            let t = document.createElement('div');
            t.className = `pdp-thumb ${idx === 0 ? 'active' : ''}`;
            t.innerHTML = `<img src="${imgObj.Url}">`;
            t.onclick = () => {
                stage.innerHTML = `<img src="${imgObj.Url}">`;
                thumbs.querySelectorAll('.pdp-thumb').forEach(el => el.classList.remove('active'));
                t.classList.add('active');
            };
            thumbs.appendChild(t);
        });
    }

    // Availability Action Check
    let isAvail = availableDb.has(String(item.id).toLowerCase());
    const dlBox = document.getElementById('downloadContainer');
    const reqBox = document.getElementById('unavailableContainer');
    const linksList = document.getElementById('shortenerLinks');

    if (isAvail) {
        let availData = availableDb.get(String(item.id).toLowerCase());
        let directUrl = (availData.fileBlocks && availData.fileBlocks[0]?.mainLink?.url) || "";

        linksList.innerHTML = `
            <a href="${SHORTENERS.linkvertise(item.id, directUrl)}" target="_blank" onclick="simulateDownload('${item.title}')" class="short-btn linkvertise">
                <span><i class="fas fa-bolt"></i> Download via Linkvertise</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.workink(item.id, directUrl)}" target="_blank" onclick="simulateDownload('${item.title}')" class="short-btn workink">
                <span><i class="fas fa-download"></i> Download via Work.ink</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.lootlabs(item.id, directUrl)}" target="_blank" onclick="simulateDownload('${item.title}')" class="short-btn lootlabs">
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

// 6. Download Toast
function simulateDownload(name) {
    closePdp();
    document.getElementById('toastItemName').innerText = name;
    document.getElementById('toastStatusText').innerText = "Downloading from mirror...";
    downloadToast.classList.add('active');

    let pct = 0;
    let totalMb = (Math.random() * 20 + 8).toFixed(1);
    let bar = document.getElementById('toastBar');
    let nums = document.getElementById('toastProgressNums');

    let interval = setInterval(() => {
        pct += 5;
        let currMb = ((pct / 100) * totalMb).toFixed(1);
        bar.style.width = pct + "%";
        nums.innerText = `${currMb} MB / ${totalMb} MB (${pct}%)`;

        if (pct >= 100) {
            clearInterval(interval);
            document.getElementById('toastStatusText').innerText = "Downloaded & Ready!";
            setTimeout(() => { downloadToast.classList.remove('active'); }, 2500);
        }
    }, 200);
}

function closeToast() {
    downloadToast.classList.remove('active');
}

function submitRequest() {
    if (!currentPdpItem) return;
    let name = prompt("Enter your Name or Discord ID to request:");
    if (!name) return;

    database.ref('requests').push().set({
        addon: currentPdpItem.title,
        link: `https://www.minecraft.net/en-us/marketplace/pdp?id=${currentPdpItem.id}`,
        user: name,
        status: "pending",
        timestamp: Date.now()
    }).then(() => {
        alert("✅ Request sent to Admin!");
        closePdp();
    });
}
