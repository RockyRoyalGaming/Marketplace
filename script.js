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
let activeCategory = 'all';
let currentSearch = '';
let renderedIndex = 0;
const BATCH_SIZE = 24;
let isRendering = false;

const itemsGrid = document.getElementById('itemsGrid');
const itemCountLabel = document.getElementById('itemCountLabel');
const scrollLoader = document.getElementById('scrollLoader');

// 1. Firebase Live Items (Downloadable Checkmarks)
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

// 2. High-Speed Catalog Loader (Fallback + Stream Pipeline)
async function startCatalogStream() {
    let rawItems = [];

    // Pehle static full list try karega, agar fail hua toh pagination par jayega
    try {
        const fullRes = await fetch('https://v5-mcsrc.github.io/data/api/marketplace/all.json');
        if (fullRes.ok) {
            const fullData = await fullRes.json();
            rawItems = Array.isArray(fullData) ? fullData : (fullData.items || []);
        }
    } catch (e) {
        console.warn("Full catalog direct fetch blocked, using parallel pages...");
    }

    if (rawItems.length > 0) {
        processAndIngestItems(rawItems);
        applyFilters();
        return;
    }

    // Parallel multi-page fetch (30 pages ek sath fire karega bina delay ke)
    let page = 1;
    while (page <= 100) {
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
        const batchItems = results.flat();
        if (batchItems.length === 0) break;

        processAndIngestItems(batchItems);
        if (page === 1) applyFilters();
        else updateCounterDisplay();

        page += 10;
    }
}

function processAndIngestItems(items) {
    items.forEach(item => {
        let id = item.id || item.uuid;
        if (!id) return;

        let img = item.thumbnail || item.image || item.keyArt || "";
        if (!img) {
            img = `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${id}/Thumbnail_0.jpg`;
        }

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
            desc: item.longDescription || item.description || item.snippet || "Official Marketplace DLC content."
        });
    });

    // Unique items filter
    const seen = new Set();
    masterCatalog = masterCatalog.filter(i => {
        let dup = seen.has(i.id);
        seen.add(i.id);
        return !dup;
    });
}

function updateCounterDisplay() {
    if (itemCountLabel) {
        itemCountLabel.innerText = `${displayedList.length.toLocaleString()} ITEMS LOADED`;
    }
}

// 3. Clean Card Batch Rendering (Card layout fixed)
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
        let isAvail = availableDb.has(String(item.id).toLowerCase());
        let card = document.createElement('div');
        card.className = "item-card";

        card.innerHTML = `
            <div class="card-thumb-wrap">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg';">
                <span class="card-type-overlay">${item.displayCategory}</span>
                ${isAvail ? `<div class="card-avail-badge" title="Download Ready"><i class="fas fa-check"></i></div>` : ''}
            </div>
            <div class="card-body">
                <div class="card-top-stat">
                    <span>★ ${item.rating}</span>
                    <span class="card-status-label ${isAvail ? 'ready' : 'unavail'}">${isAvail ? 'READY' : 'UNAVAILABLE'}</span>
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

// 4. Filtering & Search
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

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 700) {
        renderBatchCards();
    }
}, { passive: true });

// 5. PDP Modal Setup
function openPdpModal(item) {
    let isAvail = availableDb.has(String(item.id).toLowerCase());
    document.getElementById('pdpTitle').innerText = item.title;
    document.getElementById('pdpDescription').innerText = item.desc;
    document.getElementById('pdpStage').innerHTML = `<img src="${item.image}" alt="stage">`;

    let dlContainer = document.getElementById('downloadContainer');
    let reqContainer = document.getElementById('unavailableContainer');

    if (isAvail) {
        let dbData = availableDb.get(String(item.id).toLowerCase());
        let directUrl = (dbData.fileBlocks && dbData.fileBlocks[0]?.mainLink?.url) || "";
        document.getElementById('shortenerLinks').innerHTML = `
            <a href="https://link-target.net/your_id/dlc?url=${encodeURIComponent(directUrl)}" target="_blank" class="short-btn linkvertise">
                <span><i class="fas fa-bolt"></i> Download (Linkvertise)</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="https://work.ink/your_id/${encodeURIComponent(directUrl)}" target="_blank" class="short-btn workink">
                <span><i class="fas fa-download"></i> Download (Work.ink)</span>
                <i class="fas fa-chevron-right"></i>
            </a>
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
        alert("✅ Request submitted to Admin!");
        closePdp();
    });
}

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
    startCatalogStream();
};
