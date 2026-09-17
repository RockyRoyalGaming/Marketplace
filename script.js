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

// --- CORE ENGINE CONFIG ---
const MARKETPLACE_API = 'https://v5-mcsrc.github.io/data/api/marketplace';
const MARKETPLACE_ITEM_API = 'https://v5-mcsrc.github.io/data/api/marketplace/item';
const MARKETPLACE_IDB_NAME = 'marketplace_db';
const MARKETPLACE_IDB_STORE = 'items_cache';
const MARKETPLACE_IDB_KEY = 'all_items';
const PARALLEL_BATCH_SIZE = 15;

// State
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

// 2. SHUFFLE / RANDOMIZER
function shuffleItems(items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 3. INDEXEDDB PERSISTENT CACHE
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
    } catch (e) { return null; }
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
    } catch (e) { return false; }
}

// 4. PARALLEL STREAMING LOADER
async function initMarketplaceEngine() {
    if (catalogProgressContainer) catalogProgressContainer.style.display = "block";

    try {
        const cached = await idbGet(MARKETPLACE_IDB_KEY);
        if (cached && Array.isArray(cached.items) && cached.items.length >= 20000) {
            fullCatalog = cached.items;
            onAllItemsReady(fullCatalog.length);
            return;
        }
    } catch (e) {}

    let allItems = [];
    let currentPage = 1;
    let consecutiveEmpty = 0;
    const TOTAL_EXPECTED = 37382;

    while (true) {
        const batchPages = Array.from({ length: PARALLEL_BATCH_SIZE }, (_, i) => currentPage + i);
        
        try {
            const batchResults = await Promise.all(batchPages.map(async page => {
                try {
                    const res = await fetch(`${MARKETPLACE_API}/page/page-${page}.json`);
                    if (!res.ok) return [];
                    const json = await res.json();
                    return Array.isArray(json) ? json : (json.items || []);
                } catch (err) {
                    return [];
                }
            }));

            const flatItems = batchResults.flat();

            if (flatItems.length === 0) {
                consecutiveEmpty++;
                if (consecutiveEmpty >= 2 || allItems.length >= TOTAL_EXPECTED) {
                    break;
                }
            } else {
                consecutiveEmpty = 0;
            }

            flatItems.forEach(item => {
                let id = item.id || item.uuid;
                if (!id) return;
                
                let img = item.thumbnail || item.image || item.keyArt || "";
                if (!img) {
                    img = `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${id}/Thumbnail_0.jpg`;
                }

                allItems.push({
                    id: id,
                    title: item.title || item.name || "Minecraft DLC",
                    creator: item.author || item.creator || item.creatorName || "Mojang Partner",
                    category: (item.packType || item.category || item.type || "addon").toLowerCase(),
                    rating: item.rating ? Number(item.rating).toFixed(1) : "4.8",
                    views: item.totalRatings ? Number(item.totalRatings).toLocaleString() : (item.views ? Number(item.views).toLocaleString() : "2,100"),
                    desc: item.longDescription || item.description || item.snippet || item.desc || "Official Minecraft Marketplace DLC.",
                    image: img,
                    panorama: item.panorama || ""
                });
            });

            const seen = new Set();
            fullCatalog = allItems.filter(el => {
                const duplicate = seen.has(el.id);
                seen.add(el.id);
                return !duplicate;
            });

            let pct = Math.min(100, Math.floor((fullCatalog.length / TOTAL_EXPECTED) * 100));
            if (catalogProgressBar) catalogProgressBar.style.width = pct + "%";
            if (catalogStreamStats) catalogStreamStats.innerText = `${fullCatalog.length.toLocaleString()} Items (${pct}%)`;
            if (catalogNavCount) catalogNavCount.innerText = fullCatalog.length.toLocaleString();

            if (currentPage === 1 && fullCatalog.length > 0) {
                displayedList = shuffleItems(fullCatalog);
                renderBatchCards();
            } else if (currentSearch || activeCategory !== 'all') {
                applyCatalogFilters();
            }

            currentPage += PARALLEL_BATCH_SIZE;
            idbSet(MARKETPLACE_IDB_KEY, { items: fullCatalog, at: Date.now() });

        } catch (e) {
            currentPage += PARALLEL_BATCH_SIZE;
        }

        await new Promise(r => setTimeout(r, 60));
    }

    onAllItemsReady(fullCatalog.length);
}

function onAllItemsReady(total) {
    if (catalogStreamStatus) catalogStreamStatus.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> ${total.toLocaleString()} Items Synced!`;
    if (catalogStreamStats) catalogStreamStats.innerText = "100% Complete";
    if (catalogProgressBar) catalogProgressBar.style.width = "100%";
    if (catalogNavCount) catalogNavCount.innerText = total.toLocaleString();

    setTimeout(() => {
        if (catalogProgressContainer) catalogProgressContainer.style.display = "none";
    }, 1200);

    displayedList = shuffleItems(fullCatalog);
    renderedIndex = 0;
    if (catalogGrid) catalogGrid.innerHTML = "";
    renderBatchCards();
}

// 5. RENDER CARDS BATCH
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
                <span class="card-badge">${item.category.toUpperCase()}</span>
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

// 6. YOUTUBE EXTRACTOR HELPER
function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([^"&?/\s]{11})/);
    return match ? match[1] : null;
}

// 7. MODAL WITH FULL MEDIA (TRAILER, SCREENSHOTS & THUMBNAILS)
async function openItemModal(item, isCatalogItem) {
    currentModalItem = item;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();
    document.getElementById('modalDesc').innerText = item.desc;

    // Reset Media Stage
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
        let data = {};
        if (res.ok) {
            const details = await res.json();
            data = details.item || details;
        }

        // 1. Trailer & Screenshots Setup
        let mediaItems = [];
        let ytUrl = data.trailer || data.videoUrl || data.youtubeUrl || data.yt_embed;
        let ytId = extractYouTubeId(ytUrl);

        if (ytId) {
            mediaItems.push({
                type: 'video',
                thumb: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
                embed: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`
            });
        }

        // Main thumbnail
        if (currentModalItem && currentModalItem.image) {
            mediaItems.push({ type: 'image', url: currentModalItem.image, thumb: currentModalItem.image });
        }

        // Extra Screenshots from API
        let extra = [];
        if (Array.isArray(data.images)) extra.push(...data.images);
        if (Array.isArray(data.extraImages)) extra.push(...data.extraImages);
        if (Array.isArray(data.imageUrls)) extra.push(...data.imageUrls);

        // Fallback for packs like Actions & Stuff
        if (extra.length === 0) {
            extra.push(`https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${uuid}/Screenshot_0.jpg`);
            extra.push(`https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${uuid}/Screenshot_1.jpg`);
            extra.push(`https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${uuid}/KeyArt.jpg`);
        }

        extra.forEach(img => {
            let u = typeof img === 'string' ? img : (img.url || "");
            if (u) mediaItems.push({ type: 'image', url: u, thumb: u });
        });

        // Render Media Stage & Thumb Strip
        const stage = document.getElementById('mediaStage');
        const strip = document.getElementById('thumbStrip');
        if (stage && strip && mediaItems.length > 0) {
            strip.innerHTML = "";

            const setStageMedia = (item, activeIndex) => {
                if (item.type === 'video') {
                    stage.innerHTML = `<iframe src="${item.embed}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                } else {
                    stage.innerHTML = `<img src="${item.url}" alt="Screen">`;
                }
                strip.querySelectorAll('.thumb-strip-item').forEach((el, i) => {
                    el.classList.toggle('active', i === activeIndex);
                });
            };

            mediaItems.forEach((item, index) => {
                const thumbBtn = document.createElement('div');
                thumbBtn.className = `thumb-strip-item ${index === 0 ? 'active' : ''}`;
                thumbBtn.innerHTML = `
                    <img src="${item.thumb}" alt="thumb" onerror="this.parentElement.remove();">
                    ${item.type === 'video' ? '<div class="video-play-icon"><i class="fas fa-play"></i></div>' : ''}
                `;
                thumbBtn.onclick = () => setStageMedia(item, index);
                strip.appendChild(thumbBtn);
            });

            // Play trailer or display first image
            setStageMedia(mediaItems[0], 0);
        }

        // 2. Official Minecoins Price
        const priceRow = document.getElementById('modalPriceRow');
        const priceText = document.getElementById('modalPriceText');
        let coins = data.price || data.coins || data.coinPrice || (currentModalItem && currentModalItem.coinPrice);
        if (coins && priceRow && priceText) {
            priceText.innerText = `🪙 ${coins} Minecoins`;
            priceRow.style.display = "block";
        }

        // 3. Ratings & Total Votes
        const votesEl = document.getElementById('modalRatingVotes');
        let votes = data.totalRatings || data.ratingCount || data.total_ratings;
        if (votes && votesEl) {
            votesEl.innerText = Number(votes).toLocaleString();
        }

        // 4. Complete Description
        const descEl = document.getElementById('modalDesc');
        let fullDesc = data.longDescription || data.description || data.desc;
        if (fullDesc && descEl) {
            descEl.innerText = fullDesc;
        }

        // 5. Official 360 Panorama View
        const panoSec = document.getElementById('panoramaSection');
        const panoImg = document.getElementById('panoramaImg');
        let panoUrl = data.panoramaUrl || data.panoramaImage || data.panorama;
        if (typeof panoUrl === 'object') panoUrl = panoUrl?.url;

        if (panoUrl && panoSec && panoImg) {
            panoImg.src = panoUrl;
            panoSec.style.display = "block";
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

// 8. REAL-TIME SEARCH & FILTERS
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
