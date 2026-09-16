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
let activeSection = 'available'; // 'available' or 'catalog'
let activeCategory = 'all';
let currentModalItem = null;

// Elements
const availableGrid = document.getElementById('availableGrid');
const catalogGrid = document.getElementById('catalogGrid');
const availableCountEl = document.getElementById('availableCount');
const catalogNavCount = document.getElementById('catalogNavCount');
const catalogCountDisplay = document.getElementById('catalogCountDisplay');
const itemModal = document.getElementById('itemModal');

// --- ON PAGE LOAD ---
window.onload = function() {
    closeAllModals();
    loadAvailableDLCs();
    loadRealtimeMarketplaceCatalog();
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

// --- 1. AVAILABLE DLCS (FIREBASE DATA) ---
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
        availableGrid.innerHTML = "<p style='color:#666; text-align:center; grid-column:1/-1;'>No available items uploaded yet.</p>";
        return;
    }

    items.forEach(item => {
        let thumb = (item.images && item.images[0]) ? item.images[0] : "https://placehold.co/300x170/1e293b/38bdf8?text=Strike+DLC";
        let card = document.createElement('div');
        card.className = "item-card";
        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${thumb}" alt="${item.title}" referrerpolicy="no-referrer" loading="lazy" onerror="this.src='https://placehold.co/300x170/1e293b/38bdf8?text=Strike+DLC'">
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

// --- 2. LOCAL CATALOG LOADER (FROM GITHUB ACTIONS CATALOG.JSON) ---
async function loadRealtimeMarketplaceCatalog() {
    if (!catalogGrid) return;
    catalogGrid.innerHTML = "<p style='color:#38bdf8; text-align:center; grid-column:1/-1;'><i class='fas fa-spinner fa-spin'></i> Loading marketplace catalog...</p>";

    try {
        const res = await fetch('./catalog.json?cache=' + Date.now());
        if (!res.ok) throw new Error("Catalog file not reachable");
        
        catalogItems = await res.json();

        if (catalogCountDisplay) catalogCountDisplay.innerText = `${catalogItems.length} Items Live`;
        if (catalogNavCount) catalogNavCount.innerText = catalogItems.length;

        renderCatalogItems(catalogItems);
    } catch (e) {
        console.warn("Direct JSON load failed, loading fallback items:", e);
        // Fallback directly embedded so website never goes blank
        catalogItems = [
            { id: "5d1c2438-e6b7-4c01-bf13-463870cb1e46", title: "Monster Food Add-On", creator: "Noxcrew", category: "addon", rating: "4.7", thumbnail: "https://picsum.photos/seed/food/300/170", description: "Cook hostile mobs!" },
            { id: "e1966205-83e0-40e9-9134-2e99f187a553", title: "Sonic the Hedgehog", creator: "Gamemode One", category: "world", rating: "4.8", thumbnail: "https://picsum.photos/seed/sonic/300/170", description: "Sonic in Minecraft!" }
        ];
        renderCatalogItems(catalogItems);
    }
}

function renderCatalogItems(items) {
    if (!catalogGrid) return;
    catalogGrid.innerHTML = "";
    
    if (items.length === 0) {
        catalogGrid.innerHTML = "<p style='color:#666; text-align:center; grid-column:1/-1;'>No items match your search.</p>";
        return;
    }

    items.forEach(item => {
        let thumb = item.thumbnail || (item.images && item.images[0]) || "https://placehold.co/300x170/1e293b/38bdf8?text=Minecraft";
        let card = document.createElement('div');
        card.className = "item-card";
        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${thumb}" alt="${item.title}" referrerpolicy="no-referrer" loading="lazy" onerror="this.src='https://placehold.co/300x170/1e293b/38bdf8?text=Minecraft'">
                <span class="card-badge" style="background:#10b981;">${(item.category || 'DLC').toUpperCase()}</span>
            </div>
            <div class="card-body">
                <div class="card-top-bar">
                    <span>⭐ ${item.rating || '4.5'}</span>
                    <span style="color:#10b981; font-weight:bold;">⚡ NEW</span>
                </div>
                <h3 class="card-title">${item.title}</h3>
                <div class="card-footer">
                    <span>${item.creator || 'Mojang Partner'}</span>
                </div>
            </div>
        `;
        card.onclick = () => openItemModal(item, true);
        catalogGrid.appendChild(card);
    });
}

// --- 3. MODAL LOGIC (DOWNLOAD & REQUEST) ---
function openItemModal(item, isCatalogItem) {
    currentModalItem = item;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = (item.category || 'DLC').toUpperCase();
    document.getElementById('modalDesc').innerText = item.description || "Official Minecraft Marketplace DLC.";

    // Screenshots carousel
    let track = document.getElementById('carouselTrack');
    track.innerHTML = "";
    let imgs = [];
    if (item.images && item.images.length > 0) imgs = item.images;
    else if (item.thumbnail) imgs = [item.thumbnail];
    else imgs = ["https://placehold.co/400x250/1e293b/38bdf8?text=Preview"];

    imgs.forEach(u => {
        let src = (typeof u === 'string') ? u : (u.url || "");
        if (src) {
            let im = document.createElement('img');
            im.src = src;
            im.className = "carousel-img";
            im.setAttribute("referrerpolicy", "no-referrer");
            track.appendChild(im);
        }
    });

    let dwnSec = document.getElementById('modalDownloadSection');
    let reqSec = document.getElementById('modalRequestSection');

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
    let container = document.getElementById('modalLinksContainer');
    if (!container) return;
    container.innerHTML = "";

    if (item.fileBlocks && item.fileBlocks.length > 0) {
        item.fileBlocks.forEach(b => {
            let card = document.createElement('div');
            card.className = "download-group-card";
            
            let mirrorsHtml = "";
            if (b.mirrors && b.mirrors.length > 0) {
                let badges = b.mirrors.map(m => `
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
            let a = document.createElement('a');
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

// Request Item to Admin
function requestCurrentCatalogItem() {
    if (!currentModalItem) return;
    let userName = prompt("Enter your Name or Discord/WhatsApp username:");
    if (!userName) return;

    let reqData = {
        addon: currentModalItem.title,
        link: currentModalItem.marketplaceUrl || (currentModalItem.id ? `https://www.minecraft.net/en-us/marketplace/pdp?id=${currentModalItem.id}` : ""),
        user: userName,
        status: "pending",
        timestamp: Date.now()
    };

    database.ref('requests').push().set(reqData).then(() => {
        alert("✅ Request sent to Admin! Download link will be uploaded soon.");
        closeModal();
    }).catch(err => alert("Error: " + err.message));
}

// --- SEARCH & CATEGORY FILTERS ---
function handleGlobalSearch() {
    let q = document.getElementById('globalSearch').value.toLowerCase().trim();
    if (activeSection === 'available') {
        let filtered = availableItems.filter(i => (i.title || '').toLowerCase().includes(q) || (i.creator || '').toLowerCase().includes(q));
        renderAvailableItems(filtered);
    } else {
        let filtered = catalogItems.filter(i => (i.title || '').toLowerCase().includes(q) || (i.creator || '').toLowerCase().includes(q));
        renderCatalogItems(filtered);
    }
}

function filterByCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    if (event && event.target) event.target.closest('.cat-pill').classList.add('active');

    if (activeSection === 'available') {
        let filtered = (cat === 'all') ? availableItems : availableItems.filter(i => (i.category || '').toLowerCase().includes(cat));
        renderAvailableItems(filtered);
    } else {
        let filtered = (cat === 'all') ? catalogItems : catalogItems.filter(i => (i.category || '').toLowerCase().includes(cat));
        renderCatalogItems(filtered);
    }
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
