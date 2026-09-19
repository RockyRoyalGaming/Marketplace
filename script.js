// --- 1. DIRECT PLAYFAB ENDPOINT (YOUR WORKER) ---
const OFFICIAL_PLAYFAB_WORKER = 'https://damp-snowflake-b822.rockyroyalgaming.workers.dev';

// --- 2. FIREBASE CONFIGURATION (FOR DOWNLOAD LINKS & REQUESTS) ---
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

// --- 3. CUSTOM MONETIZATION SHORTENERS ---
// Apne IDs yahan replace kar sakte hain
const SHORTENERS = {
    linkvertise: (id, url) => `https://link-target.net/your_id/download?url=${encodeURIComponent(url || id)}`,
    workink: (id, url) => `https://work.ink/your_id/${encodeURIComponent(url || id)}`,
    lootlabs: (id, url) => `https://loot-link.com/s?your_id=${encodeURIComponent(url || id)}`
};

// State
let fullCatalog = [];
let displayedList = [];
let availableDb = new Map();
let activeCategory = 'all';
let currentSearch = '';
let renderedIndex = 0;
const BATCH_SIZE = 30;
let isRendering = false;
let currentModalItem = null;

// DOM
const itemsGrid = document.getElementById('itemsGrid');
const itemCountLabel = document.getElementById('itemCountLabel');
const scrollLoader = document.getElementById('scrollLoader');
const pdpModal = document.getElementById('pdpModal');
const sideDrawer = document.getElementById('sideDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const downloadToast = document.getElementById('downloadToast');

window.onload = function() {
    loadAvailableDatabase();
    fetchOfficialPlayFabMarketplace();
};

function toggleDrawer() {
    if (sideDrawer) sideDrawer.classList.toggle('active');
    if (drawerOverlay) drawerOverlay.classList.toggle('active');
}

// 4. FIREBASE CHECK: Available DLCs Map
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
        renderCards(true);
    });
}

// 5. DIRECT OFFICIAL PLAYFAB AUTO-FETCH (NO THIRD-PARTY API)
async function fetchOfficialPlayFabMarketplace() {
    if (scrollLoader) scrollLoader.style.display = 'block';

    try {
        const response = await fetch(OFFICIAL_PLAYFAB_WORKER);
        const playFabItems = await response.json();

        fullCatalog = playFabItems.map(item => {
            let custom = {};
            try {
                custom = item.CustomData ? JSON.parse(item.CustomData) : {};
            } catch (e) {}

            let cat = (item.ItemClass || custom.packType || 'addon').toLowerCase();
            let categoryClean = 'addons';
            if (cat.includes('world')) categoryClean = 'worlds';
            else if (cat.includes('skin')) categoryClean = 'skins';
            else if (cat.includes('texture')) categoryClean = 'textures';
            else if (cat.includes('mashup')) categoryClean = 'mashups';

            return {
                id: item.ItemId,
                title: item.DisplayName || "Minecraft DLC",
                creator: custom.creatorName || item.Tags?.[0] || "Mojang Partner",
                category: categoryClean,
                displayType: (item.ItemClass || categoryClean).toUpperCase(),
                coins: item.VirtualCurrencyPrices?.MC || custom.price || 830,
                rating: custom.rating ? Number(custom.rating).toFixed(1) : "4.8",
                votes: custom.totalRatings || 42,
                desc: item.Description || "Official Minecraft Marketplace pack.",
                image: `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.ItemId}/Thumbnail_0.jpg`,
                rawCustom: custom
            };
        });

        applyCategoryFilter(activeCategory);

    } catch (err) {
        console.error("Direct PlayFab Connection Failed:", err);
    } finally {
        if (scrollLoader) scrollLoader.style.display = 'none';
    }
}

// 6. RENDER CARDS WITH BLOCKBAY BADGES
function renderCards(reset = false) {
    if (!itemsGrid) return;

    if (reset) {
        renderedIndex = 0;
        itemsGrid.innerHTML = "";
    }

    if (isRendering || renderedIndex >= displayedList.length) return;
    isRendering = true;

    const slice = displayedList.slice(renderedIndex, renderedIndex + BATCH_SIZE);

    slice.forEach(item => {
        let isAvail = availableDb.has(String(item.id).toLowerCase());
        
        // Exact Unavailable Badge from BlockBay
        let badgeHtml = isAvail 
            ? `<div class="card-available-check"><i class="fas fa-check"></i></div>` 
            : `<div class="unavailable-badge-overlay"><i class="fas fa-ban"></i><span>Unavailable</span></div>`;

        let card = document.createElement('div');
        card.className = "bb-card";
        card.innerHTML = `
            <div class="bb-thumb-wrap">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.src='https://placehold.co/300x170/141218/22c55e?text=Minecraft+DLC'">
                ${badgeHtml}
            </div>
            <div class="bb-card-body">
                <h4 class="bb-card-title">${item.title}</h4>
                <div class="bb-card-creator">By ${item.creator}</div>
            </div>
        `;
        card.onclick = () => openPdp(item);
        itemsGrid.appendChild(card);
    });

    renderedIndex += slice.length;
    isRendering = false;
}

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 700) {
        renderCards();
    }
}, { passive: true });

// 7. FILTERS & SEARCH
function navigateCategory(cat) {
    applyCategoryFilter(cat);
    if (sideDrawer && sideDrawer.classList.contains('active')) toggleDrawer();
}

function applyCategoryFilter(cat) {
    activeCategory = cat;

    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.drawer-item').forEach(d => d.classList.remove('active'));

    displayedList = fullCatalog.filter(i => {
        let matchCat = (cat === 'all') || (i.category === cat);
        let matchSearch = !currentSearch || i.title.toLowerCase().includes(currentSearch) || i.creator.toLowerCase().includes(currentSearch);
        return matchCat && matchSearch;
    });

    // Shuffle for discovery
    for (let i = displayedList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [displayedList[i], displayedList[j]] = [displayedList[j], displayedList[i]];
    }

    if (itemCountLabel) {
        itemCountLabel.innerText = `${displayedList.length.toLocaleString()} ITEMS`;
    }

    renderCards(true);
}

function handleSearch() {
    currentSearch = document.getElementById('globalSearch').value.toLowerCase().trim();
    applyCategoryFilter(activeCategory);
}

// 8. RICH PDP MODAL WITH MONETIZED MIRRORS
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-body').forEach(t => t.style.display = 'none');

    if (event && event.target) event.target.closest('.tab-btn')?.classList.add('active');

    if (tabName === 'desc') document.getElementById('tabDesc').style.display = 'block';
    if (tabName === 'howto') document.getElementById('tabHowTo').style.display = 'block';
    if (tabName === 'faq') document.getElementById('tabFaq').style.display = 'block';
}

function openPdp(item) {
    currentModalItem = item;
    document.getElementById('pdpTitle').innerText = item.title;
    document.getElementById('pdpDescription').innerText = item.desc;
    document.getElementById('pdpStars').innerText = `★ ${item.rating}`;
    document.getElementById('pdpVotes').innerText = `(${item.votes})`;
    document.getElementById('pdpCoins').innerText = `🪙 ${item.coins}`;

    const stage = document.getElementById('pdpStage');
    if (stage) stage.innerHTML = `<img src="${item.image}">`;

    let isAvail = availableDb.has(String(item.id).toLowerCase());
    const dlBox = document.getElementById('downloadContainer');
    const reqBox = document.getElementById('unavailableContainer');
    const linksList = document.getElementById('shortenerLinks');

    if (isAvail) {
        let data = availableDb.get(String(item.id).toLowerCase());
        let directUrl = data.fileBlocks?.[0]?.mainLink?.url || "";

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

    if (pdpModal) {
        pdpModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closePdp() {
    if (pdpModal) {
        pdpModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// 9. LIVE DOWNLOAD SIMULATOR TOAST
function simulateDownload(name) {
    closePdp();
    if (!downloadToast) return;

    document.getElementById('toastItemName').innerText = name;
    document.getElementById('toastStatusText').innerText = "Downloading...";
    downloadToast.classList.add('active');

    let pct = 0;
    let totalMb = (Math.random() * 20 + 8).toFixed(1);
    let bar = document.getElementById('toastBar');
    let nums = document.getElementById('toastProgressNums');

    let interval = setInterval(() => {
        pct += 5;
        let currMb = ((pct / 100) * totalMb).toFixed(1);
        if (bar) bar.style.width = pct + "%";
        if (nums) nums.innerText = `${currMb} MB / ${totalMb} MB (${pct}%)`;

        if (pct >= 100) {
            clearInterval(interval);
            document.getElementById('toastStatusText').innerText = "Download Ready / Imported!";
            setTimeout(() => { downloadToast.classList.remove('active'); }, 2500);
        }
    }, 200);
}

function closeToast() {
    if (downloadToast) downloadToast.classList.remove('active');
}

function submitRequest() {
    if (!currentModalItem) return;
    let name = prompt("Enter your Name or Discord ID:");
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
