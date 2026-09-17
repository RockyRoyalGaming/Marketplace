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
let catalogItems = [];
let activeSection = 'catalog';
let activeCategory = 'all';
let currentSearch = '';
let currentPage = 1;
const PAGE_SIZE = 24;
let isLoadingPage = false;
let hasMorePages = true;
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
    fetchOfficialMarketplace(1, true);
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

// 2. LIVE OFFICIAL MOJANG API VIA YOUR RENDER BACKEND
async function fetchOfficialMarketplace(page, isReset = false) {
    if (isLoadingPage || (!hasMorePages && !isReset)) return;
    isLoadingPage = true;

    if (isReset) {
        currentPage = 1;
        catalogItems = [];
        hasMorePages = true;
        if (catalogGrid) catalogGrid.innerHTML = "";
        if (catalogProgressContainer) catalogProgressContainer.style.display = "block";
        if (catalogProgressBar) catalogProgressBar.style.width = "40%";
        if (catalogStreamStats) catalogStreamStats.innerText = "Connecting to Mojang...";
    }

    if (catalogScrollLoader) catalogScrollLoader.style.display = "block";

    try {
        let apiUrl = `/api/search?page=${page}&pageSize=${PAGE_SIZE}`;
        if (activeCategory !== 'all') apiUrl += `&packType=${activeCategory}`;
        if (currentSearch) apiUrl += `&keyword=${encodeURIComponent(currentSearch)}`;

        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("HTTP error " + res.status);
        const data = await res.json();

        const rawList = data.results || data.items || [];
        const totalCount = data.totalResults || data.totalCount || 37382;

        if (rawList.length < PAGE_SIZE) {
            hasMorePages = false;
        }

        if (catalogNavCount) catalogNavCount.innerText = totalCount.toLocaleString();
        if (catalogStreamStats) catalogStreamStats.innerText = `${totalCount.toLocaleString()} ITEMS LIVE`;
        if (catalogProgressBar) catalogProgressBar.style.width = "100%";

        setTimeout(() => {
            if (catalogProgressContainer) catalogProgressContainer.style.display = "none";
        }, 800);

        rawList.forEach(item => {
            // Official Mojang Media Resolution
            let img = "";
            if (item.thumbnail) img = item.thumbnail;
            else if (item.images && item.images.length > 0) {
                let found = item.images.find(im => im.type === "Thumbnail" || im.type === "KeyArt");
                img = found ? found.url : (item.images[0].url || item.images[0]);
            }
            if (!img && item.id) {
                img = `https://content1.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/${item.id}/Thumbnail_0.jpg`;
            }

            let parsedItem = {
                id: item.id || item.uuid,
                title: item.title || item.name || "Minecraft Item",
                creator: item.author || item.creatorName || (item.creator ? item.creator.name : "Mojang Partner"),
                category: (item.packType || item.category || "addon").toLowerCase(),
                rating: item.rating ? Number(item.rating).toFixed(1) : "4.8",
                views: item.totalRatings ? Number(item.totalRatings).toLocaleString() : Math.floor(Math.random() * 2000 + 200).toLocaleString(),
                desc: item.description || item.snippet || "Official Minecraft Marketplace DLC.",
                image: img,
                panorama: item.panorama || ""
            };

            catalogItems.push(parsedItem);
            renderCard(parsedItem);
        });

        currentPage = page;

    } catch (err) {
        console.error("Backend proxy error:", err);
        if (catalogStreamStatus) {
            catalogStreamStatus.innerHTML = `<span style="color:#ef4444;"><i class="fas fa-exclamation-triangle"></i> Error loading page. Check server logs.</span>`;
        }
    }

    isLoadingPage = false;
    if (catalogScrollLoader) catalogScrollLoader.style.display = "none";
}

function renderCard(item) {
    let card = document.createElement('div');
    card.className = "item-card";

    card.innerHTML = `
        <div class="card-img-wrap">
            <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='https://content2.prod.catalog.playfab.com/pf-namespace-b63a0803d3653643/4897107c-fbc7-40b3-84e4-519e2f79397d/AdvancedMachines_screenshot_1.jpg';">
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
}

// Infinite Scroll
window.addEventListener('scroll', () => {
    if (activeSection === 'catalog') {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 900) {
            if (!isLoadingPage && hasMorePages) {
                fetchOfficialMarketplace(currentPage + 1, false);
            }
        }
    }
});

// 3. MODAL POPUP
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

// 4. SEARCH & FILTER
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
            fetchOfficialMarketplace(1, true);
        }
    }, 300);
}

function filterByCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.closest('.cat-pill').classList.add('active');

    if (activeSection === 'available') {
        let filtered = (cat === 'all') ? availableItems : availableItems.filter(i => (i.category || '').toLowerCase().includes(cat));
        renderAvailableItems(filtered);
    } else {
        fetchOfficialMarketplace(1, true);
    }
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
