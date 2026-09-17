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

// State Variables
let availableItems = [];
let fullCatalog = [];
let displayedList = [];
let activeSection = 'catalog';
let activeCategory = 'all';
let currentSearch = '';
let renderedIndex = 0;
const BATCH_SIZE = 30;
let isRendering = false;
let currentModalItem = null;

// Total 78 pages to load all 37,382 items
const TOTAL_PAGES = 78;

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
    fetchAllMarketplaceItemsFullStream();
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

// 2. SEQUENTIAL STREAMING ENGINE (LOADS ALL 37,382 ITEMS WITHOUT HANGING)
async function fetchAllMarketplaceItemsFullStream() {
    if (catalogProgressContainer) catalogProgressContainer.style.display = "block";
    if (catalogStreamStatus) catalogStreamStatus.innerHTML = `<i class="fas fa-satellite-dish fa-spin"></i> Streaming Live Marketplace...`;

    for (let page = 1; page <= TOTAL_PAGES; page++) {
        try {
            const res = await fetch(`https://v5-mcsrc.github.io/data/api/marketplace/page/page-${page}.json`);
            if (!res.ok) {
                await new Promise(r => setTimeout(r, 200));
                continue;
            }

            const raw = await res.json();
            const rawList = Array.isArray(raw) ? raw : (raw.items || []);

            const parsed = rawList.map(item => {
                let img = item.thumbnail || item.image || item.keyArt || "";
                if (!img && item.id) {
                    img = `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg`;
                }
                return {
                    id: item.id || item.uuid,
                    title: item.title || item.name || "Minecraft Item",
                    creator: item.author || item.creator || item.creatorName || "Mojang Partner",
                    category: (item.packType || item.category || item.type || "addon").toLowerCase(),
                    rating: item.rating ? Number(item.rating).toFixed(1) : "4.8",
                    views: item.totalRatings ? Number(item.totalRatings).toLocaleString() : (item.views ? Number(item.views).toLocaleString() : "2,400"),
                    desc: item.description || item.snippet || item.desc || "Official Minecraft Marketplace DLC.",
                    image: img,
                    coinPrice: item.price || item.coins || null,
                    panorama: item.panorama || ""
                };
            });

            fullCatalog.push(...parsed);

            // Live progress update
            let pct = Math.floor((page / TOTAL_PAGES) * 100);
            if (catalogProgressBar) catalogProgressBar.style.width = pct + "%";
            if (catalogStreamStats) catalogStreamStats.innerText = `${fullCatalog.length.toLocaleString()} Items (${pct}%)`;
            if (catalogNavCount) catalogNavCount.innerText = fullCatalog.length.toLocaleString();

            // First page renders instantly so screen is never blank
            if (page === 1) {
                displayedList = [...fullCatalog];
                renderBatchCards();
            } else if (currentSearch || activeCategory !== 'all') {
                // If user is searching while stream continues, update results
                applyCatalogFilters();
            }

            // Anti-throttling short delay
            await new Promise(r => setTimeout(r, 40));

        } catch (err) {
            console.warn(`Page ${page} skipped:`, err);
        }
    }

    if (catalogStreamStatus) catalogStreamStatus.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> 37,382 Items Synced!`;
    if (catalogStreamStats) catalogStreamStats.innerText = "100% Complete";
    if (catalogProgressBar) catalogProgressBar.style.width = "100%";

    setTimeout(() => {
        if (catalogProgressContainer) catalogProgressContainer.style.display = "none";
    }, 1200);

    applyCatalogFilters();
}

// 3. BATCH CARDS RENDERER
function renderBatchCards() {
    if (isRendering || renderedIndex >= displayedList.length) return;
    isRendering = true;
    if (catalogScrollLoader) catalogScrollLoader.style.display = "block";

    const slice = displayedList.slice(renderedIndex, renderedIndex + BATCH_SIZE);

    slice.forEach(item => {
        let card = document.createElement('div');
        card.className = "item-card";

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg';">
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

    renderedIndex += slice.length;
    isRendering = false;
    if (catalogScrollLoader) catalogScrollLoader.style.display = "none";
}

// Infinite Scroll for smooth scrolling
window.addEventListener('scroll', () => {
    if (activeSection === 'catalog') {
        const scrollPos = window.innerHeight + window.pageYOffset;
        const threshold = document.documentElement.scrollHeight - 1000;
        if (scrollPos >= threshold) {
            renderBatchCards();
        }
    }
}, { passive: true });

// 4. MODAL POPUP WITH PDP DETAILS (FULL SCREENSHOTS, COINS, PANORAMA)
async function openItemModal(item, isCatalogItem) {
    currentModalItem = item;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();
    document.getElementById('modalDesc').innerText = item.desc;

    // Reset price display
    const priceRow = document.getElementById('modalPriceRow');
    const priceText = document.getElementById('modalPriceText');
    if (item.coinPrice && priceRow && priceText) {
        priceText.innerText = `🪙 ${item.coinPrice} Minecoins`;
        priceRow.style.display = "flex";
    } else if (priceRow) {
        priceRow.style.display = "none";
    }

    // Carousel primary thumbnail
    const track = document.getElementById('carouselTrack');
    track.innerHTML = `<img src="${item.image}" class="carousel-img">`;

    // Panorama reset
    const panoSec = document.getElementById('panoramaSection');
    const panoImg = document.getElementById('panoramaImg');
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

// Fetch Full PDP Metadata
async function fetchItemDetails(uuid) {
    if (!uuid) return;
    try {
        const res = await fetch(`https://v5-mcsrc.github.io/data/api/marketplace/item?id=${uuid}.json`);
        if (!res.ok) return;
        const details = await res.json();

        // 1. In-game screenshots
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

        // 2. 360 Panorama View
        const panoSec = document.getElementById('panoramaSection');
        const panoImg = document.getElementById('panoramaImg');
        let panoramaUrl = details.panorama || (details.images && details.images.find(im => im.type === 'Panorama' || (im.url && im.url.includes('Panorama'))));
        if (typeof panoramaUrl === 'object') panoramaUrl = panoramaUrl.url;

        if (panoramaUrl && panoSec && panoImg) {
            panoImg.src = panoramaUrl;
            panoSec.style.display = "block";
        }

        // 3. Minecoin price update
        const priceRow = document.getElementById('modalPriceRow');
        const priceText = document.getElementById('modalPriceText');
        let coins = details.price || details.coinPrice;
        if (coins && priceRow && priceText) {
            priceText.innerText = `🪙 ${coins} Minecoins`;
            priceRow.style.display = "flex";
        }

        // 4. Full description update
        if (details.description || details.desc) {
            document.getElementById('modalDesc').innerText = details.description || details.desc;
        }

    } catch (e) {
        console.warn("PDP details fetch error:", e);
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

// 5. REAL-TIME SEARCH & CATEGORY FILTERS
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

    renderedIndex = 0;
    if (catalogGrid) catalogGrid.innerHTML = "";
    renderBatchCards();
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
