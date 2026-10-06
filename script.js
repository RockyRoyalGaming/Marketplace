const PLAYFAB_WORKER = 'https://shy-wind-42b7.rockyroyalgaming.workers.dev';

// Firebase Setup
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

const SHORTENERS = {
    linkvertise: (id, link) => `https://link-target.net/your_id/download?url=${encodeURIComponent(link || id)}`,
    workink: (id, link) => `https://work.ink/your_id/${encodeURIComponent(link || id)}`,
    lootlabs: (id, link) => `https://loot-link.com/s?your_id=${encodeURIComponent(link || id)}`
};

let loadedItems = [];
let availableDb = new Map();
let currentCategory = 'all';
let searchQuery = '';
let currentSkip = 0;
const PAGE_TOP = 40;
let isFetching = false;
let totalServerCount = 0;
let currentModalItem = null;

const itemsGrid = document.getElementById('itemsGrid');
const scrollLoader = document.getElementById('scrollLoader');
const itemCountLabel = document.getElementById('itemCountLabel');
const pdpModal = document.getElementById('pdpModal');
const sideDrawer = document.getElementById('sideDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

window.onload = function() {
    loadKeysDatabase();
    loadCatalogPage(true);
};

function toggleDrawer() {
    if (sideDrawer) sideDrawer.classList.toggle('active');
    if (drawerOverlay) drawerOverlay.classList.toggle('active');
}

// 1. Firebase Keys Sync
function loadKeysDatabase() {
    database.ref('market_items').on('value', snapshot => {
        availableDb.clear();
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                let data = child.val();
                let uuid = (data.uuid || data.id || child.key).toLowerCase();
                availableDb.set(uuid, data);
            });
        }
        document.querySelectorAll('.item-card').forEach(updateCardBadge);
    });
}

function updateCardBadge(card) {
    const uuid = card.dataset.uuid;
    const isAvail = availableDb.has(uuid);
    const existing = card.querySelector('.available-badge, .unavailable-overlay');
    if (existing) existing.remove();

    const holder = card.querySelector('.thumb-holder');
    if (!holder) return;

    if (isAvail) {
        const b = document.createElement('div');
        b.className = 'available-badge';
        b.innerHTML = '<i class="fas fa-check"></i>';
        holder.appendChild(b);
    } else {
        const o = document.createElement('div');
        o.className = 'unavailable-overlay';
        o.innerHTML = '<i class="fas fa-ban"></i><span>Unavailable</span>';
        holder.appendChild(o);
    }
}

// 2. PlayFab Catalog Stream
async function loadCatalogPage(reset = false) {
    if (isFetching) return;
    isFetching = true;
    if (scrollLoader) scrollLoader.style.display = 'block';

    if (reset) {
        currentSkip = 0;
        loadedItems = [];
        if (itemsGrid) itemsGrid.innerHTML = '';
    }

    try {
        let url = `${PLAYFAB_WORKER}?category=${encodeURIComponent(currentCategory)}&search=${encodeURIComponent(searchQuery)}&top=${PAGE_TOP}&skip=${currentSkip}`;
        const res = await fetch(url);
        const data = await res.json();
        const rawItems = Array.isArray(data.items) ? data.items : [];
        totalServerCount = Number(data.totalCount) || totalServerCount;

        if (rawItems.length > 0) {
            const mapped = rawItems.map(p => toolcoinVtMapper(p));
            if (reset && mapped[0]) {
                updateSpotlightBanner(mapped[0]);
            }
            renderItems(mapped);
            currentSkip += rawItems.length;
        }

        if (itemCountLabel) {
            itemCountLabel.innerText = `${totalServerCount > 0 ? totalServerCount.toLocaleString() : loadedItems.length} ITEMS`;
        }

    } catch (err) {
        console.error("PlayFab stream error:", err);
    } finally {
        isFetching = false;
        if (scrollLoader) scrollLoader.style.display = 'none';
    }
}

// 3. Toolcoin Exact Vt Mapper (Direct Translation)
function toolcoinVtMapper(e) {
    const id = e.Id || e.id;
    
    // Title
    let title = "Title not available";
    if (e.Title) {
        title = e.Title['neutral'] || e.Title['NEUTRAL'] || e.Title['en-US'] || Object.values(e.Title)[0] || title;
    }

    // Creator Name (Exact Vt Property)
    let creator = e.DisplayProperties?.creatorName || "Mojang Creator";
    if (creator === "Mojang Creator" && Array.isArray(e.Tags) && e.Tags.length > 0) {
        let cleanTag = e.Tags.find(t => !['addon', 'world', 'skin_pack', 'texture_pack'].includes(t.toLowerCase()));
        if (cleanTag) creator = cleanTag;
    }

    // Description
    let desc = "Official Minecraft Marketplace DLC.";
    if (e.Description) {
        desc = e.Description['neutral'] || e.Description['NEUTRAL'] || e.Description['en-US'] || Object.values(e.Description)[0] || desc;
    }

    // Images (Safe resolution without broken panorama)
    let thumb = "";
    let gallery = [];
    if (Array.isArray(e.Images) && e.Images.length > 0) {
        let tImg = e.Images.find(i => i.Tag === 'Thumbnail' || i.Tag === 'KeyArt');
        if (tImg && tImg.Url) thumb = tImg.Url;
        
        gallery = e.Images.filter(i => i.Tag !== 'Panorama').map(i => i.Url);
    }
    if (!thumb) {
        thumb = gallery[0] || `https://xforgeassets002.xboxlive.com/serviceid-15954734-${id}/Thumbnail_0.jpg`;
    }
    if (gallery.length === 0) gallery.push(thumb);

    return {
        id: String(id).toLowerCase(),
        rawId: id,
        title: title,
        creator: creator,
        desc: desc,
        thumb: thumb,
        gallery: gallery,
        coins: typeof e.DisplayProperties?.price === "number" ? e.DisplayProperties.price : 830,
        rating: e.Rating?.Average ? Number(e.Rating.Average).toFixed(1) : "4.8",
        votes: e.Rating?.TotalRatingsCount || 42,
        version: e.DisplayProperties?.package_version || "1.0.0",
        date: e.CreationDate ? e.CreationDate.split('T')[0] : "2026-08-20",
        raw: e
    };
}

// 4. Spotlight Banner
function updateSpotlightBanner(firstItem) {
    const card = document.getElementById('spotlightCard');
    if (!card) return;

    card.style.background = `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(13,12,18,0.95) 100%), url('${firstItem.thumb}') center/cover`;
    const h2 = card.querySelector('h2');
    const p = card.querySelector('p');
    if (h2) h2.innerText = firstItem.title;
    if (p) p.innerText = `By ${firstItem.creator}`;
    card.onclick = () => openPdp(firstItem);
}

// 5. Render Grid Cards
function renderItems(items) {
    if (!itemsGrid) return;

    items.forEach(item => {
        loadedItems.push(item);

        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.uuid = item.id;

        card.innerHTML = `
            <div class="thumb-holder">
                <img src="${item.thumb}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='https://xforgeassets001.xboxlive.com/serviceid-15954734-${item.rawId}/Thumbnail_0.jpg'">
            </div>
            <div class="item-card-body">
                <h4 class="card-title">${item.title}</h4>
                <div class="card-creator">By ${item.creator}</div>
            </div>
        `;

        updateCardBadge(card);
        card.onclick = () => openPdp(item);
        itemsGrid.appendChild(card);
    });
}

// 6. Infinite Scroll (Next Pages)
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 900) {
        if (!isFetching && currentSkip < totalServerCount) {
            loadCatalogPage(false);
        }
    }
}, { passive: true });

function navigateCategory(cat) {
    currentCategory = cat;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.drawer-item').forEach(d => d.classList.remove('active'));

    if (event && event.target) {
        event.target.closest('.chip')?.classList.add('active');
        event.target.closest('.drawer-item')?.classList.add('active');
    }

    if (sideDrawer && sideDrawer.classList.contains('active')) toggleDrawer();
    loadCatalogPage(true);
}

let searchTimer = null;
function handleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchQuery = document.getElementById('globalSearch').value.trim();
        loadCatalogPage(true);
    }, 400);
}

// 7. PDP Modal with Real Details
function openPdp(item) {
    currentModalItem = item;

    document.getElementById('pdpTitle').innerText = item.title;
    document.getElementById('pdpDescription').innerText = item.desc;
    document.getElementById('pdpStars').innerText = `★ ${item.rating}`;
    document.getElementById('pdpVotes').innerText = `(${item.votes})`;
    document.getElementById('pdpCoins').innerText = `🪙 ${item.coins}`;
    document.getElementById('pdpVersion').innerText = `# v${item.version}`;
    document.getElementById('pdpDate').innerHTML = `<i class="far fa-calendar-alt"></i> ${item.date}`;

    const stage = document.getElementById('pdpStage');
    const thumbs = document.getElementById('pdpThumbs');
    stage.innerHTML = `<img src="${item.gallery[0]}">`;
    thumbs.innerHTML = '';

    item.gallery.forEach((url, idx) => {
        let t = document.createElement('div');
        t.className = `pdp-thumb ${idx === 0 ? 'active' : ''}`;
        t.innerHTML = `<img src="${url}">`;
        t.onclick = () => {
            stage.innerHTML = `<img src="${url}">`;
            thumbs.querySelectorAll('.pdp-thumb').forEach(el => el.classList.remove('active'));
            t.classList.add('active');
        };
        thumbs.appendChild(t);
    });

    // Check Availability
    const isAvail = availableDb.has(item.id);
    const dlBox = document.getElementById('downloadContainer');
    const reqBox = document.getElementById('unavailableContainer');
    const linksList = document.getElementById('shortenerLinks');

    if (isAvail) {
        let availData = availableDb.get(item.id);
        let directUrl = availData.fileBlocks?.[0]?.mainLink?.url || "";
        linksList.innerHTML = `
            <a href="${SHORTENERS.linkvertise(item.id, directUrl)}" target="_blank" class="short-btn linkvertise">
                <span><i class="fas fa-bolt"></i> Download via Linkvertise</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.workink(item.id, directUrl)}" target="_blank" class="short-btn workink">
                <span><i class="fas fa-download"></i> Download via Work.ink</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.lootlabs(item.id, directUrl)}" target="_blank" class="short-btn lootlabs">
                <span><i class="fas fa-gift"></i> Download via Lootlabs</span>
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        dlBox.style.display = 'block';
        reqBox.style.display = 'none';
    } else {
        dlBox.style.display = 'none';
        reqBox.style.display = 'block';
    }

    pdpModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePdp() {
    pdpModal.style.display = 'none';
    document.body.style.overflow = '';
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-body').forEach(t => t.style.display = 'none');

    if (event && event.target) event.target.closest('.tab-btn')?.classList.add('active');

    if (tabName === 'desc') document.getElementById('tabDesc').style.display = 'block';
    if (tabName === 'howto') document.getElementById('tabHowTo').style.display = 'block';
    if (tabName === 'faq') document.getElementById('tabFaq').style.display = 'block';
}

function submitRequest() {
    if (!currentModalItem) return;
    let name = prompt("Enter your Name or Discord ID to request this pack:");
    if (!name) return;

    database.ref('requests').push().set({
        addon: currentModalItem.title,
        link: `https://www.minecraft.net/en-us/marketplace/pdp?id=${currentModalItem.rawId}`,
        user: name,
        status: "pending",
        timestamp: Date.now()
    }).then(() => {
        alert("✅ Request sent to Admin!");
        closePdp();
    });
}
