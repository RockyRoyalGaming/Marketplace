// --- FIREBASE CONFIGURATION ---
var firebaseConfig = {
  apiKey: "AIzaSyDOnkkfPgIX9rlEXefUKnZ3atV6zdBu1RU",
  authDomain: "strikemarket-32a5e.firebaseapp.com",
  databaseURL: "https://strikemarket-32a5e-default-rtdb.firebaseio.com",
  projectId: "strikemarket-32a5e"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
var database = firebase.database();

// State
let masterCatalog = [];
let displayedList = [];
let availableDb = new Map();
let toolcoinKeys = new Map(); // TSV se aayi hui 9,210+ keys
let activeCategory = 'all';
let currentSearch = '';
let renderedIndex = 0;
const BATCH_SIZE = 24;
let isRendering = false;

const itemsGrid = document.getElementById('itemsGrid');
const itemCountLabel = document.getElementById('itemCountLabel');
const scrollLoader = document.getElementById('scrollLoader');

// 1. TOOLCOIN KEYS ENGINE (IndexedDB Caching)
async function loadToolcoinKeys() {
    try {
        // Local keys.json fetch karein jo keys.tsv se convert ki hai
        const res = await fetch('./keys.json');
        if (res.ok) {
            const data = await res.json();
            Object.keys(data).forEach(uuid => {
                toolcoinKeys.set(uuid.toLowerCase(), data[uuid]);
            });
            console.log(`[Keys] Instantly restored ${toolcoinKeys.size} marketplace keys!`);
            applyFilters();
        }
    } catch (e) {
        console.warn("keys.json load failed, fallback active:", e);
    }
}

// 2. FIREBASE UPLOADED ITEMS SYNC
function loadAvailableFromFirebase() {
    database.ref('market_items').on('value', snapshot => {
        availableDb.clear();
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                let data = child.val();
                let uuid = (data.uuid || data.id || child.key).toLowerCase();
                availableDb.set(uuid, data);
            });
        }
        applyFilters();
    });
}

// 3. 37,000+ ITEMS HIGH-SPEED STREAM
async function startCatalogStream() {
    let page = 1;
    while (page <= 80) {
        const pagePromises = [];
        for (let i = 0; i < 10; i++) {
            let p = page + i;
            pagePromises.push(
                fetch(`https://v5-mcsrc.github.io/data/api/marketplace/page/page-${p}.json`)
                    .then(r => r.ok ? r.json() : [])
                    .then(d => Array.isArray(d) ? d : (d.items || []))
                    .catch(() => [])
            );
        }

        const results = await Promise.all(pagePromises);
        const batch = results.flat();
        if (batch.length === 0) break;

        batch.forEach(item => {
            let id = item.id || item.uuid;
            if (!id) return;

            let img = item.thumbnail || item.image || item.keyArt || `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${id}/Thumbnail_0.jpg`;
            let rawType = String(item.type || item.category || '').toLowerCase();
            let cat = 'addons';
            if (rawType.includes('world')) cat = 'worlds';
            else if (rawType.includes('skin')) cat = 'skins';
            else if (rawType.includes('texture')) cat = 'textures';

            masterCatalog.push({
                id: id,
                title: item.title || item.name || "Minecraft Pack",
                creator: item.author || item.creator || item.creatorName || "Mojang Partner",
                category: cat,
                displayCategory: (item.type || cat).toUpperCase(),
                rating: item.rating ? Number(item.rating).toFixed(1) : "4.8",
                image: img,
                desc: item.longDescription || item.description || "Official Marketplace DLC."
            });
        });

        // Deduplicate
        const seen = new Set();
        masterCatalog = masterCatalog.filter(i => {
            let dup = seen.has(i.id);
            seen.add(i.id);
            return !dup;
        });

        if (page === 1) applyFilters();
        else updateCounterDisplay();

        page += 10;
        await new Promise(r => setTimeout(r, 40));
    }
}

function updateCounterDisplay() {
    if (itemCountLabel) {
        itemCountLabel.innerText = `${displayedList.length.toLocaleString()} ITEMS LOADED`;
    }
}

// 4. CARD RENDERER (Toolcoin Key Match Indicator)
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
        let cleanId = String(item.id).toLowerCase();
        let hasDirectDownload = availableDb.has(cleanId);
        let hasToolcoinKey = toolcoinKeys.has(cleanId);
        let isReady = hasDirectDownload || hasToolcoinKey;

        let card = document.createElement('div');
        card.className = "item-card";

        card.innerHTML = `
            <div class="card-thumb-wrap">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg';">
                <span class="card-type-overlay">${item.displayCategory}</span>
                ${isReady ? `<div class="card-avail-badge" title="${hasDirectDownload ? 'Download Ready' : 'Decryption Key Cached'}"><i class="fas fa-check"></i></div>` : ''}
            </div>
            <div class="card-body">
                <div class="card-top-stat">
                    <span>★ ${item.rating}</span>
                    <span class="card-status-label ${isReady ? 'ready' : 'unavail'}">${isReady ? 'READY' : 'REQUEST'}</span>
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

// 5. PDP MODAL & MIRRORS
function openPdpModal(item) {
    let cleanId = String(item.id).toLowerCase();
    let hasDirectDownload = availableDb.has(cleanId);
    let hasToolcoinKey = toolcoinKeys.has(cleanId);

    document.getElementById('pdpTitle').innerText = item.title;
    document.getElementById('pdpDescription').innerText = item.desc;
    document.getElementById('pdpStage').innerHTML = `<img src="${item.image}" alt="preview">`;

    let dlContainer = document.getElementById('downloadContainer');
    let reqContainer = document.getElementById('unavailableContainer');

    if (hasDirectDownload || hasToolcoinKey) {
        let directUrl = "";
        if (hasDirectDownload) {
            let data = availableDb.get(cleanId);
            directUrl = (data.fileBlocks && data.fileBlocks[0]?.mainLink?.url) || "";
        }

        document.getElementById('shortenerLinks').innerHTML = `
            <a href="https://link-target.net/your_id/dlc?url=${encodeURIComponent(directUrl || item.id)}" target="_blank" class="short-btn linkvertise">
                <span><i class="fas fa-bolt"></i> Download via Linkvertise</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="https://work.ink/your_id/${encodeURIComponent(directUrl || item.id)}" target="_blank" class="short-btn workink">
                <span><i class="fas fa-download"></i> Download via Work.ink</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            ${hasToolcoinKey ? `<div style="margin-top:8px;font-size:0.75rem;color:#a855f7;word-break:break-all;"><strong>AES Key:</strong> <code>${toolcoinKeys.get(cleanId)}</code></div>` : ''}
        `;
        dlContainer.style.display = "block";
        reqContainer.style.display = "none";
    } else {
        dlContainer.style.display = "none";
        reqContainer.style.display = "block";
    }

    document.getElementById('pdpModal').classList.add('active');
}

function closePdp() {
    document.getElementById('pdpModal').classList.remove('active');
}

function submitRequest() {
    let name = prompt("Enter your Name or Discord ID to request:");
    if (!name) return;
    database.ref('requests').push().set({
        addon: document.getElementById('pdpTitle').innerText,
        user: name,
        status: "pending",
        timestamp: Date.now()
    }).then(() => {
        alert("✅ Request sent to Admin! Decrypted pack will be uploaded soon.");
        closePdp();
    });
}

function navigateCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (window.event && window.event.target) window.event.target.closest('.chip')?.classList.add('active');
    applyFilters();
}

function handleSearch() {
    currentSearch = document.getElementById('globalSearch').value.toLowerCase().trim();
    applyFilters();
}

function applyFilters() {
    displayedList = masterCatalog.filter(i => {
        let matchCat = (activeCategory === 'all') || (i.category === activeCategory);
        let matchQuery = !currentSearch || i.title.toLowerCase().includes(currentSearch) || i.creator.toLowerCase().includes(currentSearch);
        return matchCat && matchQuery;
    });

    updateCounterDisplay();
    renderBatchCards(true);
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 700) {
        renderBatchCards();
    }
}, { passive: true });

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-body').forEach(b => b.style.display = "none");
    if (window.event && window.event.target) window.event.target.closest('.tab-btn')?.classList.add('active');

    if (tab === 'desc') document.getElementById('tabDesc').style.display = "block";
    if (tab === 'howto') document.getElementById('tabHowTo').style.display = "block";
    if (tab === 'faq') document.getElementById('tabFaq').style.display = "block";
}

window.onload = function() {
    loadAvailableFromFirebase();
    loadToolcoinKeys();
    startCatalogStream();
};
