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
const MARKETPLACE_IDB_NAME = 'strike_db_final';
const MARKETPLACE_IDB_STORE = 'catalog_cache';
const MARKETPLACE_IDB_KEY = 'all_items';
const PARALLEL_BATCH_SIZE = 15;
const ITEMS_PER_PAGE = 30;

// State
let fullCatalog = [];
let displayedList = [];
let activeCategory = 'all';
let currentSearch = '';
let renderedIndex = 0;
let isRendering = false;
let currentModalItem = null;
let detailFetchQueue = new Set();

// DOM
const itemContainer = document.getElementById('itemContainer');
const logoLoadIndicator = document.getElementById('logoLoadIndicator');
const categoryCount = document.getElementById('categoryCount');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const downloadOverlay = document.getElementById('downloadOverlay');
const closeModal = document.getElementById('closeModal');
const modalRequestBtn = document.getElementById('modalRequestBtn');

window.onload = function() {
    createStars();
    initMarketplaceStream();
};

function createStars() {
    const container = document.getElementById('stars');
    if (!container) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2 + 1;
        star.style.width = star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.setProperty('--anim-dur', `${Math.random() * 3 + 2}s`);
        frag.appendChild(star);
    }
    container.appendChild(frag);
}

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

// Parallel Stream Loader
async function initMarketplaceStream() {
    try {
        const cached = await idbGet(MARKETPLACE_IDB_KEY);
        if (cached && Array.isArray(cached.items) && cached.items.length >= 20000) {
            fullCatalog = cached.items;
            onStreamComplete();
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

                allItems.push({
                    uuid: id,
                    title: item.title || item.name || "Minecraft DLC",
                    creator: item.author || item.creator || item.creatorName || "Mojang Partner",
                    category: (item.packType || item.category || item.type || "addons").toLowerCase(),
                    subtitle: item.type || "DLC",
                    rating: item.rating ? Number(item.rating).toFixed(1) : null,
                    total_ratings: item.ratingCount || item.totalRatings || null,
                    desc: item.longDescription || item.description || item.snippet || item.desc || "Official Minecraft Marketplace DLC.",
                    image: img,
                    price: item.price || item.coins || null,
                    _detailLoaded: false
                });
            });

            const seen = new Set();
            fullCatalog = allItems.filter(el => {
                const dup = seen.has(el.uuid);
                seen.add(el.uuid);
                return !dup;
            });

            let pct = Math.min(100, Math.floor((fullCatalog.length / TOTAL_EXPECTED) * 100));
            if (logoLoadIndicator) logoLoadIndicator.innerText = `LOADING ITEMS ${pct}%`;

            if (currentPage === 1 && fullCatalog.length > 0) {
                applyCategoryFilter('all');
            }

            currentPage += PARALLEL_BATCH_SIZE;
            idbSet(MARKETPLACE_IDB_KEY, { items: fullCatalog, at: Date.now() });

        } catch {
            currentPage += PARALLEL_BATCH_SIZE;
        }

        await new Promise(r => setTimeout(r, 60));
    }

    onStreamComplete();
}

function onStreamComplete() {
    if (logoLoadIndicator) logoLoadIndicator.innerText = `${fullCatalog.length.toLocaleString()} ITEMS LOADED`;
    applyCategoryFilter(activeCategory);
}

// Render Batch Cards
function renderBatch() {
    if (isRendering || renderedIndex >= displayedList.length) return;
    isRendering = true;

    const slice = displayedList.slice(renderedIndex, renderedIndex + ITEMS_PER_PAGE);

    slice.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = "item";
        itemEl.dataset.uuid = item.uuid;

        let ratingHtml = item.rating ? `<div class="rating-block"><i class="fas fa-star"></i><span>${item.rating}</span></div>` : `<div></div>`;
        let votesHtml = item.total_ratings ? `<div class="rating-block total-ratings-block"><i class="fas fa-fire"></i><span>${formatLargeNumber(item.total_ratings)}</span></div>` : ``;

        itemEl.innerHTML = `
            <div class="item-content">
                <h2>${item.title}</h2>
                <div class="title-row">
                    <p class="subtitle">${item.subtitle || 'DLC'} by ${item.creator}</p>
                </div>
                <div class="item-rating-row">
                    ${ratingHtml}
                    ${votesHtml}
                </div>
                <div class="img-wrapper">
                    <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.uuid}/Thumbnail_0.jpg';">
                </div>
            </div>
        `;

        itemEl.onclick = () => openItemModal(item);
        itemContainer.appendChild(itemEl);
    });

    renderedIndex += slice.length;
    isRendering = false;

    setTimeout(fetchDetailsForVisibleCards, 120);
}

// Live Real Ratings Hydration
async function fetchDetailsForVisibleCards() {
    if (!itemContainer) return;
    const cards = itemContainer.querySelectorAll('[data-uuid]');
    const toFetch = [];

    cards.forEach(el => {
        const uuid = el.dataset.uuid;
        const item = fullCatalog.find(i => i.uuid === uuid);
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
                const res = await fetch(`${MARKETPLACE_ITEM_API}/${item.uuid}.json`);
                if (res.ok) {
                    const json = await res.json();
                    const d = json.item || json;
                    if (d.rating) item.rating = Number(d.rating).toFixed(1);
                    if (d.ratingCount || d.totalRatings) item.total_ratings = d.ratingCount || d.totalRatings;
                    if (d.price || d.coins) item.price = d.price || d.coins;
                    if (d.description || d.longDescription) item.desc = d.longDescription || d.description;

                    const cardEl = itemContainer.querySelector(`[data-uuid="${item.uuid}"]`);
                    if (cardEl) {
                        const row = cardEl.querySelector('.item-rating-row');
                        if (row) {
                            row.innerHTML = `
                                <div class="rating-block"><i class="fas fa-star"></i><span>${item.rating || '4.8'}</span></div>
                                ${item.total_ratings ? `<div class="rating-block total-ratings-block"><i class="fas fa-fire"></i><span>${formatLargeNumber(item.total_ratings)}</span></div>` : ''}
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

// Category Filters & Shuffle
function applyCategoryFilter(cat) {
    activeCategory = cat;
    document.querySelectorAll('.category-buttons button').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === cat);
    });

    let filtered = fullCatalog.filter(i => {
        let matchCat = (cat === 'all') || (i.category.includes(cat));
        let matchQuery = !currentSearch || i.title.toLowerCase().includes(currentSearch) || i.creator.toLowerCase().includes(currentSearch);
        return matchCat && matchQuery;
    });

    displayedList = shuffleItems(filtered);

    if (categoryCount) {
        categoryCount.innerText = `${displayedList.length.toLocaleString()} ${cat.toUpperCase()}`;
    }

    renderedIndex = 0;
    if (itemContainer) itemContainer.innerHTML = "";
    renderBatch();
}

document.querySelectorAll('.category-buttons button').forEach(btn => {
    btn.onclick = () => applyCategoryFilter(btn.dataset.filter || 'all');
});

// Search
function handleSearch() {
    currentSearch = (searchInput.value || '').trim().toLowerCase();
    applyCategoryFilter(activeCategory);
}
searchInput?.addEventListener('keyup', handleSearch);
searchBtn?.addEventListener('click', handleSearch);

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 600) {
        renderBatch();
    }
}, { passive: true });

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:embed\/|v\/|watch\?v=)|youtu\.be\/)([^"&?/\s]{11})/);
    return match ? match[1] : null;
}

// Modal Detail View
async function openItemModal(item) {
    currentModalItem = item;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalType').innerText = `${(item.subtitle || 'DLC').toUpperCase()} - by ${item.creator}`;
    document.getElementById('modalDescriptionContent').innerText = item.desc;

    const ratingVal = document.getElementById('modalRatingValue');
    const totalVotes = document.getElementById('modalTotalRatings');
    ratingVal.innerText = item.rating || "4.8";
    totalVotes.innerText = item.total_ratings ? `(${Number(item.total_ratings).toLocaleString()})` : '';

    const track = document.getElementById('sliderTrack');
    const thumbs = document.getElementById('sliderThumbs');
    track.innerHTML = `<img src="${item.image}" alt="cover">`;
    thumbs.innerHTML = "";

    if (downloadOverlay) downloadOverlay.classList.add('active');
    document.body.style.overflow = "hidden";

    // Fetch Full PDP Media (Trailer & Images)
    try {
        const res = await fetch(`${MARKETPLACE_ITEM_API}/${item.uuid}.json`);
        if (res.ok) {
            const json = await res.json();
            const d = json.item || json;

            let mediaList = [];
            let ytUrl = d.trailer || d.videoUrl || d.youtubeUrl;
            let ytId = extractYouTubeId(ytUrl);

            if (ytId) {
                mediaList.push({ type: 'video', thumb: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`, embed: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0` });
            }

            mediaList.push({ type: 'image', url: item.image, thumb: item.image });

            let extra = d.images || d.extraImages || [];
            extra.forEach(img => {
                let u = typeof img === 'string' ? img : (img.url || "");
                if (u) mediaList.push({ type: 'image', url: u, thumb: u });
            });

            if (mediaList.length > 0) {
                const setMedia = (m, idx) => {
                    if (m.type === 'video') {
                        track.innerHTML = `<iframe src="${m.embed}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                    } else {
                        track.innerHTML = `<img src="${m.url}" alt="screenshot">`;
                    }
                    thumbs.querySelectorAll('.thumb-item').forEach((el, i) => el.classList.toggle('active', i === idx));
                };

                thumbs.innerHTML = "";
                mediaList.forEach((m, idx) => {
                    let t = document.createElement('div');
                    t.className = `thumb-item ${idx === 0 ? 'active' : ''}`;
                    t.innerHTML = `<img src="${m.thumb}" alt="thumb">`;
                    t.onclick = () => setMedia(m, idx);
                    thumbs.appendChild(t);
                });

                setMedia(mediaList[0], 0);
            }

            if (d.description || d.longDescription) {
                document.getElementById('modalDescriptionContent').innerText = d.longDescription || d.description;
            }
        }
    } catch {}
}

function closeModalOverlay() {
    if (downloadOverlay) downloadOverlay.classList.remove('active');
    document.body.style.overflow = "";
}
closeModal?.addEventListener('click', closeModalOverlay);
downloadOverlay?.addEventListener('click', (e) => {
    if (e.target === downloadOverlay) closeModalOverlay();
});

modalRequestBtn?.addEventListener('click', () => {
    if (!currentModalItem) return;
    const user = prompt("Enter your Name or Discord/WhatsApp:");
    if (!user) return;
    
    database.ref('requests').push().set({
        addon: currentModalItem.title,
        link: `https://www.minecraft.net/en-us/marketplace/pdp?id=${currentModalItem.uuid}`,
        user: user,
        status: "pending",
        timestamp: Date.now()
    }).then(() => {
        alert("✅ Request sent to Admin!");
        closeModalOverlay();
    });
});
