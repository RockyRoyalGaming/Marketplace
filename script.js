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

// --- CONFIGURATION ---
const MARKETPLACE_API = 'https://v5-mcsrc.github.io/data/api/marketplace';
const MARKETPLACE_ITEM_API = 'https://v5-mcsrc.github.io/data/api/marketplace/item';
const MARKETPLACE_IDB_NAME = 'strike_core_v5';
const MARKETPLACE_IDB_STORE = 'catalog_cache';
const MARKETPLACE_IDB_KEY = 'all_items';
const PARALLEL_BATCH_SIZE = 15;
const BATCH_SIZE = 30;

// State
let availableItems = [];
let fullCatalog = [];
let displayedList = [];
let activeSection = 'catalog';
let activeCategory = 'all';
let currentSearch = '';
let renderedIndex = 0;
let isRendering = false;
let currentModalItem = null;
let detailFetchQueue = new Set();

// DOM Elements
const availableGrid = document.getElementById('availableGrid');
const catalogGrid = document.getElementById('catalogGrid');
const availableCountEl = document.getElementById('availableCount');
const catalogNavCount = document.getElementById('catalogNavCount');
const categoryFilterCount = document.getElementById('categoryFilterCount');
const catalogScrollLoader = document.getElementById('catalogScrollLoader');
const itemModal = document.getElementById('itemModal');

window.onload = function() {
    closeAllModals();
    loadAvailableDLCs();
    switchMainSection('catalog');
    initMarketplaceEngine();
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
        document.getElementById('tabBtnAvailable').classList.add('active');
        document.getElementById('sectionAvailable').classList.add('active');
    } else {
        document.getElementById('tabBtnCatalog').classList.add('active');
        document.getElementById('sectionCatalog').classList.add('active');
    }
}

// 1. FIREBASE AVAILABLE DLCS
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
        availableGrid.innerHTML = "<p style='color:#666; text-align:center; grid-column:1/-1; padding:30px;'>No available packs uploaded yet.</p>";
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
                    <span>${item.creator || 'Strike Partner'}</span>
                </div>
            </div>
        `;
        card.onclick = () => openItemModal(item, false);
        availableGrid.appendChild(card);
    });
}

// 2. SHUFFLE RANDOMIZER
function shuffleItems(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function formatLargeNumber(value) {
    const num = Number(value) || 0;
    if (num >= 1000000) return `${Math.round(num / 1000000)}M`;
    if (num >= 1000) return `${Math.round(num / 1000)}K`;
    return String(Math.round(num));
}

// Map Mojang raw type to standard filter key
function normalizeCategory(type) {
    let t = String(type || '').toLowerCase();
    if (t.includes('world')) return 'world';
    if (t.includes('skin')) return 'skin';
    if (t.includes('texture') || t.includes('mashup')) return 'texture';
    return 'addon';
}

// 3. INDEXEDDB
function idbOpen() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(MARKETPLACE_IDB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(MARKETPLACE_IDB_STORE)) {
                db.createObjectStore(MARKETPLACE_IDB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGet(key) {
    try {
        const db = await idbOpen();
        return new Promise((resolve) => {
            const tx = db.transaction(MARKETPLACE_IDB_STORE, 'readonly');
            const req = tx.objectStore(MARKETPLACE_IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}

async function idbSet(key, val) {
    try {
        const db = await idbOpen();
        return new Promise((resolve) => {
            const tx = db.transaction(MARKETPLACE_IDB_STORE, 'readwrite');
            tx.objectStore(MARKETPLACE_IDB_STORE).put(val, key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch { return false; }
}

// 4. STREAMING ENGINE
async function initMarketplaceEngine() {
    try {
        const cached = await idbGet(MARKETPLACE_IDB_KEY);
        if (cached && Array.isArray(cached.items) && cached.items.length >= 20000) {
            fullCatalog = cached.items;
            applyCatalogFilters();
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

                let normCat = normalizeCategory(item.packType || item.category || item.type);

                allItems.push({
                    id: id,
                    title: item.title || item.name || "Minecraft DLC",
                    creator: item.author || item.creator || item.creatorName || "Mojang Partner",
                    category: normCat,
                    displayCategory: (item.type || normCat).toUpperCase(),
                    rating: item.rating ? Number(item.rating).toFixed(1) : null,
                    total_ratings: item.ratingCount || item.totalRatings || null,
                    desc: item.longDescription || item.description || item.snippet || item.desc || "Official Minecraft Marketplace DLC.",
                    image: img,
                    coinPrice: item.price || item.coins || null,
                    _detailLoaded: false
                });
            });

            const seen = new Set();
            fullCatalog = allItems.filter(el => {
                const dup = seen.has(el.id);
                seen.add(el.id);
                return !dup;
            });

            if (catalogNavCount) catalogNavCount.innerText = fullCatalog.length.toLocaleString();

            if (currentPage === 1 && fullCatalog.length > 0) {
                applyCatalogFilters();
            }

            currentPage += PARALLEL_BATCH_SIZE;
            idbSet(MARKETPLACE_IDB_KEY, { items: fullCatalog, at: Date.now() });

        } catch {
            currentPage += PARALLEL_BATCH_SIZE;
        }

        await new Promise(r => setTimeout(r, 60));
    }

    applyCatalogFilters();
}

// 5. RENDER BATCH
function renderBatchCards() {
    if (isRendering || renderedIndex >= displayedList.length) return;
    isRendering = true;
    if (catalogScrollLoader) catalogScrollLoader.style.display = "block";

    const slice = displayedList.slice(renderedIndex, renderedIndex + BATCH_SIZE);

    slice.forEach(item => {
        let card = document.createElement('div');
        card.className = "item-card";
        card.dataset.uuid = item.id;

        let ratingHtml = item.rating ? `<span>⭐ ${item.rating}</span>` : `<span>⭐ 4.5</span>`;
        let votesHtml = item.total_ratings ? `<span>🔥 ${formatLargeNumber(item.total_ratings)}</span>` : ``;

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg';">
                <span class="card-badge">${item.displayCategory}</span>
            </div>
            <div class="card-body">
                <div class="card-top-bar">
                    ${ratingHtml}
                    ${votesHtml}
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

    setTimeout(fetchDetailsForVisibleCards, 150);
}

// Visible Cards Live Hydration
async function fetchDetailsForVisibleCards() {
    if (!catalogGrid) return;
    const cards = catalogGrid.querySelectorAll('[data-uuid]');
    const toFetch = [];

    cards.forEach(el => {
        const uuid = el.dataset.uuid;
        const item = fullCatalog.find(i => i.id === uuid);
        if (item && !item._detailLoaded && !detailFetchQueue.has(uuid)) {
            toFetch.push(item);
            detailFetchQueue.add(uuid);
        }
    });

    if (toFetch.length === 0) return;

    const concurrency = 4;
    let idx = 0;
    async function worker() {
        while (idx < toFetch.length) {
            const item = toFetch[idx++];
            try {
                const res = await fetch(`${MARKETPLACE_ITEM_API}/${item.id}.json`);
                if (res.ok) {
                    const json = await res.json();
                    const d = json.item || json;
                    if (d.rating) item.rating = Number(d.rating).toFixed(1);
                    if (d.ratingCount || d.totalRatings) item.total_ratings = d.ratingCount || d.totalRatings;
                    if (d.price || d.coins) item.coinPrice = d.price || d.coins;
                    if (d.description || d.longDescription) item.desc = d.longDescription || d.description;

                    const cardEl = catalogGrid.querySelector(`[data-uuid="${item.id}"]`);
                    if (cardEl) {
                        const topBar = cardEl.querySelector('.card-top-bar');
                        if (topBar) {
                            topBar.innerHTML = `
                                <span>⭐ ${item.rating || '4.8'}</span>
                                ${item.total_ratings ? `<span>🔥 ${formatLargeNumber(item.total_ratings)}</span>` : ''}
                            `;
                        }
                    }
                }
            } catch {}
            item._detailLoaded = true;
        }
    }

    for (let i = 0; i < concurrency; i++) worker();
}

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (activeSection === 'catalog') {
        const scrollPos = window.innerHeight + window.pageYOffset;
        const threshold = document.documentElement.scrollHeight - 1000;
        if (scrollPos >= threshold) {
            renderBatchCards();
        }
    }
}, { passive: true });

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([^"&?/\s]{11})/);
    return match ? match[1] : null;
}

// 6. PDP MODAL (TRAILER, PRICE & SCREENSHOTS)
async function openItemModal(item, isCatalogItem) {
    currentModalItem = item;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = item.displayCategory;
    document.getElementById('modalDesc').innerText = item.desc;

    // Reset Price
    const priceText = document.getElementById('modalPriceText');
    const priceRow = document.getElementById('modalPriceRow');
    if (item.coinPrice) {
        priceText.innerText = `🪙 ${item.coinPrice} Minecoins`;
        priceRow.style.display = "block";
    } else {
        priceRow.style.display = "none";
    }

    // Reset Votes
    const votesEl = document.getElementById('modalRatingVotes');
    const starsEl = document.getElementById('modalRatingStars');
    votesEl.innerText = item.total_ratings ? `(${Number(item.total_ratings).toLocaleString()})` : "";
    starsEl.innerText = "⭐".repeat(Math.round(Number(item.rating || 5)));

    const stage = document.getElementById('mediaStage');
    const strip = document.getElementById('thumbStrip');
    if (stage) stage.innerHTML = `<img src="${item.image}" alt="Preview">`;
    if (strip) strip.innerHTML = "";

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
        const res = await fetch(`${MARKETPLACE_ITEM_API}/${uuid}.json`);
        if (!res.ok) return;
        const details = await res.json();
        const data = details.item || details;

        let mediaItems = [];
        let ytUrl = data.trailer || data.videoUrl || data.youtubeUrl;
        let ytId = extractYouTubeId(ytUrl);

        if (ytId) {
            mediaItems.push({
                type: 'video',
                thumb: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
                embed: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`
            });
        }

        if (currentModalItem && currentModalItem.image) {
            mediaItems.push({ type: 'image', url: currentModalItem.image, thumb: currentModalItem.image });
        }

        let extra = [];
        if (Array.isArray(data.images)) extra.push(...data.images);
        if (Array.isArray(data.extraImages)) extra.push(...data.extraImages);

        extra.forEach(img => {
            let u = typeof img === 'string' ? img : (img.url || "");
            if (u) mediaItems.push({ type: 'image', url: u, thumb: u });
        });

        const stage = document.getElementById('mediaStage');
        const strip = document.getElementById('thumbStrip');
        if (stage && strip && mediaItems.length > 0) {
            strip.innerHTML = "";

            const setStageMedia = (mediaItem, activeIndex) => {
                if (mediaItem.type === 'video') {
                    stage.innerHTML = `<iframe src="${mediaItem.embed}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                } else {
                    stage.innerHTML = `<img src="${mediaItem.url}" alt="Screen">`;
                }
                strip.querySelectorAll('.thumb-strip-item').forEach((el, i) => {
                    el.classList.toggle('active', i === activeIndex);
                });
            };

            mediaItems.forEach((mediaItem, index) => {
                const thumbBtn = document.createElement('div');
                thumbBtn.className = `thumb-strip-item ${index === 0 ? 'active' : ''}`;
                thumbBtn.innerHTML = `
                    <img src="${mediaItem.thumb}" alt="thumb" onerror="this.parentElement.remove();">
                    ${mediaItem.type === 'video' ? '<div class="video-play-icon"><i class="fas fa-play"></i></div>' : ''}
                `;
                thumbBtn.onclick = () => setStageMedia(mediaItem, index);
                strip.appendChild(thumbBtn);
            });

            setStageMedia(mediaItems[0], 0);
        }

        let coins = data.price || data.coins || data.coinPrice;
        if (coins) {
            document.getElementById('modalPriceText').innerText = `🪙 ${coins} Minecoins`;
            document.getElementById('modalPriceRow').style.display = "block";
        }

        let votes = data.ratingCount || data.totalRatings;
        if (votes) {
            document.getElementById('modalRatingVotes').innerText = `(${Number(votes).toLocaleString()})`;
        }

        let fullDesc = data.longDescription || data.description;
        if (fullDesc) {
            document.getElementById('modalDesc').innerText = fullDesc;
        }

        let panoUrl = data.panoramaUrl || data.panoramaImage || data.panorama;
        if (typeof panoUrl === 'object') panoUrl = panoUrl?.url;
        const panoSec = document.getElementById('panoramaSection');
        const panoImg = document.getElementById('panoramaImg');
        if (panoUrl && panoSec && panoImg) {
            panoImg.src = panoUrl;
            panoSec.style.display = "block";
        }

    } catch (e) {
        console.warn(e);
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

// 7. REAL-TIME SEARCH & CATEGORY FILTERS
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
    if (event && event.target) {
        let btn = event.target.closest('.cat-pill');
        if (btn) btn.classList.add('active');
    }

    if (activeSection === 'available') {
        let filtered = (cat === 'all') ? availableItems : availableItems.filter(i => (i.category || '').toLowerCase().includes(cat));
        renderAvailableItems(filtered);
    } else {
        applyCatalogFilters();
    }
}

function applyCatalogFilters() {
    let matches = fullCatalog.filter(i => {
        let matchCat = (activeCategory === 'all') || (i.category === activeCategory);
        let matchQuery = !currentSearch || i.title.toLowerCase().includes(currentSearch) || i.creator.toLowerCase().includes(currentSearch) || (i.id && i.id.toLowerCase().includes(currentSearch));
        return matchCat && matchQuery;
    });

    displayedList = shuffleItems(matches);

    if (categoryFilterCount) {
        categoryFilterCount.innerText = `${displayedList.length.toLocaleString()} ${activeCategory.toUpperCase()} ITEMS`;
    }

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
