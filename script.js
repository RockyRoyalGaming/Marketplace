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
const TOTAL_PAGES = 78; // 37,382 items / ~480 per page
let isFetchingPage = false;
let currentModalItem = null;

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
    fetchMarketplacePage(1);
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

// 2. LIVE FETCH FROM THE EXACT SOURCE (v5-mcsrc.github.io)
async function fetchMarketplacePage(page) {
    if (isFetchingPage || page > TOTAL_PAGES) return;
    isFetchingPage = true;

    if (catalogScrollLoader) catalogScrollLoader.style.display = "block";
    if (page === 1 && catalogStreamStatus) {
        catalogStreamStatus.innerHTML = `<i class="fas fa-satellite-dish fa-spin"></i> Fetching official catalog page ${page}...`;
    }

    try {
        const url = `https://v5-mcsrc.github.io/data/api/marketplace/page/page-${page}.json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP error " + res.status);
        
        const data = await res.json();
        const items = data.items || data;

        // Clean & format raw official items
        const parsed = items.map(i => {
            let img = i.thumbnail || i.image || i.keyArt || "";
            // PlayFab image fallback
            if (!img && i.id) {
                img = `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${i.id}/Thumbnail_0.jpg`;
            }
            return {
                id: i.id || i.uuid,
                title: i.title || i.name || "Minecraft Item",
                creator: i.creator || i.creatorName || (i.author ? i.author.name : "Mojang Partner"),
                category: (i.category || i.type || "addon").toLowerCase(),
                rating: i.rating ? Number(i.rating).toFixed(1) : "4.8",
                views: i.views ? Number(i.views).toLocaleString() : Math.floor(Math.random() * 2000 + 100).toLocaleString(),
                desc: i.description || i.desc || "Official Minecraft Marketplace DLC.",
                image: img,
                panorama: i.panorama || ""
            };
        });

        fullCatalog.push(...parsed);
        currentPage = page;

        // Progress bar updates
        let pct = Math.floor((currentPage / TOTAL_PAGES) * 100);
        if (catalogProgressBar) catalogProgressBar.style.width = pct + "%";
        if (catalogStreamStats) catalogStreamStats.innerText = `${fullCatalog.length.toLocaleString()} ITEMS LOADED (${pct}%)`;
        if (catalogNavCount) catalogNavCount.innerText = fullCatalog.length.toLocaleString();

        if (page === 1) {
            if (catalogProgressContainer) {
                setTimeout(() => catalogProgressContainer.style.display = "none", 1200);
            }
        }

        applyCatalogFilters();

    } catch (err) {
        console.error("Fetch page error:", err);
        if (catalogStreamStatus) {
            catalogStreamStatus.innerHTML = `<span style="color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Retry Page ${page}</span>`;
            catalogStreamStatus.onclick = () => fetchMarketplacePage(page);
        }
    }

    isFetchingPage = false;
    if (catalogScrollLoader) catalogScrollLoader.style.display = "none";
}

// 3. RENDER ITEMS
function renderCatalogCards(itemsToRender) {
    if (!catalogGrid) return;
    if (currentPage === 1 && !currentSearch && activeCategory === 'all') {
        catalogGrid.innerHTML = "";
    }

    itemsToRender.forEach(item => {
        let card = document.createElement('div');
        card.className = "item-card";

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/${item.id}_Thumbnail_0.jpg';">
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

// Infinite Scroll loads next page
window.addEventListener('scroll', () => {
    if (activeSection === 'catalog') {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 900) {
            if (!isFetchingPage && currentPage < TOTAL_PAGES) {
                fetchMarketplacePage(currentPage + 1);
            }
        }
    }
});

// 4. MODAL POPUP
function openItemModal(item, isCatalogItem) {
    currentModalItem = item;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();
    document.getElementById('modalDesc').innerText = item.desc;

    const track = document.getElementById('carouselTrack');
    track.innerHTML = "";
    let im = document.createElement('img');
    im.src = item.image;
    im.className = "carousel-img";
    track.appendChild(im);

    // Panorama
    const panoSec = document.getElementById('panoramaSection');
    const panoImg = document.getElementById('panoramaImg');
    if (item.panorama && panoSec && panoImg) {
        panoImg.src = item.panorama;
        panoSec.style.display = "block";
    } else if (panoSec) {
        panoSec.style.display = "none";
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
    }, 200);
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
        let matchQuery = !currentSearch || i.title.toLowerCase().includes(currentSearch) || i.creator.toLowerCase().includes(currentSearch);
        return matchCat && matchQuery;
    });

    if (catalogGrid) catalogGrid.innerHTML = "";
    renderCatalogCards(displayedList);
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
