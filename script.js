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
let allKeys = [];
let activeSection = 'catalog';
let activeCategory = 'all';
let currentSearch = '';
let renderedIndex = 0;
const BATCH_SIZE = 24;
let isRendering = false;
let currentModalItem = null;
let itemCache = new Map();

// DOM
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
    loadKeysCatalog();
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

// 2. LOAD 37,382 KEYS AND POPULATE ON SCREEN
async function loadKeysCatalog() {
    if (catalogProgressContainer) catalogProgressContainer.style.display = "block";
    if (catalogProgressBar) catalogProgressBar.style.width = "40%";

    try {
        const res = await fetch("https://yf2pv10.github.io/tempkeys/api/keys/keys.json");
        if (!res.ok) throw new Error("Keys API Failed");
        const raw = await res.json();

        // Extract UUIDs
        if (Array.isArray(raw)) {
            allKeys = raw.map(x => typeof x === 'string' ? x : (x.id || x.uuid)).filter(Boolean);
        } else if (typeof raw === 'object') {
            allKeys = Object.keys(raw);
        }

        if (catalogNavCount) catalogNavCount.innerText = allKeys.length.toLocaleString();
        if (catalogStreamStats) catalogStreamStats.innerText = `${allKeys.length.toLocaleString()} Items Live`;
        if (catalogProgressBar) catalogProgressBar.style.width = "100%";

        setTimeout(() => {
            if (catalogProgressContainer) catalogProgressContainer.style.display = "none";
        }, 700);

        renderedIndex = 0;
        if (catalogGrid) catalogGrid.innerHTML = "";
        renderBatch();

    } catch (e) {
        console.error("Keys load error:", e);
        if (catalogStreamStatus) {
            catalogStreamStatus.innerHTML = `<span style="color:#ef4444;">Failed to load catalog. Tap to retry.</span>`;
            catalogStreamStatus.onclick = loadKeysCatalog;
        }
    }
}

// 3. RENDER PLACEHOLDER CARDS AND HYDRATE IN REAL TIME
async function renderBatch() {
    if (isRendering || renderedIndex >= allKeys.length) return;
    isRendering = true;
    if (catalogScrollLoader) catalogScrollLoader.style.display = "block";

    const slice = allKeys.slice(renderedIndex, renderedIndex + BATCH_SIZE);
    renderedIndex += slice.length;

    for (const uuid of slice) {
        const card = document.createElement('div');
        card.className = "item-card";
        card.id = `card-${uuid}`;
        card.innerHTML = `
            <div class="card-img-wrap">
                <img id="img-${uuid}" src="https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${uuid}/Thumbnail_0.jpg" alt="DLC" loading="lazy" onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${uuid}/${uuid}_Thumbnail_0.jpg';">
                <span id="badge-${uuid}" class="card-badge" style="background:#10b981;">ADDON</span>
            </div>
            <div class="card-body">
                <div class="card-top-bar">
                    <span id="rating-${uuid}">⭐ 4.8</span>
                    <span id="views-${uuid}">🔥 2,100</span>
                </div>
                <h3 id="title-${uuid}" class="card-title">Loading...</h3>
                <div class="card-footer">
                    <span id="creator-${uuid}">Mojang Partner</span>
                </div>
            </div>
        `;
        catalogGrid.appendChild(card);

        // Hydrate card asynchronously
        hydrateCardData(uuid);
    }

    isRendering = false;
    if (catalogScrollLoader) catalogScrollLoader.style.display = "none";
}

async function hydrateCardData(uuid) {
    if (itemCache.has(uuid)) {
        applyDataToCard(uuid, itemCache.get(uuid));
        return;
    }

    try {
        const res = await fetch(`https://v5-mcsrc.github.io/data/api/marketplace/item/${uuid}.json`);
        if (!res.ok) return;
        const data = await res.json();
        itemCache.set(uuid, data);
        applyDataToCard(uuid, data);
    } catch (e) {
        // Suppress background network noise
    }
}

function applyDataToCard(uuid, data) {
    const titleEl = document.getElementById(`title-${uuid}`);
    const creatorEl = document.getElementById(`creator-${uuid}`);
    const badgeEl = document.getElementById(`badge-${uuid}`);
    const ratingEl = document.getElementById(`rating-${uuid}`);
    const cardEl = document.getElementById(`card-${uuid}`);

    if (titleEl && data.title) titleEl.innerText = data.title;
    if (creatorEl && data.creator) creatorEl.innerText = data.creator;
    if (badgeEl && data.category) badgeEl.innerText = data.category.toUpperCase();
    if (ratingEl && data.rating) ratingEl.innerText = `⭐ ${Number(data.rating).toFixed(1)}`;

    if (cardEl) {
        cardEl.onclick = () => openItemModal({
            id: uuid,
            title: data.title || "Minecraft Item",
            creator: data.creator || "Mojang Partner",
            category: (data.category || "addon").toLowerCase(),
            desc: data.description || data.desc || "Official Minecraft Marketplace DLC.",
            image: `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${uuid}/Thumbnail_0.jpg`,
            details: data
        }, true);
    }
}

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (activeSection === 'catalog') {
        const scrollPos = window.innerHeight + window.pageYOffset;
        const threshold = document.documentElement.scrollHeight - 1000;
        if (scrollPos >= threshold) {
            renderBatch();
        }
    }
}, { passive: true });

// 4. MODAL POPUP
function openItemModal(item, isCatalogItem) {
    currentModalItem = item;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = (item.category || "ADDON").toUpperCase();
    document.getElementById('modalDesc').innerText = item.desc;

    const track = document.getElementById('carouselTrack');
    track.innerHTML = `<img src="${item.image}" class="carousel-img">`;

    // Load full details if available
    const data = item.details || {};
    if (data.images && data.images.length > 0) {
        track.innerHTML = "";
        data.images.forEach(img => {
            let imgUrl = typeof img === 'string' ? img : (img.url || "");
            if (imgUrl) {
                let im = document.createElement('img');
                im.src = imgUrl;
                im.className = "carousel-img";
                track.appendChild(im);
            }
        });
    }

    const priceRow = document.getElementById('modalPriceRow');
    const priceText = document.getElementById('modalPriceText');
    if (data.price && priceRow && priceText) {
        priceText.innerText = `🪙 ${data.price} Minecoins`;
        priceRow.style.display = "flex";
    } else if (priceRow) {
        priceRow.style.display = "none";
    }

    const dwnSec = document.getElementById('modalDownloadSection');
    const reqSec = document.getElementById('modalRequestSection');

    if (isCatalogItem) {
        if (dwnSec) dwnSec.style.display = "none";
        if (reqSec) reqSec.style.display = "block";
    } else {
        if (dwnSec) dwnSec.style.display = "block";
        if (reqSec) reqSec.style.display = "none";
        renderModalDownloadLinks(item);
    }

    if (itemModal) itemModal.style.display = "flex";
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
