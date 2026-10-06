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

// 1. Firebase Availability
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

// 2. PlayFab Catalog Stream with Toolcoin Skip/Top Pagination
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
            if (reset && rawItems[0]) {
                updateSpotlightBanner(rawItems[0]);
            }
            renderItems(rawItems);
            currentSkip += rawItems.length;
        }

        if (itemCountLabel) {
            itemCountLabel.innerText = `${totalServerCount > 0 ? totalServerCount.toLocaleString() : loadedItems.length} ITEMS`;
        }

    } catch (err) {
        console.error("PlayFab load error:", err);
    } finally {
        isFetching = false;
        if (scrollLoader) scrollLoader.style.display = 'none';
    }
}

// 3. Spotlight Banner
function updateSpotlightBanner(firstItem) {
    const card = document.getElementById('spotlightCard');
    if (!card) return;

    let title = getItemTitle(firstItem);
    let creator = getItemCreator(firstItem);
    let thumb = getValidThumb(firstItem);

    card.style.background = `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(13,12,18,0.95) 100%), url('${thumb}') center/cover`;
    const h2 = card.querySelector('h2');
    const p = card.querySelector('p');
    if (h2) h2.innerText = title;
    if (p) p.innerText = `By ${creator}`;
    card.onclick = () => openPdp(firstItem.Id || firstItem.id, firstItem);
}

// 4. Toolcoin Clean Data Extraction
function getValidThumb(item) {
    if (Array.isArray(item.Images) && item.Images.length > 0) {
        const thumb = item.Images.find(i => i.Tag === 'Thumbnail' || i.Tag === 'KeyArt');
        if (thumb && thumb.Url) return thumb.Url;
        const nonPano = item.Images.find(i => i.Tag !== 'Panorama');
        if (nonPano && nonPano.Url) return nonPano.Url;
        if (item.Images[0]?.Url) return item.Images[0].Url;
    }
    const id = item.Id || item.id;
    return `https://xforgeassets002.xboxlive.com/serviceid-15954734-${id}/Thumbnail_0.jpg`;
}

function getItemTitle(item) {
    if (item.Title) {
        return item.Title['neutral'] || item.Title['NEUTRAL'] || item.Title['en-US'] || Object.values(item.Title)[0];
    }
    return item.title || item.DisplayName || "Minecraft Pack";
}

function getItemCreator(item) {
    if (item.DisplayProperties && item.DisplayProperties.creatorName) {
        return item.DisplayProperties.creatorName;
    }
    if (Array.isArray(item.Tags) && item.Tags.length > 0) {
        const tag = item.Tags.find(t => !['addon', 'world', 'skin_pack', 'texture_pack'].includes(t.toLowerCase()));
        if (tag) return tag;
    }
    return "Mojang Creator";
}

// 5. Render Grid Cards
function renderItems(items) {
    if (!itemsGrid) return;

    items.forEach(item => {
        loadedItems.push(item);
        const id = item.Id || item.id;
        const uuid = String(id).toLowerCase();
        const title = getItemTitle(item);
        const creator = getItemCreator(item);
        const thumb = getValidThumb(item);

        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.uuid = uuid;

        card.innerHTML = `
            <div class="thumb-holder">
                <img src="${thumb}" alt="${title}" loading="lazy" onerror="this.onerror=null;this.src='https://xforgeassets001.xboxlive.com/serviceid-15954734-${id}/Thumbnail_0.jpg'">
            </div>
            <div class="item-card-body">
                <h4 class="card-title">${title}</h4>
                <div class="card-creator">By ${creator}</div>
            </div>
        `;

        updateCardBadge(card);
        card.onclick = () => openPdp(id, item);
        itemsGrid.appendChild(card);
    });
}

// Infinite Scroll Pagination
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

// 6. PDP Modal with Real GetPublishedItem Details
async function openPdp(id, fallbackItem) {
    currentModalItem = fallbackItem;
    const uuid = String(id).toLowerCase();
    const fallbackTitle = getItemTitle(fallbackItem);

    document.getElementById('pdpTitle').innerText = fallbackTitle;
    document.getElementById('pdpDescription').innerText = "Loading official marketplace details...";
    document.getElementById('pdpStars').innerText = `★ 4.8`;
    document.getElementById('pdpVotes').innerText = `(42)`;
    document.getElementById('pdpCoins').innerText = `🪙 830`;

    const stage = document.getElementById('pdpStage');
    const thumbs = document.getElementById('pdpThumbs');
    const defaultThumb = getValidThumb(fallbackItem);
    stage.innerHTML = `<img src="${defaultThumb}">`;
    thumbs.innerHTML = '';

    // Availability Box Check
    const isAvail = availableDb.has(uuid);
    const dlBox = document.getElementById('downloadContainer');
    const reqBox = document.getElementById('unavailableContainer');
    const linksList = document.getElementById('shortenerLinks');

    if (isAvail) {
        let availData = availableDb.get(uuid);
        let directUrl = availData.fileBlocks?.[0]?.mainLink?.url || "";
        linksList.innerHTML = `
            <a href="${SHORTENERS.linkvertise(uuid, directUrl)}" target="_blank" class="short-btn linkvertise">
                <span><i class="fas fa-bolt"></i> Download via Linkvertise</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.workink(uuid, directUrl)}" target="_blank" class="short-btn workink">
                <span><i class="fas fa-download"></i> Download via Work.ink</span>
                <i class="fas fa-chevron-right"></i>
            </a>
            <a href="${SHORTENERS.lootlabs(uuid, directUrl)}" target="_blank" class="short-btn lootlabs">
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

    // Toolcoin Single Item Deep Fetch
    try {
        const res = await fetch(`${PLAYFAB_WORKER}?action=item&id=${id}`);
        const fullItem = await res.json();
        const item = fullItem.Id ? fullItem : fallbackItem;
        currentModalItem = item;

        let desc = "Official Minecraft Marketplace DLC.";
        if (item.Description) {
            desc = item.Description['neutral'] || item.Description['NEUTRAL'] || item.Description['en-US'] || Object.values(item.Description)[0] || desc;
        }
        document.getElementById('pdpDescription').innerText = desc;

        if (item.Rating?.Average) {
            document.getElementById('pdpStars').innerText = `★ ${Number(item.Rating.Average).toFixed(1)}`;
            document.getElementById('pdpVotes').innerText = `(${item.Rating.TotalRatingsCount || 0})`;
        }

        if (item.PriceOptions?.Prices?.[0]?.Amounts?.[0]?.Amount) {
            document.getElementById('pdpCoins').innerText = `🪙 ${item.PriceOptions.Prices[0].Amounts[0].Amount}`;
        }

        const version = item.DisplayProperties?.package_version || "1.0.0";
        const date = item.CreationDate ? item.CreationDate.split('T')[0] : "2026-08-20";
        document.getElementById('pdpVersion').innerText = `# v${version}`;
        document.getElementById('pdpDate').innerHTML = `<i class="far fa-calendar-alt"></i> ${date}`;

        // Screenshots Carousel
        let gallery = [];
        if (Array.isArray(item.Images) && item.Images.length > 0) {
            gallery = item.Images.filter(i => i.Tag !== 'Panorama');
        }
        if (gallery.length === 0) gallery.push({ Url: defaultThumb });

        stage.innerHTML = `<img src="${gallery[0].Url}">`;
        thumbs.innerHTML = '';
        gallery.forEach((imgObj, idx) => {
            let t = document.createElement('div');
            t.className = `pdp-thumb ${idx === 0 ? 'active' : ''}`;
            t.innerHTML = `<img src="${imgObj.Url}">`;
            t.onclick = () => {
                stage.innerHTML = `<img src="${imgObj.Url}">`;
                thumbs.querySelectorAll('.pdp-thumb').forEach(el => el.classList.remove('active'));
                t.classList.add('active');
            };
            thumbs.appendChild(t);
        });

    } catch (e) {
        console.error("Deep item fetch error:", e);
    }
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

    let title = getItemTitle(currentModalItem);
    const id = currentModalItem.Id || currentModalItem.id;

    database.ref('requests').push().set({
        addon: title,
        link: `https://www.minecraft.net/en-us/marketplace/pdp?id=${id}`,
        user: name,
        status: "pending",
        timestamp: Date.now()
    }).then(() => {
        alert("✅ Request sent to Admin!");
        closePdp();
    });
}
