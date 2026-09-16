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
let catalogRawData = [];
let filteredCatalog = [];
let activeSection = 'available';
let activeCategory = 'all';
let currentModalItem = null;
let displayedCatalogCount = 0;
const PAGE_SIZE = 40;

// Elements
const availableGrid = document.getElementById('availableGrid');
const catalogGrid = document.getElementById('catalogGrid');
const availableCountEl = document.getElementById('availableCount');
const catalogTotalCountEl = document.getElementById('catalogTotalCount');
const catalogCountDisplay = document.getElementById('catalogCountDisplay');
const itemModal = document.getElementById('itemModal');

window.onload = function() {
    // Make sure modals stay hidden on start
    closeAllModals();
    loadAvailableDLCs();
    loadRealMinecraftCatalog();
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
        document.getElementById('tabBtnAvailable').classList.add('active');
        document.getElementById('sectionAvailable').classList.add('active');
    } else {
        document.getElementById('tabBtnCatalog').classList.add('active');
        document.getElementById('sectionCatalog').classList.add('active');
    }
}

// --- 1. AVAILABLE ITEMS (FIREBASE) ---
function loadAvailableDLCs() {
    database.ref('market_items').on('value', snapshot => {
        availableItems = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                availableItems.push({ id: child.key, ...child.val() });
            });
        }
        availableCountEl.innerText = availableItems.length;
        renderAvailableItems(availableItems);
    });
}

function renderAvailableItems(items) {
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
                <img src="${thumb}" alt="${item.title}" referrerpolicy="no-referrer" loading="lazy" onerror="this.src='https://placehold.co/300x170/1e293b/38bdf8?text=No+Preview'">
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

// --- 2. LIVE MINECRAFT CATALOG (REAL 33K+ ITEMS) ---
async function loadRealMinecraftCatalog() {
    catalogGrid.innerHTML = "<p style='color:#38bdf8; text-align:center; grid-column:1/-1;'><i class='fas fa-spinner fa-spin'></i> Loading live Minecraft database...</p>";

    try {
        // MCF2P Production Catalog CDN
        const res = await fetch("https://raw.githubusercontent.com/F2PMC/Database/main/catalog.json");
        if (!res.ok) throw new Error("Could not fetch remote catalog.");
        
        catalogRawData = await res.json();

        // Real Counts Calculation
        let total = catalogRawData.length;
        let worlds = catalogRawData.filter(i => (i.category || i.type || '').toLowerCase().includes('world')).length;
        let addons = catalogRawData.filter(i => (i.category || i.type || '').toLowerCase().includes('addon')).length;
        let skins = catalogRawData.filter(i => (i.category || i.type || '').toLowerCase().includes('skin')).length;
        let textures = catalogRawData.filter(i => (i.category || i.type || '').toLowerCase().includes('texture')).length;
        let mashups = catalogRawData.filter(i => (i.category || i.type || '').toLowerCase().includes('mashup')).length;

        // Update UI Counts
        catalogTotalCountEl.innerText = total.toLocaleString();
        catalogCountDisplay.innerText = total.toLocaleString() + " Items";
        
        // Update Stats Modal Real Numbers
        if (document.getElementById('statTotal')) document.getElementById('statTotal').innerText = total.toLocaleString();
        if (document.getElementById('statWorlds')) document.getElementById('statWorlds').innerText = worlds.toLocaleString();
        if (document.getElementById('statAddons')) document.getElementById('statAddons').innerText = addons.toLocaleString();
        if (document.getElementById('statSkins')) document.getElementById('statSkins').innerText = skins.toLocaleString();
        if (document.getElementById('statTextures')) document.getElementById('statTextures').innerText = textures.toLocaleString();
        if (document.getElementById('statMashups')) document.getElementById('statMashups').innerText = mashups.toLocaleString();

        filteredCatalog = [...catalogRawData];
        displayedCatalogCount = 0;
        catalogGrid.innerHTML = "";
        loadNextCatalogBatch();

    } catch (e) {
        console.error("Live Catalog Error:", e);
        catalogGrid.innerHTML = `<p style='color:#ef4444; text-align:center; grid-column:1/-1;'>Failed to load catalog: ${e.message}</p>`;
    }
}

// Infinite batch loader (loads 40 items at a time so mobile never lags)
function loadNextCatalogBatch() {
    let nextBatch = filteredCatalog.slice(displayedCatalogCount, displayedCatalogCount + PAGE_SIZE);
    
    nextBatch.forEach(item => {
        let imgUrl = item.thumbnail || (item.images && item.images[0]) || item.image || "https://placehold.co/300x170/1e293b/38bdf8?text=Minecraft";
        let type = (item.category || item.type || 'Addon').toUpperCase();
        let rating = item.rating || item.averageRating || "4.5";
        let views = item.views || Math.floor(Math.random() * 800) + 50;

        let card = document.createElement('div');
        card.className = "item-card";
        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${imgUrl}" alt="${item.title}" referrerpolicy="no-referrer" loading="lazy" onerror="this.src='https://placehold.co/300x170/1e293b/38bdf8?text=No+Image'">
                <span class="card-badge" style="background:#10b981;">${type}</span>
            </div>
            <div class="card-body">
                <div class="card-top-bar">
                    <span>⭐ ${rating}</span>
                    <span>🔥 ${views}</span>
                </div>
                <h3 class="card-title">${item.title || item.name}</h3>
                <div class="card-footer">
                    <span>${item.creatorName || item.creator || 'Mojang'}</span>
                </div>
            </div>
        `;
        card.onclick = () => openItemModal(item, true);
        catalogGrid.appendChild(card);
    });

    displayedCatalogCount += nextBatch.length;
}

// Infinite Scroll Trigger
window.onscroll = function() {
    if (activeSection === 'catalog' && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
        if (displayedCatalogCount < filteredCatalog.length) {
            loadNextCatalogBatch();
        }
    }
};

// --- 3. MODAL LOGIC ---
function openItemModal(item, isCatalogItem) {
    currentModalItem = item;
    let title = item.title || item.name;
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalTag').innerText = (item.category || item.type || 'DLC').toUpperCase();
    document.getElementById('modalCreator').innerHTML = `<i class="fas fa-user-circle"></i> ${item.creatorName || item.creator || 'Mojang'}`;
    document.getElementById('modalRating').innerHTML = `<i class="fas fa-star" style="color:#fbbf24;"></i> ${item.rating || '4.5'}`;
    document.getElementById('modalDesc').innerText = item.description || item.summary || "Official Minecraft Marketplace DLC.";

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
        dwnSec.style.display = "none";
        reqSec.style.display = "block";
    } else {
        dwnSec.style.display = "block";
        reqSec.style.display = "none";
        renderModalDownloadLinks(item);
    }

    itemModal.style.display = "flex";
}

function renderModalDownloadLinks(item) {
    let container = document.getElementById('modalLinksContainer');
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

// Request Action
function requestCurrentCatalogItem() {
    if (!currentModalItem) return;
    let userName = prompt("Enter your Name or WhatsApp number for notification:");
    if (!userName) return;

    let itemId = currentModalItem.id || currentModalItem.uuid || "";
    let reqData = {
        addon: currentModalItem.title || currentModalItem.name,
        link: itemId ? ("https://www.minecraft.net/en-us/marketplace/pdp?id=" + itemId) : "",
        user: userName,
        status: "pending",
        timestamp: Date.now()
    };

    database.ref('requests').push().set(reqData).then(() => {
        alert("✅ Request Sent! Check back soon for the download link.");
        closeModal();
    }).catch(err => alert("Error: " + err.message));
}

// --- SEARCH & CATEGORY FILTERS ---
function handleGlobalSearch() {
    let q = document.getElementById('globalSearch').value.toLowerCase().trim();
    if (activeSection === 'available') {
        let filtered = availableItems.filter(i => i.title.toLowerCase().includes(q));
        renderAvailableItems(filtered);
    } else {
        filteredCatalog = catalogRawData.filter(i => {
            let t = (i.title || i.name || '').toLowerCase();
            let c = (i.creatorName || i.creator || '').toLowerCase();
            let u = (i.id || i.uuid || '').toLowerCase();
            return t.includes(q) || c.includes(q) || u.includes(q);
        });
        displayedCatalogCount = 0;
        catalogGrid.innerHTML = "";
        loadNextCatalogBatch();
    }
}

function filterByCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    if (event && event.target) {
        event.target.closest('.cat-pill').classList.add('active');
    }

    if (activeSection === 'available') {
        let filtered = (cat === 'all') ? availableItems : availableItems.filter(i => (i.category || '').toLowerCase().includes(cat));
        renderAvailableItems(filtered);
    } else {
        filteredCatalog = (cat === 'all') ? [...catalogRawData] : catalogRawData.filter(i => (i.category || i.type || '').toLowerCase().includes(cat));
        displayedCatalogCount = 0;
        catalogGrid.innerHTML = "";
        loadNextCatalogBatch();
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
    }).then(() => alert("✅ Request submitted!"));
}
