// Worker URL configured to route to official PlayFab
const PLAYFAB_WORKER = 'https://damp-snowflake-b822.rockyroyalgaming.workers.dev';

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

// Monetization Shorteners
const SHORTENERS = {
    linkvertise: (id, link) => `https://link-target.net/your_id/download?url=${encodeURIComponent(link || id)}`,
    workink: (id, link) => `https://work.ink/your_id/${encodeURIComponent(link || id)}`,
    lootlabs: (id, link) => `https://loot-link.com/s?your_id=${encodeURIComponent(link || id)}`
};

let availableDb = new Map();
let currentCategory = 'all';
let searchQuery = '';
let nextContinuationToken = null;
let isLoading = false;
let currentModalItem = null;

const itemsGrid = document.getElementById('itemsGrid');
const scrollLoader = document.getElementById('scrollLoader');
const itemCountLabel = document.getElementById('itemCountLabel');
const pdpModal = document.getElementById('pdpModal');
const sideDrawer = document.getElementById('sideDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

window.onload = function() {
    loadKeysDatabase();
    fetchLiveCatalog(true);
};

function toggleDrawer() {
    if (sideDrawer) sideDrawer.classList.toggle('active');
    if (drawerOverlay) drawerOverlay.classList.toggle('active');
}

// Keys Manager Check (Replicating is_key_available logic)
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
        document.querySelectorAll('.item-card').forEach(updateCardAvailability);
    });
}

function updateCardAvailability(card) {
    const uuid = card.dataset.uuid;
    const isAvail = availableDb.has(uuid);
    const existingBadge = card.querySelector('.available-badge, .unavailable-overlay');
    if (existingBadge) existingBadge.remove();

    const holder = card.querySelector('.thumb-holder');
    if (isAvail) {
        const badge = document.createElement('div');
        badge.className = 'available-badge';
        badge.innerHTML = '<i class="fas fa-check"></i>';
        holder.appendChild(badge);
    } else {
        const overlay = document.createElement('div');
        overlay.className = 'unavailable-overlay';
        overlay.innerHTML = '<i class="fas fa-ban"></i><span>Unavailable</span>';
        holder.appendChild(overlay);
    }
}

// Direct PlayFab Catalog Search
async function fetchLiveCatalog(reset = false) {
    if (isLoading) return;
    isLoading = true;
    if (scrollLoader) scrollLoader.style.display = 'block';

    if (reset) {
        nextContinuationToken = null;
        if (itemsGrid) itemsGrid.innerHTML = '';
    }

    try {
        let url = `${PLAYFAB_WORKER}?category=${encodeURIComponent(currentCategory)}&search=${encodeURIComponent(searchQuery)}`;
        if (nextContinuationToken) {
            url += `&token=${encodeURIComponent(nextContinuationToken)}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        const items = data.items || [];
        nextContinuationToken = data.continuationToken || null;

        renderCatalogItems(items);

        if (itemCountLabel) {
            itemCountLabel.innerText = `${itemsGrid.children.length} ITEMS LOADED`;
        }
    } catch (e) {
        console.error("PlayFab Search Error:", e);
    } finally {
        isLoading = false;
        if (scrollLoader) scrollLoader.style.display = 'none';
    }
}

function renderCatalogItems(items) {
    if (!itemsGrid) return;

    items.forEach(item => {
        const uuid = String(item.Id).toLowerCase();
        let thumbUrl = `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.Id}/Thumbnail_0.jpg`;
        if (Array.isArray(item.Images) && item.Images.length > 0) {
            const found = item.Images.find(i => i.Tag === 'Thumbnail') || item.Images[0];
            if (found && found.Url) thumbUrl = found.Url;
        }

        const title = item.Title?.['NEUTRAL'] || item.Title?.['en-US'] || "Minecraft DLC";
        const creator = item.CreatorEntityKey?.Id || item.Tags?.[0] || "Mojang Partner";

        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.uuid = uuid;

        card.innerHTML = `
            <div class="thumb-holder">
                <img src="${thumbUrl}" alt="${title}" loading="lazy" onerror="this.src='https://placehold.co/300x170/171420/a855f7?text=Minecraft+DLC'">
            </div>
            <div class="item-card-body">
                <h4 class="card-title">${title}</h4>
                <div class="card-creator">By ${creator}</div>
            </div>
        `;

        updateCardAvailability(card);
        card.onclick = () => openPdp(item, thumbUrl);
        itemsGrid.appendChild(card);
    });
}

// Infinite Scroll Pagination
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 800) {
        if (nextContinuationToken && !isLoading) {
            fetchLiveCatalog(false);
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
    fetchLiveCatalog(true);
}

let debounceTimer = null;
function handleSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        searchQuery = document.getElementById('globalSearch').value.trim();
        fetchLiveCatalog(true);
    }, 400);
}

// PDP Modal
function openPdp(item, thumbUrl) {
    currentModalItem = item;
    const uuid = String(item.Id).toLowerCase();

    const title = item.Title?.['NEUTRAL'] || item.Title?.['en-US'] || "Minecraft DLC";
    const desc = item.Description?.['NEUTRAL'] || item.Description?.['en-US'] || "Official Marketplace pack.";
    const rating = item.Rating?.Average ? Number(item.Rating.Average).toFixed(1) : "4.8";
    const votes = item.Rating?.TotalRatingsCount || 0;
    const coins = item.PriceOptions?.Prices?.[0]?.Amounts?.[0]?.Amount || 830;

    document.getElementById('pdpTitle').innerText = title;
    document.getElementById('pdpDescription').innerText = desc;
    document.getElementById('pdpStars').innerText = `★ ${rating}`;
    document.getElementById('pdpVotes').innerText = `(${votes})`;
    document.getElementById('pdpCoins').innerText = `🪙 ${coins}`;

    const stage = document.getElementById('pdpStage');
    const thumbs = document.getElementById('pdpThumbs');
    stage.innerHTML = `<img src="${thumbUrl}">`;
    thumbs.innerHTML = '';

    if (Array.isArray(item.Images) && item.Images.length > 0) {
        item.Images.forEach((imgObj, idx) => {
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
    const isAvail = availableDb.has(uuid);
    const dlBox = document.getElementById('downloadContainer');
    const reqBox = document.getElementById('unavailableContainer');
    const linksList = document.getElementById('shortenerLinks');

    if (isAvail) {
        let availData = availableDb.get(uuid);
        let directUrl = availData.fileBlocks?.[0]?.mainLink?.url || "";

        linksList.innerHTML = `
            <a href="${SHORTENERS.linkvertise(uuid, directUrl)}" target="_blank" onclick="simulateDownload('${title}')" class="short-btn linkvertise">
                <span><i class="fas fa-bolt"></i> Download via Linkvertise</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.workink(uuid, directUrl)}" target="_blank" onclick="simulateDownload('${title}')" class="short-btn workink">
                <span><i class="fas fa-download"></i> Download via Work.ink</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.lootlabs(uuid, directUrl)}" target="_blank" onclick="simulateDownload('${title}')" class="short-btn lootlabs">
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

function simulateDownload(name) {
    closePdp();
    const toast = document.getElementById('downloadToast');
    if (!toast) return;

    document.getElementById('toastItemName').innerText = name;
    document.getElementById('toastStatusText').innerText = "Downloading...";
    toast.classList.add('active');

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
            document.getElementById('toastStatusText').innerText = "Download Ready / Imported!";
            setTimeout(() => { toast.classList.remove('active'); }, 2500);
        }
    }, 200);
}

function closeToast() {
    document.getElementById('downloadToast')?.classList.remove('active');
}

function submitRequest() {
    if (!currentModalItem) return;
    let name = prompt("Enter your Name or Discord ID to request this pack:");
    if (!name) return;

    database.ref('requests').push().set({
        addon: currentModalItem.Title?.['NEUTRAL'] || currentModalItem.Title?.['en-US'],
        link: `https://www.minecraft.net/en-us/marketplace/pdp?id=${currentModalItem.Id}`,
        user: name,
        status: "pending",
        timestamp: Date.now()
    }).then(() => {
        alert("✅ Request sent to Admin!");
        closePdp();
    });
}
