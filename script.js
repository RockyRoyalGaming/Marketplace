// --- 1. FIREBASE SETUP ---
var firebaseConfig = {
  apiKey: "AIzaSyDOnkkfPgIX9rlEXefUKnZ3atV6zdBu1RU",
  authDomain: "strikemarket-32a5e.firebaseapp.com",
  databaseURL: "https://strikemarket-32a5e-default-rtdb.firebaseio.com",
  projectId: "strikemarket-32a5e"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
var database = firebase.database();

// --- 2. CONFIGURATION & SHORTENERS ---
const MARKETPLACE_API = 'https://v5-mcsrc.github.io/data/api/marketplace';
const MARKETPLACE_ITEM_API = 'https://v5-mcsrc.github.io/data/api/marketplace/item';
const IDB_NAME = 'strike_toolcoin_db_v2';
const IDB_STORE = 'items';
const IDB_KEY = 'catalog';
const PARALLEL_BATCH_SIZE = 15;
const BATCH_SIZE = 30;

// Apne Linkvertise / Work.ink IDs yahan configure karein
const SHORTENERS = {
    linkvertise: (id, url) => `https://link-target.net/your_id/dlc?url=${encodeURIComponent(url || id)}`,
    workink: (id, url) => `https://work.ink/your_id/${encodeURIComponent(url || id)}`,
    lootlabs: (id, url) => `https://loot-link.com/s?your_id=${encodeURIComponent(url || id)}`
};

// State
let fullCatalog = [];
let displayedList = [];
let availableDb = new Map();
let activeCategory = 'all';
let filterAvailableOnly = false;
let currentSearch = '';
let renderedIndex = 0;
let isRendering = false;
let currentModalItem = null;

// DOM
const itemsGrid = document.getElementById('itemsGrid');
const scrollLoader = document.getElementById('scrollLoader');
const itemCountLabel = document.getElementById('itemCountLabel');
const pdpModal = document.getElementById('pdpModal');

window.onload = function() {
    loadAvailableDatabase();
    initStreamCatalog();
};

function toggleDrawer() {
    document.getElementById('sideDrawer').classList.toggle('active');
    document.getElementById('drawerOverlay').classList.toggle('active');
}

// 3. FIREBASE AVAILABLE SYNC
function loadAvailableDatabase() {
    database.ref('market_items').on('value', snapshot => {
        availableDb.clear();
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                let data = child.val();
                let uuidKey = (data.uuid || data.id || child.key).toLowerCase();
                availableDb.set(uuidKey, data);
            });
        }
        applyFilters();
    });
}

// 4. INDEXEDDB PERSISTENCE (Offline Caching)
function idbOpen() {
    return new Promise((resolve) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
        };
        req.onsuccess = () => resolve(req.result);
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

// 5. PARALLEL 37,382 ITEMS FETCH ENGINE
async function initStreamCatalog() {
    try {
        const cached = await idbGet(IDB_KEY);
        if (cached && Array.isArray(cached.items) && cached.items.length >= 20000) {
            fullCatalog = cached.items;
            applyFilters();
            return;
        }
    } catch {}

    let allItems = [];
    let currentPage = 1;
    let consecutiveEmpty = 0;
    const TOTAL_EXPECTED = 37382;

    while (true) {
        const batchPages = Array.from({ length: PARALLEL_BATCH_SIZE }, (_, i) => currentPage + i);
        try {
            const batchResults = await Promise.all(batchPages.map(async p => {
                try {
                    const res = await fetch(`${MARKETPLACE_API}/page/page-${p}.json`);
                    if (!res.ok) return [];
                    const json = await res.json();
                    return Array.isArray(json) ? json : (json.items || []);
                } catch { return []; }
            }));

            const flat = batchResults.flat();
            if (flat.length === 0) {
                consecutiveEmpty++;
                if (consecutiveEmpty >= 2 || allItems.length >= TOTAL_EXPECTED) break;
            } else {
                consecutiveEmpty = 0;
            }

            flat.forEach(item => {
                let id = item.id || item.uuid;
                if (!id) return;
                let img = item.thumbnail || item.image || item.keyArt || "";
                if (!img) {
                    img = `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${id}/Thumbnail_0.jpg`;
                }

                let rawT = String(item.type || item.category || '').toLowerCase();
                let cat = 'addons';
                if (rawT.includes('world')) cat = 'worlds';
                else if (rawT.includes('skin')) cat = 'skins';
                else if (rawT.includes('texture')) cat = 'textures';

                allItems.push({
                    id: id,
                    title: item.title || item.name || "Minecraft DLC",
                    creator: item.author || item.creator || item.creatorName || "Mojang Partner",
                    category: cat,
                    displayCategory: (item.type || cat).toUpperCase(),
                    rating: item.rating ? Number(item.rating).toFixed(1) : "4.8",
                    total_ratings: item.ratingCount || item.totalRatings || null,
                    desc: item.longDescription || item.description || item.snippet || item.desc || "Official Minecraft Marketplace DLC.",
                    image: img,
                    coinPrice: item.price || item.coins || null
                });
            });

            const seen = new Set();
            fullCatalog = allItems.filter(el => {
                const dup = seen.has(el.id);
                seen.add(el.id);
                return !dup;
            });

            if (currentPage === 1 && fullCatalog.length > 0) {
                applyFilters();
            }

            currentPage += PARALLEL_BATCH_SIZE;
            idbSet(IDB_KEY, { items: fullCatalog, at: Date.now() });

        } catch {
            currentPage += PARALLEL_BATCH_SIZE;
        }

        await new Promise(r => setTimeout(r, 60));
    }

    applyFilters();
}

// 6. CARDS RENDERER WITH AVAILABILITY BADGES
function renderBatchCards(reset = false) {
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

        let isAvailable = availableDb.has(String(item.id).toLowerCase());
        let badgeHtml = isAvailable ? `<div class="card-avail-badge" title="Download Ready"><i class="fas fa-check"></i></div>` : '';

        card.innerHTML = `
            <div class="card-thumb-wrap">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg';">
                <span class="card-type-overlay">${item.displayCategory}</span>
                ${badgeHtml}
            </div>
            <div class="card-body">
                <div class="card-top-stat">
                    <span>★ ${item.rating}</span>
                    <span style="color:#38bdf8;">⚡ NEW</span>
                </div>
                <h3 class="card-title">${item.title}</h3>
                <div class="card-creator">${item.creator}</div>
            </div>
        `;

        card.onclick = () => openPdpModal(item);
        itemsGrid.appendChild(card);
    });

    renderedIndex += slice.length;
    isRendering = false;
    if (scrollLoader) scrollLoader.style.display = "none";
}

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 700) {
        renderBatchCards();
    }
}, { passive: true });

// 7. FILTERS & SEARCH
function navigateCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.drawer-item').forEach(d => d.classList.remove('active'));
    if (event && event.target) event.target.closest('.chip')?.classList.add('active');

    let drawer = document.getElementById('sideDrawer');
    if (drawer.classList.contains('active')) toggleDrawer();

    applyFilters();
}

function filterByAvailability(availOnly) {
    filterAvailableOnly = availOnly;
    if (document.getElementById('sideDrawer').classList.contains('active')) toggleDrawer();
    applyFilters();
}

let searchDebounce = null;
function handleSearch() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        currentSearch = document.getElementById('globalSearch').value.toLowerCase().trim();
        applyFilters();
    }, 200);
}

function applyFilters() {
    displayedList = fullCatalog.filter(i => {
        let matchCat = (activeCategory === 'all') || (i.category === activeCategory);
        let matchQuery = !currentSearch || i.title.toLowerCase().includes(currentSearch) || i.creator.toLowerCase().includes(currentSearch);
        let matchAvail = (!filterAvailableOnly) || availableDb.has(String(i.id).toLowerCase());
        return matchCat && matchQuery && matchAvail;
    });

    if (itemCountLabel) {
        itemCountLabel.innerText = `${displayedList.length.toLocaleString()} ITEMS`;
    }

    renderBatchCards(true);
}

// 8. RICH PDP MODAL
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-body').forEach(b => b.style.display = "none");

    if (event && event.target) event.target.closest('.tab-btn')?.classList.add('active');

    if (tab === 'desc') document.getElementById('tabDesc').style.display = "block";
    if (tab === 'howto') document.getElementById('tabHowTo').style.display = "block";
    if (tab === 'faq') document.getElementById('tabFaq').style.display = "block";
}

async function openPdpModal(item) {
    currentModalItem = item;
    document.getElementById('pdpTitle').innerText = item.title;
    document.getElementById('pdpDescription').innerText = item.desc;
    document.getElementById('pdpStars').innerText = `★ ${item.rating || '4.8'}`;
    document.getElementById('pdpCoins').innerText = item.coinPrice ? `🪙 ${item.coinPrice}` : '🪙 830';

    const stage = document.getElementById('pdpStage');
    const thumbs = document.getElementById('pdpThumbs');
    stage.innerHTML = `<img src="${item.image}" alt="preview">`;
    thumbs.innerHTML = "";

    // Action Area (Shortener Buttons vs Free Request)
    let isAvail = availableDb.has(String(item.id).toLowerCase());
    let dlContainer = document.getElementById('downloadContainer');
    let reqContainer = document.getElementById('unavailableContainer');
    let shortLinks = document.getElementById('shortenerLinks');

    if (isAvail) {
        let directUrl = availableDb.get(String(item.id).toLowerCase())?.fileBlocks?.[0]?.mainLink?.url || "";
        shortLinks.innerHTML = `
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
        dlContainer.style.display = "block";
        reqContainer.style.display = "none";
    } else {
        dlContainer.style.display = "none";
        reqContainer.style.display = "block";
    }

    pdpModal.classList.add('active');

    // Fetch in-depth details (Screenshots, FAQ, HowTo)
    try {
        const res = await fetch(`${MARKETPLACE_ITEM_API}/${item.id}.json`);
        if (!res.ok) return;
        const data = await res.json();
        const d = data.item || data;

        // Populate Screenshots
        let extra = d.images || [];
        if (extra.length > 0) {
            thumbs.innerHTML = "";
            extra.forEach((im, idx) => {
                let u = typeof im === 'string' ? im : (im.url || "");
                if (u) {
                    let th = document.createElement('div');
                    th.className = `pdp-thumb-item ${idx === 0 ? 'active' : ''}`;
                    th.innerHTML = `<img src="${u}" alt="thumb">`;
                    th.onclick = () => {
                        stage.innerHTML = `<img src="${u}" alt="stage">`;
                        thumbs.querySelectorAll('.pdp-thumb-item').forEach(t => t.classList.remove('active'));
                        th.classList.add('active');
                    };
                    thumbs.appendChild(th);
                }
            });
        }

        // Accordions for HowTo & FAQ
        const howToBox = document.getElementById('howToAccordion');
        howToBox.innerHTML = "";
        (d.howToEntries || [{ heading: "How to Install", content: "Download the pack and open it directly with Minecraft Bedrock." }]).forEach(h => {
            let det = document.createElement('details');
            det.innerHTML = `<summary>${h.heading}</summary><p>${h.content}</p>`;
            howToBox.appendChild(det);
        });

        const faqBox = document.getElementById('faqAccordion');
        faqBox.innerHTML = "";
        (d.faqEntries || [{ heading: "Does it support 1.21+?", content: "Yes, enable experimental toggles in your world settings." }]).forEach(f => {
            let det = document.createElement('details');
            det.innerHTML = `<summary>${f.heading || f.question}</summary><p>${f.content || f.answer}</p>`;
            faqBox.appendChild(det);
        });

    } catch (e) {}
}

function closePdp() {
    pdpModal.classList.remove('active');
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
        alert("✅ Request sent to Admin! Decrypted pack will be uploaded soon.");
        closePdp();
    });
}

function openDirectRequestModal() {
    let pack = prompt("Which Minecraft DLC do you want to request?");
    if (!pack) return;
    let user = prompt("Your Discord ID or Name:");
    if (!user) return;

    database.ref('requests').push().set({
        addon: pack,
        user: user,
        status: "pending",
        timestamp: Date.now()
    }).then(() => alert("✅ Request submitted to Admin!"));
}
