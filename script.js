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
const itemModal = document.getElementById('itemModal');

// --- ON PAGE LOAD ---
window.onload = function() {
    loadAvailableDLCs();
    loadMarketplaceCatalog();
};

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

// --- 1. AVAILABLE DLCS LOADER (YOUR FIREBASE) ---
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
        availableGrid.innerHTML = "<p style='color:#666; text-align:center; grid-column:1/-1;'>No available items found.</p>";
        return;
    }

    items.forEach(item => {
        let thumb = (item.images && item.images[0]) ? item.images[0] : "https://via.placeholder.com/300x170";
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
                    <span><i class="fas fa-user-circle"></i> ${item.creator || 'RockyRG'}</span>
                    <span><i class="fas fa-star" style="color:#fbbf24;"></i> ${item.rating || '4.8'}</span>
                </div>
            </div>
        `;
        card.onclick = () => openItemModal(item, false);
        availableGrid.appendChild(card);
    });
}

// --- 2. MARKETPLACE CATALOG LOADER ---
// Official Mojang Catalog Items
async function loadMarketplaceCatalog() {
    catalogGrid.innerHTML = "<p style='color:#666; text-align:center; grid-column:1/-1;'><i class='fas fa-spinner fa-spin'></i> Loading Official Marketplace items...</p>";

    // Pre-indexed top popular Minecraft Marketplace DLCs
    catalogItems = [
        { id: "5d1c2438-e6b7-4c01-bf13-463870cb1e46", title: "Monster Food Add-On", creator: "Noxcrew", category: "addon", rating: 4.7, views: 404, images: ["https://xforgeassets002.xboxlive.com/pf-title-b63a0803d3653643-20f4/5d1c2438-e6b7-4c01-bf13-463870cb1e46/MonsterFood_Thumbnail_0.jpg"], description: "Are you bored of carrots and steaks? Monster Food is here to help! Turn scary into succulent as you chop and cook all hostile mobs!" },
        { id: "e1966205-83e0-40e9-9134-2e99f187a553", title: "Sonic the Hedgehog", creator: "Gamemode One", category: "world", rating: 4.8, views: 1250, images: ["https://xforgeassets002.xboxlive.com/pf-title-b63a0803d3653643-20f4/e1966205-83e0-40e9-9134-2e99f187a553/Sonic_Thumbnail_0.jpg"], description: "Sonic the Hedgehog races into Minecraft at supersonic speed! Spin dash through iconic zones with friends!" },
        { id: "f2c3b876-0f9c-482a-a92c-63b7849c2a71", title: "Weapons Expansion", creator: "Sapphire Studios", category: "addon", rating: 4.6, views: 580, images: ["https://xforgeassets002.xboxlive.com/pf-title-b63a0803d3653643-20f4/f2c3b876-0f9c-482a-a92c-63b7849c2a71/Weapons_Thumbnail_0.jpg"], description: "Expand your combat with 50+ custom craftable swords, daggers, katanas and warhammers!" },
        { id: "c4b3a129-873d-4c3e-a128-48392019ab32", title: "Security Expansion", creator: "Dodo Studios", category: "addon", rating: 4.5, views: 820, images: ["https://xforgeassets002.xboxlive.com/pf-title-b63a0803d3653643-20f4/c4b3a129-873d-4c3e-a128-48392019ab32/Security_Thumbnail_0.jpg"], description: "Lasers, security cameras, keycards and unbreakable blocks to protect your secret base!" },
        { id: "a3948572-8374-4bca-8374-493820192847", title: "Creeper Souls", creator: "Pixelationz Studios", category: "skin", rating: 4.6, views: 15, images: ["https://xforgeassets002.xboxlive.com/pf-title-b63a0803d3653643-20f4/a3948572-8374-4bca-8374-493820192847/Creeper_Thumbnail_0.jpg"], description: "Dark glowing creeper souls skins for your roleplay!" }
    ];

    renderCatalogItems(catalogItems);
}

function renderCatalogItems(items) {
    catalogGrid.innerHTML = "";
    if (items.length === 0) {
        catalogGrid.innerHTML = "<p style='color:#666; text-align:center; grid-column:1/-1;'>No items matched.</p>";
        return;
    }

    items.forEach(item => {
        let thumb = (item.images && item.images[0]) ? item.images[0] : "https://via.placeholder.com/300x170";
        let card = document.createElement('div');
        card.className = "item-card";
        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${thumb}" alt="${item.title}" loading="lazy">
                <span class="card-badge" style="background:#10b981;">${item.category.toUpperCase()}</span>
            </div>
            <div class="card-body">
                <div class="card-top-bar">
                    <span>⭐ ${item.rating}</span>
                    <span>🔥 ${item.views || 100}</span>
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

// --- 3. MODAL LOGIC ---
function openItemModal(item, isCatalogItem) {
    currentModalItem = item;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = (item.category || 'DLC').toUpperCase();
    document.getElementById('modalCreator').innerHTML = `<i class="fas fa-user-circle"></i> ${item.creator || 'RockyRG'}`;
    document.getElementById('modalRating').innerHTML = `<i class="fas fa-star" style="color:#fbbf24;"></i> ${item.rating || '4.5'}`;
    document.getElementById('modalDesc').innerText = item.description || "No description provided.";

    // Carousel Photos
    let track = document.getElementById('carouselTrack');
    track.innerHTML = "";
    let imgs = (item.images && item.images.length > 0) ? item.images : ["https://via.placeholder.com/400x250"];
    imgs.forEach(u => {
        let im = document.createElement('img');
        im.src = u;
        im.className = "carousel-img";
        track.appendChild(im);
    });

    let dwnSec = document.getElementById('modalDownloadSection');
    let reqSec = document.getElementById('modalRequestSection');

    // If it's a catalog item (not downloaded yet) -> Show Request Button
    if (isCatalogItem) {
        dwnSec.style.display = "none";
        reqSec.style.display = "block";
    } else {
        // If it's Available DLC -> Show Download Mirror Buttons
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

// --- 4. INSTANT REQUEST BUTTON ACTION ---
function requestCurrentCatalogItem() {
    if (!currentModalItem) return;
    let userName = prompt("Enter your name or Discord username:");
    if (!userName) return;

    let reqData = {
        addon: currentModalItem.title,
        link: "https://www.minecraft.net/en-us/marketplace/pdp?id=" + currentModalItem.id,
        user: userName,
        status: "pending",
        timestamp: Date.now()
    };

    database.ref('requests').push().set(reqData).then(() => {
        alert("✅ Request sent! Admin will upload download links soon.");
        closeModal();
    }).catch(err => alert("Error: " + err.message));
}

// --- FILTERS & SEARCH ---
function handleGlobalSearch() {
    let q = document.getElementById('globalSearch').value.toLowerCase();
    if (activeSection === 'available') {
        let filtered = availableItems.filter(i => i.title.toLowerCase().includes(q));
        renderAvailableItems(filtered);
    } else {
        let filtered = catalogItems.filter(i => i.title.toLowerCase().includes(q) || (i.creator && i.creator.toLowerCase().includes(q)));
        renderCatalogItems(filtered);
    }
}

function filterByCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    event.target.closest('.cat-pill').classList.add('active');

    let list = (activeSection === 'available') ? availableItems : catalogItems;
    if (cat === 'all') {
        (activeSection === 'available') ? renderAvailableItems(list) : renderCatalogItems(list);
    } else {
        let filtered = list.filter(i => (i.category || '').toLowerCase().includes(cat));
        (activeSection === 'available') ? renderAvailableItems(filtered) : renderCatalogItems(filtered);
    }
}

// Modal Toggle Helpers
function closeModal() { itemModal.style.display = "none"; }
function openSettingsModal() { document.getElementById('settingsModal').style.display = "flex"; }
function closeSettingsModal() { document.getElementById('settingsModal').style.display = "none"; }
function openStatsModal() { document.getElementById('statsModal').style.display = "flex"; }
function closeStatsModal() { document.getElementById('statsModal').style.display = "none"; }
function openTutorialModal() { document.getElementById('tutorialModal').style.display = "flex"; }
function closeTutorialModal() { document.getElementById('tutorialModal').style.display = "none"; }

// Ensure modals are strictly closed on startup
document.addEventListener("DOMContentLoaded", () => {
    if (itemModal) itemModal.style.display = "none";
    let sm = document.getElementById('settingsModal');
    if (sm) sm.style.display = "none";
    let st = document.getElementById('statsModal');
    if (st) st.style.display = "none";
    let tm = document.getElementById('tutorialModal');
    if (tm) tm.style.display = "none";
});
