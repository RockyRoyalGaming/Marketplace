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

// --- API ENDPOINTS ---
const MARKETPLACE_API = 'https://v5-mcsrc.github.io/data/api/marketplace';
const MARKETPLACE_ITEM_API = 'https://v5-mcsrc.github.io/data/api/marketplace/item';
const IDB_NAME = 'blockbay_cache_v1';
const IDB_STORE = 'items';
const IDB_KEY = 'all_catalog';
const PARALLEL_BATCH_SIZE = 15;
const BATCH_SIZE = 30;

// --- APNE SHORTENER APIS YA IDS YAHAN DALEIN ---
const SHORTENERS = {
    linkvertise: (id, link) => `https://link-target.net/your_id/download?url=${encodeURIComponent(link || id)}`,
    workink: (id, link) => `https://work.ink/your_id/${encodeURIComponent(link || id)}`,
    lootlabs: (id, link) => `https://loot-link.com/s?your_id=${encodeURIComponent(link || id)}`
};

// State
let fullCatalog = [];
let displayedList = [];
let availableDb = new Map(); // UUIDs mapped to download URLs
let activeCategory = 'all';
let currentSearch = '';
let activeFilter = 'all';
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
    initStreamCatalog();
};

function toggleDrawer() {
    sideDrawer.classList.toggle('active');
    drawerOverlay.classList.toggle('active');
}

// 1. FIREBASE LOAD (Items having downloads)
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
        renderBatchCards(true);
    });
}

function mapCategoryKey(rawType) {
    let t = String(rawType || '').toLowerCase().trim();
    if (t.includes('world')) return 'worlds';
    if (t.includes('skin')) return 'skins';
    if (t.includes('texture')) return 'textures';
    if (t.includes('mashup')) return 'mashups';
    return 'addons';
}

// 2. INDEXEDDB
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

// 3. FULL CATALOG STREAM (37,000+ Items)
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

                let cat = mapCategoryKey(item.type || item.packType || item.category);

                allItems.push({
                    id: id,
                    title: item.title || item.name || "Minecraft DLC",
                    creator: item.author || item.creator || item.creatorName || "Mojang Partner",
                    category: cat,
                    displayType: item.type || cat,
                    rating: item.rating ? Number(item.rating).toFixed(1) : "4.5",
                    votes: item.ratingCount || item.totalRatings || 12,
                    desc: item.longDescription || item.description || item.snippet || item.desc || "Official Minecraft Bedrock Marketplace DLC.",
                    image: img,
                    coins: item.price || item.coins || null
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

// 4. RENDER CARDS WITH "UNAVAILABLE" BADGE LOGIC (SCREENSHOT 50)
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
        card.className = "bb-card";
        
        // Exact Unavailable Verification
        let isAvailable = availableDb.has(String(item.id).toLowerCase());
        let unavailableOverlay = !isAvailable ? `
            <div class="unavailable-badge-overlay">
                <i class="fas fa-ban"></i>
                <span>Unavailable</span>
            </div>
        ` : '';

        card.innerHTML = `
            <div class="bb-thumb-wrap">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg';">
                ${unavailableOverlay}
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
    if (scrollLoader) scrollLoader.style.display = "none";
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 700) {
        renderBatchCards();
    }
}, { passive: true });

// 5. FILTERS & NAVIGATION
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

function applySpecialFilter(filterType) {
    activeFilter = filterType;
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
        
        let matchSpecial = true;
        if (activeFilter === 'available') {
            matchSpecial = availableDb.has(String(i.id).toLowerCase());
        }

        return matchCat && matchQuery && matchSpecial;
    });

    // Shuffle for fresh discovery like Toolcoin
    const arr = [...filtered];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    displayedList = arr;

    if (itemCountLabel) {
        itemCountLabel.innerText = `${displayedList.length.toLocaleString()} ITEMS`;
    }

    renderBatchCards(true);
}

// 6. PDP MODAL & SHORTENERS
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

    // Check availability
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
        const res = await fetch(`${MARKETPLACE_ITEM_API}/${item.id}.json`);
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

    } catch (e) {
        console.warn(e);
    }
}

function closePdp() {
    pdpModal.style.display = 'none';
    document.body.style.overflow = '';
}

// 7. IN-APP LIVE DOWNLOAD PROGRESS SIMULATOR (SCREENSHOT 52)
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
