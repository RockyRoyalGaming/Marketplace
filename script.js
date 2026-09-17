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

// State
let availableItems = [];
let fullCatalog = [];
let displayedList = [];
let activeSection = 'catalog';
let activeCategory = 'all';
let currentSearch = '';
let currentPage = 1;
const TOTAL_PAGES = 78;
let isFetchingPage = false;
let currentModalItem = null;

// DOM Elements
const availableGrid = document.getElementById('availableGrid');
const catalogGrid = document.getElementById('catalogGrid');
const availableCountEl = document.getElementById('availableCount');
const catalogNavCount = document.getElementById('catalogNavCount');
const catalogStreamStatus = document.getElementById('catalogStreamStatus');
const catalogStreamStats = document.getElementById('catalogStreamStats');
const catalogProgressBar = document.getElementById('catalogProgressBar');
const catalogProgressContainer = document.getElementById('catalogProgressContainer');
const catalogScrollLoader = document.getElementById('catalogScrollLoader');
const itemModal = document.getElementById('itemModal');

window.onload = function() {
    closeAllModals();
    loadAvailableDLCs();
    switchMainSection('catalog');
    initMarketplaceStream();
};

function closeAllModals() {
    if (itemModal) itemModal.style.display = "none";
    let sm = document.getElementById('settingsModal');
    if (sm) sm.style.display = "none";
    let tm = document.getElementById('tutorialModal');
    if (tm) tm.style.display = "none";
}

function switchMainSection(section) {
    activeSection = section;
    document.querySelectorAll('.main-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

    if (section === 'available') {
        let btn = document.getElementById('tabBtnAvailable');
        let sec = document.getElementById('sectionAvailable');
        if (btn) btn.classList.add('active');
        if (sec) sec.classList.add('active');
    } else {
        let btn = document.getElementById('tabBtnCatalog');
        let sec = document.getElementById('sectionCatalog');
        if (btn) btn.classList.add('active');
        if (sec) sec.classList.add('active');
    }
}

// 1. AVAILABLE DLCS (FIREBASE)
function loadAvailableDLCs() {
    database.ref('market_items').on('value', snapshot => {
        availableItems = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                availableItems.push({ id: child.key, ...child.val() });
            });
        }
        if (availableCountEl) availableCountEl.innerText = availableItems.length;
        renderAvailableItems(availableItems);
    });
}

function renderAvailableItems(items) {
    if (!availableGrid) return;
    availableGrid.innerHTML = "";
    if (items.length === 0) {
        availableGrid.innerHTML = "<p style='color:#666; text-align:center; grid-column:1/-1; padding:20px;'>No available items uploaded yet.</p>";
        return;
    }

    items.forEach(item => {
        let thumb = (item.images && item.images[0]) ? item.images[0] : "https://placehold.co/300x170/1e293b/38bdf8?text=Strike+DLC";
        let card = document.createElement('div');
        card.className = "item-card";
        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${thumb}" alt="${item.title}" loading="lazy">
                <span class="card-badge">${(item.category || 'DLC').toUpperCase()}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${item.title}</h3>
                <div class="card-footer">
                    <span>${item.creator || 'RockyRG'}</span>
                </div>
            </div>
        `;
        card.onclick = () => openItemModal(item, false);
        availableGrid.appendChild(card);
    });
}

// 2. STABLE LIVE STREAM (NO PLACEHOLDER CARDS, DIRECT REAL DATA)
async function initMarketplaceStream() {
    if (catalogProgressContainer) catalogProgressContainer.style.display = "block";
    
    // First load Page 1 instantly
    await loadSingleCatalogPage(1);

    // Stream remaining pages in background
    streamAllPagesBackground();
}

async function loadSingleCatalogPage(page) {
    if (page > TOTAL_PAGES) return;
    try {
        const res = await fetch(`https://v5-mcsrc.github.io/data/api/marketplace/page/page-${page}.json`);
        if (!res.ok) return;

        const raw = await res.json();
        const rawList = Array.isArray(raw) ? raw : (raw.items || []);

        const parsed = rawList.map(item => {
            let id = item.id || item.uuid;
            let img = item.thumbnail || item.image || item.keyArt || "";
            if (!img && id) {
                img = `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${id}/Thumbnail_0.jpg`;
            }

            return {
                id: id,
                title: item.title || item.name || "Minecraft DLC",
                creator: item.author || item.creator || item.creatorName || "Mojang Partner",
                category: (item.packType || item.category || item.type || "addon").toLowerCase(),
                rating: item.rating ? Number(item.rating).toFixed(1) : "4.8",
                views: item.totalRatings ? Number(item.totalRatings).toLocaleString() : (item.views ? Number(item.views).toLocaleString() : "1,850"),
                desc: item.description || item.snippet || item.desc || "Official Minecraft Marketplace DLC.",
                image: img,
                coinPrice: item.price || item.coins || null,
                panorama: item.panorama || ""
            };
        });

        fullCatalog.push(...parsed);
        currentPage = page;

        // Render directly to screen if on initial load or filters match
        if (page === 1) {
            displayedList = [...fullCatalog];
            if (catalogGrid) catalogGrid.innerHTML = "";
            renderCardsList(displayedList);
        } else if (!currentSearch && activeCategory === 'all') {
            renderCardsList(parsed);
        }

        updateProgressUI();

    } catch (e) {
        console.warn(`Failed loading page ${page}:`, e);
    }
}

async function streamAllPagesBackground() {
    for (let p = 2; p <= TOTAL_PAGES; p++) {
        await loadSingleCatalogPage(p);
        await new Promise(r => setTimeout(r, 60)); // Prevents GitHub rate-limiting
    }

    if (catalogStreamStatus) catalogStreamStatus.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> All Items Synced!`;
    if (catalogProgressBar) catalogProgressBar.style.width = "100%";
    setTimeout(() => {
        if (catalogProgressContainer) catalogProgressContainer.style.display = "none";
    }, 1000);
}

function updateProgressUI() {
    let pct = Math.floor((currentPage / TOTAL_PAGES) * 100);
    if (catalogProgressBar) catalogProgressBar.style.width = pct + "%";
    if (catalogStreamStats) catalogStreamStats.innerText = `${fullCatalog.length.toLocaleString()} Loaded (${pct}%)`;
    if (catalogNavCount) catalogNavCount.innerText = fullCatalog.length.toLocaleString();
}

// 3. RENDER FUNCTION
function renderCardsList(items) {
    if (!catalogGrid) return;

    items.forEach(item => {
        let card = document.createElement('div');
        card.className = "item-card";

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${item.image}" alt="${item.title}" loading="lazy" 
                     onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg';">
                <span class="card-badge" style="background:#10b981;">${item.category.toUpperCase()}</span>
            </div>
            <div class="card-body">
                <div class="card-top-bar">
                    <span>⭐ ${item.rating}</span>
                    <span>🔥 ${item.views}</span>
                </div>
                <h3 class="card-title">${item.title}</h3>
                <div class="card-footer">
                    <span>${item.creator}</span>
                </div>
            </div>
        `;
        card.onclick = () => openItemModal(item, true);
        catalogGrid.appendChild(card);
    });
}

// 4. MODAL POPUP
async function openItemModal(item, isCatalogItem) {
    currentModalItem = item;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();
    document.getElementById('modalDesc').innerText = item.desc;

    // Carousel Image
    const track = document.getElementById('carouselTrack');
    track.innerHTML = `<img src="${item.image}" class="carousel-img">`;

    // Reset Panorama
    const panoSec = document.getElementById('panoramaSection');
    if (panoSec) panoSec.style.display = "none";

    const dwnSec = document.getElementById('modalDownloadSection');
    const reqSec = document.getElementById('modalRequestSection');

    if (isCatalogItem) {
        if (dwnSec) dwnSec.style.display = "none";
        if (reqSec) reqSec.style.display = "block";
        fetchItemDetails(item.id);
    } else {
        if (dwnSec) dwnSec.style.display = "block";
        if (reqSec) reqSec.style.display = "none";
        renderModalDownloadLinks(item);
    }

    if (itemModal) itemModal.style.display = "flex";
}

async function fetchItemDetails(uuid) {
    if (!uuid) return;
    try {
        const res = await fetch(`https://v5-mcsrc.github.io/data/api/marketplace/item/${uuid}.json`);
        if (!res.ok) return;
        const details = await res.json();

        // 1. In-game Screenshots
        const track = document.getElementById('carouselTrack');
        if (details.images && details.images.length > 0) {
            track.innerHTML = "";
            details.images.forEach(img => {
                let imgUrl = typeof img === 'string' ? img : (img.url || "");
                if (imgUrl) {
                    let im = document.createElement('img');
                    im.src = imgUrl;
                    im.className = "carousel-img";
                    track.appendChild(im);
                }
            });
        }

        // 2. Panorama 360 View
        const panoSec = document.getElementById('panoramaSection');
        const panoImg = document.getElementById('panoramaImg');
        let panoramaUrl = details.panorama || (details.images && details.images.find(im => im.type === 'Panorama' || (im.url && im.url.includes('Panorama'))));
        if (typeof panoramaUrl === 'object') panoramaUrl = panoramaUrl.url;

        if (panoramaUrl && panoSec && panoImg) {
            panoImg.src = panoramaUrl;
            panoSec.style.display = "block";
        }

        // 3. Price & Full Description
        const priceRow = document.getElementById('modalPriceRow');
        const priceText = document.getElementById('modalPriceText');
        let coins = details.price || details.coins || details.coinPrice;
        if (coins && priceRow && priceText) {
            priceText.innerText = `🪙 ${coins} Minecoins`;
            priceRow.style.display = "flex";
        }

        if (details.description || details.desc) {
            document.getElementById('modalDesc').innerText = details.description || details.desc;
        }

    } catch (e) {
        // PDP failure fallback
    }
}

function renderModalDownloadLinks(item) {
    const container = document.getElementById('modalLinksContainer');
    if (!container) return;
    container.innerHTML = "";

    if (item.fileBlocks && item.fileBlocks.length > 0) {
        item.fileBlocks.forEach(b => {
            const card = document.createElement('div');
            card.className = "download-group-card";
            card.innerHTML = `
                <div class="section-title">${b.title}</div>
                <a href="${b.mainLink.url}" target="_blank" class="dwn-option-btn">Download Now</a>
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = "<p style='color:#666; font-size:12px;'>No links available.</p>";
    }
}

function requestCurrentCatalogItem() {
    if (!currentModalItem) return;
    const userName = prompt("Enter your Name or Discord/WhatsApp:");
    if (!userName) return;

    database.ref('requests').push().set({
        addon: currentModalItem.title,
        link: `https://www.minecraft.net/en-us/marketplace/pdp?id=${currentModalItem.id}`,
        user: userName,
        status: "pending",
        timestamp: Date.now()
    }).then(() => {
        alert("✅ Request Sent to Admin! Download link will be uploaded soon.");
        closeModal();
    });
}

// 5. SEARCH & FILTER
let searchDebounce = null;
function handleGlobalSearch() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        let q = document.getElementById('globalSearch').value.toLowerCase().trim();
        currentSearch = q;

        if (activeSection === 'available') {
            let filtered = availableItems.filter(i => (i.title || '').toLowerCase().includes(q) || (i.creator || '').toLowerCase().includes(q));
            renderAvailableItems(filtered);
        } else {
            applyCatalogFilters();
        }
    }, 150);
}

function filterByCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.closest('.cat-pill').classList.add('active');

    if (activeSection === 'available') {
        let filtered = (cat === 'all') ? availableItems : availableItems.filter(i => (i.category || '').toLowerCase().includes(cat));
        renderAvailableItems(filtered);
    } else {
        applyCatalogFilters();
    }
}

function applyCatalogFilters() {
    displayedList = fullCatalog.filter(i => {
        let matchCat = (activeCategory === 'all') || (i.category.includes(activeCategory));
        let matchQuery = !currentSearch || i.title.toLowerCase().includes(currentSearch) || i.creator.toLowerCase().includes(currentSearch) || (i.id && i.id.toLowerCase().includes(currentSearch));
        return matchCat && matchQuery;
    });

    if (catalogGrid) catalogGrid.innerHTML = "";
    renderCardsList(displayedList);
}

function closeModal() { if (itemModal) itemModal.style.display = "none"; }
function openSettingsModal() { document.getElementById('settingsModal').style.display = "flex"; }
function closeSettingsModal() { document.getElementById('settingsModal').style.display = "none"; }
function openTutorialModal() { document.getElementById('tutorialModal').style.display = "flex"; }
function closeTutorialModal() { document.getElementById('tutorialModal').style.display = "none"; }
function openGeneralRequestModal() {
    let addon = prompt("Which Addon / World do you want?");
    if (!addon) return;
    let user = prompt("Your Name / Discord ID:");
    if (!user) return;
    database.ref('requests').push().set({
        addon: addon,
        user: user,
        status: "pending",
        timestamp: Date.now()
    }).then(() => alert("✅ Request submitted to Admin!"));
}
