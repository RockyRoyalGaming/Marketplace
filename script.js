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
let catalogStore = [];
let currentDisplayList = [];
let activeSection = 'catalog';
let activeCategory = 'all';
let currentSearch = '';
let renderedIndex = 0;
const BATCH_SIZE = 24;
let isLoadingBatch = false;
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
    fetchOfficialMarketCatalog();
};

function closeAllModals() {
    if (itemModal) itemModal.style.display = "none";
    let sm = document.getElementById('settingsModal');
    if (sm) sm.style.display = "none";
    let st = document.getElementById('statsModal');
    if (st) st.style.display = "none";
    let tm = document.getElementById('tutorialModal');
    if (tm) tm.style.display = "none";
}

// --- SECTION SWITCHER ---
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

// --- 1. AVAILABLE DLCS (FIREBASE) ---
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
                <img src="${thumb}" alt="${item.title}" referrerpolicy="no-referrer" loading="lazy">
                <span class="card-badge">${(item.category || 'DLC').toUpperCase()}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${item.title}</h3>
                <div class="card-footer">
                    <span><i class="fas fa-user-circle"></i> ${item.creator || 'RockyRG'}</span>
                    <span><i class="fas fa-star" style="color:#fbbf24;"></i> ${item.rating || '4.8'}</span>
                </div>
            </div>
        `;
        card.onclick = () => openItemModal(item, false);
        availableGrid.appendChild(card);
    });
}

// --- 2. OFFICIAL MCF2P DATA FETCH ---
async function fetchOfficialMarketCatalog() {
    if (catalogStreamStatus) catalogStreamStatus.innerHTML = `<i class="fas fa-satellite-dish fa-spin"></i> Fetching live marketplace catalog...`;
    
    // MCF2P Data Pipeline Source
    const sources = [
        "https://raw.githubusercontent.com/mcf2p/database/main/catalog.json",
        "https://cdn.jsdelivr.net/gh/mcf2p/database@main/catalog.json",
        "https://f2pmc.pages.dev/catalog.json"
    ];

    let items = null;

    for (let url of sources) {
        try {
            let res = await fetch(url);
            if (res.ok) {
                items = await res.json();
                break;
            }
        } catch (e) {
            console.warn("Retrying next source...", e);
        }
    }

    if (!items || !Array.isArray(items)) {
        // Direct Mojang Discovery Fallback
        items = await fetchMojangDirectBackup();
    }

    initializeCatalogStream(items);
}

// Mojang Web-API Direct Resolver
async function fetchMojangDirectBackup() {
    try {
        let res = await fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent("https://catalog.minecraftservices.com/v1.0/items?pageSize=100&sort=releaseDateDesc"));
        let json = await res.json();
        return (json.items || []).map(i => ({
            id: i.id,
            title: i.title,
            creator: i.creatorName,
            category: i.primaryCategory || "addon",
            rating: i.averageRating ? i.averageRating.toFixed(1) : "4.5",
            views: Math.floor(Math.random() * 800) + 120,
            image: (i.images && i.images[0]) ? (i.images[0].url || i.images[0]) : "",
            desc: i.description
        }));
    } catch (e) {
        return [];
    }
}

function initializeCatalogStream(rawList) {
    catalogStore = rawList.map(item => {
        let img = item.image || item.thumbnail || (item.images && item.images[0]) || "";
        // Xbox Live Image Format Fix
        if (img && typeof img === 'object') img = img.url || "";
        if (!img && item.id) img = `https://xforgeassets002.xboxlive.com/pf-title-b63a0803d3653643-20f4/${item.id}/Thumbnail_0.jpg`;

        return {
            id: item.id || item.uuid,
            title: item.title || item.name || "Minecraft Item",
            creator: item.creator || item.creatorName || "Mojang Partner",
            category: (item.category || item.type || "addon").toLowerCase(),
            rating: item.rating || "4.6",
            views: item.views || Math.floor(Math.random() * 1200) + 100,
            image: img,
            desc: item.desc || item.description || "Official Minecraft Marketplace DLC."
        };
    });

    const total = catalogStore.length || 33324;
    let stepCount = 0;
    const interval = setInterval(() => {
        stepCount += Math.ceil(total / 25);
        if (stepCount >= total) {
            stepCount = total;
            clearInterval(interval);
            if (catalogStreamStatus) catalogStreamStatus.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981;"></i> Catalog Synced Live`;
            setTimeout(() => {
                if (catalogProgressContainer) catalogProgressContainer.style.display = "none";
            }, 1000);
        }
        let pct = Math.floor((stepCount / total) * 100);
        if (catalogStreamStats) catalogStreamStats.innerText = `${stepCount.toLocaleString()} / ${total.toLocaleString()} (${pct}%)`;
        if (catalogProgressBar) catalogProgressBar.style.width = pct + "%";
        if (catalogNavCount) catalogNavCount.innerText = stepCount.toLocaleString();
    }, 30);

    currentDisplayList = [...catalogStore];
    renderedIndex = 0;
    if (catalogGrid) catalogGrid.innerHTML = "";
    loadMoreCards();
}

// --- 3. CARDS RENDERING & SCROLLING ---
function loadMoreCards() {
    if (isLoadingBatch || renderedIndex >= currentDisplayList.length) return;
    isLoadingBatch = true;
    if (catalogScrollLoader) catalogScrollLoader.style.display = "block";

    const slice = currentDisplayList.slice(renderedIndex, renderedIndex + BATCH_SIZE);

    slice.forEach(item => {
        let card = document.createElement('div');
        card.className = "item-card";
        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${item.image}" alt="${item.title}" referrerpolicy="no-referrer" loading="lazy" onerror="this.src='https://placehold.co/300x170/1e293b/38bdf8?text=Minecraft'">
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
    isLoadingBatch = false;
    if (catalogScrollLoader) catalogScrollLoader.style.display = "none";
}

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (activeSection === 'catalog') {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
            loadMoreCards();
        }
    }
});

// --- 4. SEARCH & FILTER ---
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
    }, 250);
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
    currentDisplayList = catalogStore.filter(i => {
        let matchCat = (activeCategory === 'all') || (i.category.includes(activeCategory));
        let matchQuery = !currentSearch || i.title.toLowerCase().includes(currentSearch) || i.creator.toLowerCase().includes(currentSearch) || (i.id && i.id.toLowerCase().includes(currentSearch));
        return matchCat && matchQuery;
    });

    renderedIndex = 0;
    if (catalogGrid) catalogGrid.innerHTML = "";
    loadMoreCards();
}

// --- 5. MODAL POPUP ---
function openItemModal(item, isCatalogItem) {
    currentModalItem = item;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();
    document.getElementById('modalDesc').innerText = item.desc || "Official Minecraft Marketplace DLC.";

    const track = document.getElementById('carouselTrack');
    track.innerHTML = "";
    const im = document.createElement('img');
    im.src = item.image;
    im.className = "carousel-img";
    im.setAttribute("referrerpolicy", "no-referrer");
    track.appendChild(im);

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
            
            let mirrorsHtml = "";
            if (b.mirrors && b.mirrors.length > 0) {
                const badges = b.mirrors.map(m => `
                    <a href="${m.url}" target="_blank" class="mirror-badge-btn"><i class="fas fa-link"></i> ${m.host}</a>
                `).join('');
                mirrorsHtml = `<div class="mirrors-list"><span style="font-size:0.7rem; color:#64748b;">Mirrors:</span> ${badges}</div>`;
            }

            card.innerHTML = `
                <div class="group-header">
                    <span class="group-title"><i class="fas ${b.icon || 'fa-folder'}"></i> ${b.title}</span>
                </div>
                <a href="${b.mainLink.url}" target="_blank" class="dwn-option-btn">
                    <div class="btn-left"><i class="fas fa-download"></i> <span>Download</span></div>
                    <div class="btn-right">
                        ${b.mainLink.host ? `<span class="host-badge">${b.mainLink.host}</span>` : ""}
                        <i class="fas fa-chevron-right" style="font-size:0.8rem; color:#666;"></i>
                    </div>
                </a>
                ${mirrorsHtml}
            `;
            container.appendChild(card);
        });
    } else if (item.links && item.links.length > 0) {
        item.links.forEach(l => {
            const a = document.createElement('a');
            a.className = "dwn-option-btn";
            a.href = l.url;
            a.target = "_blank";
            a.innerHTML = `
                <div class="btn-left"><i class="fas ${l.icon || 'fa-download'}"></i> <span>${l.type}</span></div>
                <i class="fas fa-chevron-right" style="font-size:0.8rem; color:#666;"></i>
            `;
            container.appendChild(a);
        });
    } else {
        container.innerHTML = "<p style='color:#666; font-size:12px;'>No links available.</p>";
    }
}

function requestCurrentCatalogItem() {
    if (!currentModalItem) return;
    const userName = prompt("Enter your Name or Discord username:");
    if (!userName) return;

    const reqData = {
        addon: currentModalItem.title,
        link: currentModalItem.id ? `https://www.minecraft.net/en-us/marketplace/pdp?id=${currentModalItem.id}` : "",
        user: userName,
        status: "pending",
        timestamp: Date.now()
    };

    database.ref('requests').push().set(reqData).then(() => {
        alert("✅ Request sent to Admin! Link will be uploaded soon.");
        closeModal();
    }).catch(err => alert("Error: " + err.message));
}

// Modal Helpers
function closeModal() { if (itemModal) itemModal.style.display = "none"; }
function openSettingsModal() { document.getElementById('settingsModal').style.display = "flex"; }
function closeSettingsModal() { document.getElementById('settingsModal').style.display = "none"; }
function openStatsModal() { document.getElementById('statsModal').style.display = "flex"; }
function closeStatsModal() { document.getElementById('statsModal').style.display = "none"; }
function openTutorialModal() { document.getElementById('tutorialModal').style.display = "flex"; }
function closeTutorialModal() { document.getElementById('tutorialModal').style.display = "none"; }
function openGeneralRequestModal() {
    const addon = prompt("Which Addon / World do you want?");
    if (!addon) return;
    const user = prompt("Your Name / Discord ID:");
    if (!user) return;
    database.ref('requests').push().set({
        addon: addon,
        user: user,
        status: "pending",
        timestamp: Date.now()
    }).then(() => alert("✅ Request submitted to Admin!"));
}
