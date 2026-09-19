// --- FIREBASE CONFIGURATION ---
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

// --- RESILIENT MULTI-SOURCE ENGINE ---
const OFFICIAL_PLAYFAB_WORKER = 'https://damp-snowflake-b822.rockyroyalgaming.workers.dev';
const FALLBACK_CATALOG_API = 'https://v5-mcsrc.github.io/data/api/marketplace';
const PDP_ITEM_API = 'https://v5-mcsrc.github.io/data/api/marketplace/item';

const IDB_NAME = 'strike_market_core_v7';
const IDB_STORE = 'catalog_store';
const IDB_KEY = 'all_packs';
const BATCH_SIZE = 30;

// SHORTENER CONFIGURATION
const SHORTENERS = {
    linkvertise: (id, link) => `https://link-target.net/your_id/download?url=${encodeURIComponent(link || id)}`,
    workink: (id, link) => `https://work.ink/your_id/${encodeURIComponent(link || id)}`,
    lootlabs: (id, link) => `https://loot-link.com/s?your_id=${encodeURIComponent(link || id)}`
};

// State
let fullCatalog = [];
let displayedList = [];
let availableDb = new Map();
let activeCategory = 'all';
let onlyAvailable = false;
let currentSearch = '';
let renderedIndex = 0;
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
    initCatalogEngine();
};

function toggleDrawer() {
    sideDrawer.classList.toggle('active');
    drawerOverlay.classList.toggle('active');
}

// 1. Firebase Available Items (Checkmarks)
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

function mapCategoryKey(rawType) {
    let t = String(rawType || '').toLowerCase().trim();
    if (t.includes('world')) return 'worlds';
    if (t.includes('skin')) return 'skins';
    if (t.includes('texture')) return 'textures';
    return 'addons';
}

// 2. IndexedDB Cache
function idbOpen() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGet(key) {
    try {
        const db = await idbOpen();
        return new Promise((resolve) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}

async function idbSet(key, val) {
    try {
        const db = await idbOpen();
        return new Promise((resolve) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).put(val, key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch { return false; }
}

// 3. Bulletproof Catalog Loader (PlayFab Worker + Zero-Downtime Fallback)
async function initCatalogEngine() {
    // 1. Check local persistent DB
    try {
        const cached = await idbGet(IDB_KEY);
        if (cached && Array.isArray(cached.items) && cached.items.length >= 20000) {
            fullCatalog = cached.items;
            applyFilters();
            return;
        }
    } catch {}

    // 2. Try Official PlayFab Worker first
    let loadedItems = [];
    try {
        const res = await fetch(OFFICIAL_PLAYFAB_WORKER);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 50) {
                loadedItems = data.map(item => {
                    let custom = {};
                    try { custom = item.CustomData ? JSON.parse(item.CustomData) : {}; } catch(e){}
                    return {
                        id: item.ItemId,
                        title: item.DisplayName || "Minecraft DLC",
                        creator: custom.creatorName || item.Tags?.[0] || "Mojang Partner",
                        category: mapCategoryKey(item.ItemClass || custom.packType),
                        coins: item.VirtualCurrencyPrices?.MC || custom.price || 830,
                        rating: custom.rating ? Number(custom.rating).toFixed(1) : "4.8",
                        votes: custom.totalRatings || 24,
                        desc: item.Description || "Official Minecraft Marketplace DLC.",
                        image: `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.ItemId}/Thumbnail_0.jpg`
                    };
                });
            }
        }
    } catch (e) {}

    // 3. Fallback Streamer if worker is warming up / rate-limited
    if (loadedItems.length === 0) {
        let currentPage = 1;
        const BATCH_PAGES = 15;
        const TOTAL_ITEMS = 37382;

        while (true) {
            const pages = Array.from({ length: BATCH_PAGES }, (_, i) => currentPage + i);
            try {
                const results = await Promise.all(pages.map(async p => {
                    try {
                        const r = await fetch(`${FALLBACK_CATALOG_API}/page/page-${p}.json`);
                        if (!r.ok) return [];
                        const j = await r.json();
                        return Array.isArray(j) ? j : (j.items || []);
                    } catch { return []; }
                }));

                const flat = results.flat();
                if (flat.length === 0 || loadedItems.length >= TOTAL_ITEMS) break;

                flat.forEach(item => {
                    let id = item.id || item.uuid;
                    if (!id) return;
                    let img = item.thumbnail || item.image || item.keyArt || `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${id}/Thumbnail_0.jpg`;
                    loadedItems.push({
                        id: id,
                        title: item.title || item.name || "Minecraft DLC",
                        creator: item.author || item.creator || item.creatorName || "Mojang Partner",
                        category: mapCategoryKey(item.type || item.packType || item.category),
                        rating: item.rating ? Number(item.rating).toFixed(1) : "4.8",
                        votes: item.ratingCount || item.totalRatings || 32,
                        desc: item.longDescription || item.description || item.desc || "Official Minecraft Marketplace DLC.",
                        image: img,
                        coins: item.price || item.coins || null
                    });
                });

                const seen = new Set();
                fullCatalog = loadedItems.filter(el => {
                    const dup = seen.has(el.id);
                    seen.add(el.id);
                    return !dup;
                });

                if (currentPage === 1 && fullCatalog.length > 0) {
                    applyFilters();
                }

                currentPage += BATCH_PAGES;
                idbSet(IDB_KEY, { items: fullCatalog, at: Date.now() });

            } catch {
                currentPage += BATCH_PAGES;
            }
            await new Promise(r => setTimeout(r, 60));
        }
    } else {
        fullCatalog = loadedItems;
        idbSet(IDB_KEY, { items: fullCatalog, at: Date.now() });
    }

    applyFilters();
}

// 4. Render Cards (Checkmark vs Unavailable Overlay)
function renderCards(reset = false) {
    if (reset) {
        renderedIndex = 0;
        if (itemsGrid) itemsGrid.innerHTML = "";
    }
    if (isRendering || renderedIndex >= displayedList.length) return;
    isRendering = true;
    if (scrollLoader) scrollLoader.style.display = "block";

    const slice = displayedList.slice(renderedIndex, renderedIndex + BATCH_SIZE);

    slice.forEach(item => {
        let card = document.createElement('div');
        card.className = "item-card";
        
        let isAvail = availableDb.has(String(item.id).toLowerCase());
        let badgeHtml = isAvail 
            ? `<div class="available-badge"><i class="fas fa-check"></i></div>` 
            : `<div class="unavailable-overlay"><i class="fas fa-ban"></i><span>Unavailable</span></div>`;

        card.innerHTML = `
            <div class="thumb-holder">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg'">
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

    renderedIndex += slice.length;
    isRendering = false;
    if (scrollLoader) scrollLoader.style.display = "none";
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 700) {
        renderCards();
    }
}, { passive: true });

// 5. Filters & Shuffle
function navigateCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.drawer-item').forEach(d => d.classList.remove('active'));
    
    if (event && event.target) {
        event.target.closest('.chip')?.classList.add('active');
        event.target.closest('.drawer-item')?.classList.add('active');
    }
    if (sideDrawer.classList.contains('active')) toggleDrawer();
    applyFilters();
}

function filterByAvailability(status) {
    onlyAvailable = status;
    toggleDrawer();
    applyFilters();
}

function handleSearch() {
    currentSearch = document.getElementById('globalSearch').value.toLowerCase().trim();
    applyFilters();
}

function applyFilters() {
    let filtered = fullCatalog.filter(i => {
        let matchCat = (activeCategory === 'all') || (i.category === activeCategory);
        let matchQuery = !currentSearch || i.title.toLowerCase().includes(currentSearch) || i.creator.toLowerCase().includes(currentSearch);
        let matchAvail = !onlyAvailable || availableDb.has(String(i.id).toLowerCase());
        return matchCat && matchQuery && matchAvail;
    });

    // Shuffled discovery
    for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    displayedList = filtered;

    if (itemCountLabel) {
        itemCountLabel.innerText = `${displayedList.length.toLocaleString()} ITEMS`;
    }

    renderCards(true);
}

// 6. PDP Modal
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-body').forEach(t => t.style.display = 'none');

    if (event && event.target) event.target.closest('.tab-btn')?.classList.add('active');

    if (tabName === 'desc') document.getElementById('tabDesc').style.display = 'block';
    if (tabName === 'howto') document.getElementById('tabHowTo').style.display = 'block';
    if (tabName === 'faq') document.getElementById('tabFaq').style.display = 'block';
}

async function openPdp(item) {
    currentModalItem = item;
    document.getElementById('pdpTitle').innerText = item.title;
    document.getElementById('pdpDescription').innerText = item.desc;
    document.getElementById('pdpStars').innerText = `★ ${item.rating}`;
    document.getElementById('pdpVotes').innerText = `(${item.votes})`;
    document.getElementById('pdpCoins').innerText = item.coins ? `🪙 ${item.coins}` : '🪙 830';

    const stage = document.getElementById('pdpStage');
    stage.innerHTML = `<img src="${item.image}" alt="cover">`;
    document.getElementById('pdpThumbs').innerHTML = "";

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

    // Fetch Rich PDP Data
    try {
        const res = await fetch(`${PDP_ITEM_API}/${item.id}.json`);
        if (!res.ok) return;
        const details = await res.json();
        const d = details.item || details;

        if (d.version) document.getElementById('pdpVersion').innerText = `# ${d.version}`;
        if (d.creationDate) document.getElementById('pdpDate').innerHTML = `<i class="far fa-calendar-alt"></i> ${d.creationDate.split('T')[0]}`;
        if (d.contentSize) document.getElementById('pdpSize').innerHTML = `<i class="fas fa-download"></i> ${(d.contentSize / (1024 * 1024)).toFixed(1)} MB`;

        // HowTo Accordion
        const howToContainer = document.getElementById('howToAccordion');
        howToContainer.innerHTML = "";
        if (Array.isArray(d.howToEntries) && d.howToEntries.length > 0) {
            d.howToEntries.forEach((entry, idx) => {
                let det = document.createElement('details');
                det.open = (idx === 0);
                det.innerHTML = `<summary>${entry.heading || 'Step ' + (idx + 1)}</summary><p>${entry.content || ''}</p>`;
                howToContainer.appendChild(det);
            });
        } else {
            howToContainer.innerHTML = "<p>No gameplay guide available.</p>";
        }

        // FAQ Accordion
        const faqContainer = document.getElementById('faqAccordion');
        faqContainer.innerHTML = "";
        if (Array.isArray(d.faqEntries) && d.faqEntries.length > 0) {
            d.faqEntries.forEach((faq, idx) => {
                let det = document.createElement('details');
                det.open = (idx === 0);
                det.innerHTML = `<summary>${faq.heading || faq.question || 'Question'}</summary><p>${faq.content || faq.answer || ''}</p>`;
                faqContainer.appendChild(det);
            });
        } else {
            faqContainer.innerHTML = "<p>No FAQ questions available.</p>";
        }

    } catch (e) {}
}

function closePdp() {
    pdpModal.style.display = 'none';
    document.body.style.overflow = '';
}

// 7. Live Download Simulator Toast
function simulateDownload(name) {
    closePdp();
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
        bar.style.width = pct + "%";
        nums.innerText = `${currMb} MB / ${totalMb} MB (${pct}%)`;

        if (pct >= 100) {
            clearInterval(interval);
            document.getElementById('toastStatusText').innerText = "Download Ready / Imported!";
            setTimeout(() => { downloadToast.classList.remove('active'); }, 2500);
        }
    }, 200);
}

function closeToast() {
    downloadToast.classList.remove('active');
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

function openRequestModal() {
    let pack = prompt("Which Minecraft DLC do you want?");
    if (!pack) return;
    let user = prompt("Your Discord or WhatsApp ID:");
    if (!user) return;

    database.ref('requests').push().set({
        addon: pack,
        user: user,
        status: "pending",
        timestamp: Date.now()
    }).then(() => alert("✅ Request received!"));
}
