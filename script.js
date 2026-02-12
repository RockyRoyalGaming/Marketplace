// --- 1. DATABASE (Items List) ---
const items = [
    // --- ITEM 103: PANORAMA EXAMPLE ---
    {
        id: 103,
        title: "Epic Cyberpunk City",
        category: "world",
        images: [
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image3cuttrope/1.png", 
        ],
        panorama: "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image3cuttrope/panorama0.png", 
        description: `Explore a massive futuristic city with neon lights and flying cars. Features a full panorama view!
1
2`,
        links: [
            { type: "Download World", url: "#", icon: "fa-globe" },
            { type: "Cyber Skin", url: "#", icon: "fa-tshirt" }
        ]
    },
    // --- ITEM 19: CUT THE ROPE ---
    {
        id: 19, 
        title: "Cut the Rope",
        category: "addon",
        images: [
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image3cuttrope/1.png",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image3cuttrope/2.png",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image3cuttrope/3.png",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image3cuttrope/4.png",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image3cuttrope/5.png",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image3cuttrope/6.png",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image3cuttrope/panorama0.png"
        ],
        description: `Om Nom's sweetest adventure is here! Play puzzling mini-games with Om Nom in this Cut the Rope adventure. Unlock, mix and match 50+ Om Nom costumes, accessories, and transformations for 400+ looks. Craft candy tools, pop bubbles, and build wacky puzzles with Cut the Rope inspired blocks like magnets, fans, and jumbo fireworks! Are you up for the tasty task?

Vibrant Visuals Enhanced ✓

CHANGELOG:`,
        links: [
            { type: "Addon", url: "https://linkpays.in/7YYUC9YB", icon: "fa-puzzle-piece" }
        ]
    },
    // --- ITEM 18: RPG ADDON ---
    {
        id: 18, 
        title: "RPG Add-On",
        category: "addon",
        images: [
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image2rpg/image_13%20(14).jpg",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image2rpg/image_2%20(10).jpg",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image2rpg/image_3%20(10).jpg",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image2rpg/image_4%20(10).jpg",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image2rpg/image_5%20(10).jpg",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image2rpg/image_6%20(10).jpg",
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image2rpg/image_7%20(8).jpg", 
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image2rpg/image_8%20(7).jpg", 
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image2rpg/image_9%20(6).jpg", 
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/refs/heads/Image2rpg/panorama1%20(26).jpg"
        ],
        description: `RPG Add-On adds 50+ RPG contents in ANY WORLD. CHOOSE CLASSES, RANK UP, BUILD GUILDS, and MORE!
+ New classes and skills to unlock!
+ Complex boss fight mechanism!
+ Rare mini biome & loot crates!
+ Encounter custom mobs, tribes, and companions!
+ Tons of weapons and armor choices!

This Add-On works with ANY texture or animation packs.

CHANGELOG:
Thank you for the amazing support and feedback! This 1.1.0 hotfix includes new features below:
- FIXED Animation compatibility and bugs!
- FIXED Class and guild master issues!
- FIXED Boss-fight problems!
- NEW OP settings and multiplayer viability!
- NEW Snap weapons & armors!
AND MANY MORE!!!`,
        links: [
            { type: "Addon", url: "https://linkpays.in/t5zfL", icon: "fa-puzzle-piece" }
        ]
    },
    // --- ITEM 17: WITHER APOCALYPSE ---
    {
        id: 17, 
        title: "WITHER APOCALYPSE 1.1",
        category: "addon",
        images: [
            "https://raw.githubusercontent.com/RockyRoyalGaming/Marketplace/9bfdbb406bbd71a4a6b4ab0db2dea5f7e2486ad4/image_13%20(13).jpg",
            "https://i.imgur.com/VJCknTb.jpeg",
            "https://i.imgur.com/oiL5S4q.jpeg",
            "https://i.imgur.com/8IiPZlU.jpeg",
            "https://i.imgur.com/0JUVOxa.jpeg",
            "https://i.imgur.com/3RppNki.jpeg",
            "https://i.imgur.com/rwejOy2.jpeg", 
            "https://i.imgur.com/XeieJ7H.jpeg"
        ],
        description: `What happened to the Wither? IT’S OP! Can you survive its dangerous powers? Summon the Wither Wraith and watch it turn the overworld into a dark wasteland. Try your best to survive and obtain the powerful weapon!

- A massive Wither Boss with dangerous abilities
- Biomes slowly turn into Withered Lands
- New powerful Wither Weapons
- New Withered Mobs

CHANGELOG:
Wither Apocalypse 1.1:
+ New Withered Mobs
+ New Withered Beacon
+ New Dash Ability
+ Settings menu
+ Further Corruption Optimisation
+ Boss AI Tweaks
+ Many smaller fixes and improvements

Good luck out there!`,
        links: [
            { type: "Addon", url: "https://linkpays.in/qUPkc", icon: "fa-puzzle-piece" }
        ]
    },
    // --- ITEM 16: FURNITURE ---
    {
        id: 16, 
        title: "FURNITURE Add-On",
        category: "addon",
        images: [
            "https://i.imgur.com/KfZlma0.jpeg",
            "https://i.imgur.com/yjI7zuV.jpeg",
            "https://i.imgur.com/C3NjQ8Y.jpeg",
            "https://i.imgur.com/RAexgpb.jpeg",
            "https://i.imgur.com/S26wwK8.jpeg",
            "https://i.imgur.com/ZHL4gAE.jpeg",
            "https://i.imgur.com/XcEQvYt.jpeg", 
            "https://i.imgur.com/y9LZgd0.jpeg", 
            "https://i.imgur.com/GvrvlTb.jpeg", 
            "https://i.imgur.com/mT0r8uo.jpeg", 
            "https://i.imgur.com/g0zVFcv.jpeg"
        ],
        description: `This FURNITURE Add-On fills ANY WORLD with over 1000+ functioning furniture and decorations.

+ 1000 Craftable Furniture options
+ Decorative and functional Furniture
+ Features wooden and color variants

CHANGELOG:
Bug fixing update for FURNITURE 2.0!
- Added VFX on statues and leaves
- Fixed issues of certain items leaving ghost blocks & missing recipes
- Improvements on saplings & trees (leaf decay, sapling drops...)
- Furniture Merchant is now enabled by default (disable in settings block)
- More fixes!`,
        links: [
            { type: "Addon", url: "https://linkpays.in/RXjqBB", icon: "fa-puzzle-piece" }
        ]
    },
    // --- ITEM 15: TRUE REALISM HD ---
    {
        id: 15, 
        title: "TrueRealism HD",
        category: "world",
        images: [
            "https://i.imgur.com/RKrsM8s.jpeg",
            "https://i.imgur.com/Hs8EZUk.jpeg",
            "https://i.imgur.com/pvcnNk1.jpeg",
            "https://i.imgur.com/5iKN9Kf.jpeg",
            "https://i.imgur.com/xtWrq8v.jpeg",
            "https://i.imgur.com/6OHth66.jpeg",
            "https://i.imgur.com/IUTG5Bz.jpeg", 
            "https://i.imgur.com/Sugugkq.jpeg", 
            "https://i.imgur.com/ALoXW4S.jpeg",
            "https://i.imgur.com/PCA0yMV.jpeg"
        ],
        description: `Redefine your world with next-level HD graphics and stunning visual features. Unparalleled beauty awaits!

- Realistic sky, life-like clouds and atmospheric fog
- Highly detailed hand-crafted 64x textures
- Waving foliage, block variations and custom mob models for greater realism
- Works on all devices and in any world

True Realism HD by SCT Studios & Pathway Studios

CHANGELOG:
Updated TrueRealism HD to include the latest textures for The Mounts of Mayhem and Copper Age drops, including the nautilus, copper golem, copper tools, spears, and much more — in addition to various fixes and optimizations.`,
        links: [
            { type: "Texture", url: "https://linkpays.in/pjiTeSF", icon: "fa-image" }
        ]
    },
    // --- ITEM 14: ACTIONS & STUFF ---
    {
        id: 14,
        title: "Actions & Stuff 1.9.1",
        category: "texture",
        image: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/bb31b676-ab14-4019-b302-8c0069ddd36b/actionsandstuff_Thumbnail_0.jpg",
        description: `The Animation Pack You Didn't Know You Needed!
• Player Animations
• New & Improved Mob Animations
• 3D Item Models`,
        links: [
            { type: "Texture", url: "https://devuploads.com/2y27j0ya5mb8", icon: "fa-image" },
            { type: "Skin", url: "https://devuploads.com/m5ivdmhn4v2j", icon: "fa-tshirt" }
        ]
    },
    // --- ITEM 13: FUNGUS ---
    {
        id: 13,
        title: "Fungus Infection Add-On",
        category: "addon",
        image: "https://i.imgur.com/DygmgaK.jpeg",
        description: "The Fungus Infection Add-On can take over your Survival World! Includes 20+ Fungus Monsters, Biomes, and Items.",
        links: [
            { type: "Addon", url: "https://devuploads.com/e85g5tuj06kw", icon: "fa-puzzle-piece" }
        ]
    },
    // --- ITEM 12: PETS ---
    {
        id: 12,
        title: "PETS Add-On",
        category: "addon",
        image: "https://i.imgur.com/VMRhvz0.jpeg",
        description: "Craft 50+ brainrot pets that EVOLVE, BATTLE, and that you can RIDE!",
        links: [
            { type: "Addon", url: "https://devuploads.com/u5qxftp31ryu", icon: "fa-puzzle-piece" }
        ]
    },
    // --- ITEM 11: HEALTH BARS ---
    {
        id: 11,
        title: "Health Bars 1.1 Add-On",
        category: "addon",
        image: "https://i.postimg.cc/T2zPVCRf/image-12-(30).jpg",
        description: "With the Health Bars Add-On, every mob and player gets their very own Health Bar.",
        links: [
            { type: "Addon", url: "https://linkpays.in/MeNBy", icon: "fa-puzzle-piece" }
        ]
    },
    // --- ITEM 10: FOREST CRAFT ---
    {
        id: 10,
        title: "Forest Craft Add-On 4.0",
        category: "addon",
        image: "https://i.postimg.cc/5yQ7JfGm/image-12-(29).jpg",
        description: "Forest Craft Add-On 4.0 adds 30 Trees to your Survival world. Chop new trees and build with 28 new wood types!",
        links: [
            { type: "Addon", url: "https://linkpays.in/d6yftsfw", icon: "fa-puzzle-piece" }
        ]
    },
    // --- ITEM 9: STRANGER THINGS ---
    {
        id: 9,
        title: "Stranger Things",
        category: "world",
        image: "https://i.postimg.cc/SK7WMpy3/image_12_(28).jpg",
        description: "Join The Party and play as your favorite character to solve puzzles and vanquish foes.",
        links: [
            { type: "World", url: "https://linkpays.in/nXrWN8y", icon: "fa-globe" },
            { type: "Skin", url: "https://www.mediafire.com/file/ok4rs6ns52z7hpn/Stranger_Things_%2528skin_pack%2529_RockyRoyalGaming.mcpack/file", icon: "fa-tshirt" }
        ]
    },
    // --- ITEM 8: ANGRY BIRDS ---
    {
        id: 8,
        title: "Angry Birds",
        category: "world",
        image: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/203ff9c0-97e4-4c61-9518-54bf6c53208f/angrybirds_Thumbnail_0.jpg",
        description: "Rescue your friends, save the eggs, and stop the pesky Pigs' grand plans.",
        links: [
            { type: "World", url: "https://linkpays.in/YsHu", icon: "fa-globe" },
            { type: "Skin", url: "https://gofile.io/d/UQdYoa", icon: "fa-tshirt" }
        ]
    },
    // --- ITEM 7: BLUEY ---
    {
        id: 7,
        title: "Bluey's House",
        category: "world",
        image: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/345ffd83-2bc6-4990-86a5-6e79888ab6d4/BLUEY_Thumbnail_0.jpg",
        description: "Step inside Bluey’s Family home and play games like I-Spy, Hide and Seek, and Ragdoll.",
        links: [
            { type: "World", url: "https://linkpays.in/HOApOgEm", icon: "fa-globe" }
        ]
    },
    // --- ITEM 1: HOW TO TRAIN YOUR DRAGON ---
    {
        id: 1,
        title: "How to Train Your Dragon",
        category: "addon",
        image: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/ccca9e5a-b363-47d4-b75d-b8622d28cb15/zenith_thumbnail_0.jpg",
        description: "Discover Toothless and other beloved dragons in your Minecraft Worlds!",
        links: [
            { type: "Addon", url: "https://linkpays.in/fXMhJX", icon: "fa-puzzle-piece" }
        ]
    },
    // --- ITEM 2: DRAGON BALL Z ---
    {
        id: 2,
        title: "Dragon Ball Z",
        category: "world",
        image: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/c3f0a98e-f39b-4f40-944e-854395bb2f59/dragon_ball_z_thumbnail_0.jpg",
        description: "Battle as your favorite Dragon Ball Z character in this explosive DLC!",
        links: [
            { type: "World", url: "https://linkpays.in/z3ehlv", icon: "fa-globe" },
            { type: "Skin", url: "https://gofile.io/d/LmRxXL", icon: "fa-tshirt" }
        ]
    },
    // --- ITEM 3: STAR WARS ---
    {
        id: 3,
        title: "STAR WARS",
        category: "mashup",
        image: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/a69407fb-6802-4036-bd95-ecd431be7987/Star_Wars_Thumbnail_0.jpg",
        description: "Complete Star Wars experience including World, Skins, and Textures.",
        links: [
            { type: "Mashup Pack", url: "https://linkpays.in/cfcDc", icon: "fa-layer-group" }
        ]
    },
    // --- ITEM 4: REALISM VISUALS ---
    {
        id: 4,
        title: "Realism Visuals",
        category: "texture",
        image: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/cff099cb-5d80-4743-ba4e-a149796db238/Realism_Visuals_Thumbnail_0.jpg",
        description: "Fine-tuned for vanilla. Realistic shading and custom player animations.",
        links: [
            { type: "Texture", url: "https://linkpays.in/ToXtj", icon: "fa-image" }
        ]
    },
    // --- ITEM 5: BEE FARMER ---
    {
        id: 5,
        title: "Bee Farmer",
        category: "skin",
        image: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/f6efebd9-5e5a-4452-a5da-4116164af024/BeeFarmer_Thumbnail_0.jpg",
        description: "Includes 12 unique skins, one is free to try!",
        links: [
            { type: "Skin", url: "https://linkpays.in/vQHtOc", icon: "fa-tshirt" }
        ]
    },
    // --- ITEM 6: DINOSAUR BIOMES ---
    {
        id: 6,
        title: "Dinosaur Biomes",
        category: "mashup",
        image: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/8d5f7d0a-1830-4848-81c1-42886404987d/DinosaurMashup_Thumbnail_0.jpg",
        description: "Custom Biomes themed from the Jurassic age! Dinosaurs are tamable and ridable!",
        links: [
            { type: "Mashup Pack", url: "https://linkpays.in/ikxkR1", icon: "fa-layer-group" }
        ]
    }
];

// --- 2. SETUP & DISPLAY ---
const container = document.getElementById('itemsContainer');
const modal = document.getElementById('itemModal');
const readMoreBtn = document.getElementById('readMoreBtn');
const descElement = document.getElementById('modalDesc');

// Panorama Elements
const panoramaSection = document.getElementById('panoramaSection');
const panoramaImg = document.getElementById('modalPanoramaImg');

let currentImgList = [];
let currentImgIdx = 0;

function displayItems(data) {
    container.innerHTML = "";
    if (data.length === 0) {
        container.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #666; padding: 20px;'>No items found.</p>";
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.onclick = () => openModal(item);
        
        // Smart Thumbnail
        let thumbUrl = "https://via.placeholder.com/400x250?text=No+Image";
        if (item.images && item.images.length > 0) thumbUrl = item.images[0];
        else if (item.image) thumbUrl = item.image;

        card.innerHTML = `
            <img src="${thumbUrl}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/400x250?text=No+Image'">
            <div class="card-info">
                <div class="card-title">${item.title}</div>
                <div class="card-cat"><i class="fas fa-tag"></i> ${item.category.toUpperCase()}</div>
            </div>
        `;
        container.appendChild(card);
    });
}
displayItems(items);

// --- 3. SEARCH & FILTERS ---
function searchItems() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = items.filter(item => 
        item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
    );
    displayItems(filtered);
}

function filterItems(category) {
    document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.filters button[onclick="filterItems('${category}')"]`);
    if(activeBtn) activeBtn.classList.add('active');

    if (category === 'all') displayItems(items);
    else displayItems(items.filter(item => item.category === category));
}

// --- 4. SORT MENU ---
function toggleSortMenu() {
    const menu = document.getElementById('sortMenu');
    menu.style.display = (menu.style.display === "block") ? "none" : "block";
}

function sortContent(type) {
    let sortedItems = [...items];
    if (type === 'recent') sortedItems.sort((a, b) => b.id - a.id);
    else if (type === 'name') sortedItems.sort((a, b) => a.title.localeCompare(b.title));
    else sortedItems.sort((a, b) => a.id - b.id);
    displayItems(sortedItems);
    document.getElementById('sortMenu').style.display = "none";
}

window.addEventListener('click', function(e) {
    if (!e.target.closest('.sort-dropdown') && !e.target.closest('button[title="Filters"]')) {
        document.getElementById('sortMenu').style.display = 'none';
    }
});

// --- 5. MODAL LOGIC (FIXED: Vertical Buttons & Panorama Logic) ---
const btnContainer = document.getElementById('downloadButtonsContainer');

function openModal(item) {
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();
    
    // Description Logic
    const descText = item.description ? item.description.replace(/\n/g, '<br>') : "No description.";
    descElement.innerHTML = descText;

    // Read More
    if (readMoreBtn) {
        descElement.classList.remove('expanded');
        readMoreBtn.style.display = "none";
        readMoreBtn.innerText = "Read more...";
        setTimeout(() => {
            if (descElement.scrollHeight > 85) readMoreBtn.style.display = "block";
        }, 10);
    }

    // --- SLIDER LOGIC ---
    const imgElement = document.getElementById('modalImg');
    if (item.images && item.images.length > 0) currentImgList = item.images;
    else currentImgList = [item.image || "https://via.placeholder.com/400x250"];
    
    currentImgIdx = 0;
    updateModalImage();

    // Setup Slider Buttons (Modern Side Bars)
    const existingBtns = document.querySelectorAll('.slider-btn');
    existingBtns.forEach(btn => btn.remove());

    if (currentImgList.length > 1) {
        // We inject these into the slider container defined in HTML now
        const sliderContainer = document.getElementById('sliderContainer');
        
        const prevBtn = document.createElement('button');
        prevBtn.className = 'slider-btn prev-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = (e) => { e.stopPropagation(); changeImage(-1); };
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'slider-btn next-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = (e) => { e.stopPropagation(); changeImage(1); };
        
        sliderContainer.appendChild(prevBtn);
        sliderContainer.appendChild(nextBtn);
    }

    // --- DOWNLOAD BUTTONS (BACK TO VERTICAL STYLE) ---
    btnContainer.innerHTML = "";
    if (item.links && item.links.length > 0) {
        item.links.forEach(link => {
            const a = document.createElement('a');
            a.className = "dwn-option-btn"; 
            a.href = link.url;
            a.target = "_blank";
            
            // OLD STYLE HTML (Arrow Right)
            a.innerHTML = `
                <div class="btn-left">
                    <i class="fas ${link.icon || 'fa-download'}"></i>
                    <span>${link.type}</span>
                </div>
                <i class="fas fa-chevron-right" style="font-size: 0.8rem; color:#666;"></i>
            `;
            btnContainer.appendChild(a);
        });
    } else {
        btnContainer.innerHTML = "<p style='color:#666; font-size:0.9rem;'>No links.</p>";
    }

    // --- PANORAMA LOGIC ---
    if (item.panorama && panoramaSection) {
        panoramaImg.src = item.panorama;
        panoramaSection.style.display = "block"; 
        panoramaSection.querySelector('.panorama-container').scrollLeft = 0;
    } else if (panoramaSection) {
        panoramaSection.style.display = "none";
        panoramaImg.src = "";
    }

    modal.style.display = "flex";
}

// --- HELPER FUNCTIONS ---
function changeImage(direction) {
    currentImgIdx += direction;
    if (currentImgIdx >= currentImgList.length) currentImgIdx = 0;
    if (currentImgIdx < 0) currentImgIdx = currentImgList.length - 1;
    updateModalImage();
}

function updateModalImage() {
    const imgElement = document.getElementById('modalImg');
    imgElement.src = currentImgList[currentImgIdx];
    imgElement.onerror = function() { this.src = 'https://via.placeholder.com/400x250?text=Error'; };
}

function toggleReadMore() {
    if (descElement.classList.contains('expanded')) {
        descElement.classList.remove('expanded');
        readMoreBtn.innerText = "Read more...";
    } else {
        descElement.classList.add('expanded');
        readMoreBtn.innerText = "Read less";
    }
}

function closeModal() { modal.style.display = "none"; }
window.onclick = function(e) { if (e.target == modal) closeModal(); }

// --- 6. DISCORD REQUEST ---
function focusRequestBar() {
    const input = document.getElementById('requestInput');
    if(input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus();
        input.style.border = "1px solid #4caf50";
        setTimeout(() => { input.style.border = "1px solid rgba(255,255,255,0.1)"; }, 2000);
    }
}

function sendRequest() {
    const input = document.getElementById('requestInput');
    const url = input.value.trim();
    if (url === "") { alert("Please paste a link first!"); return; }
    if (!url.includes("minecraft.net")) { alert("Only Minecraft Marketplace Links!"); return; }
    
    const webhookURL = "https://discord.com/api/webhooks/1469778264607293562/slHI5zB96puMgK6Zu2aymdqCZs1pAxLuOiG7F9wYOqw6tnFH4-Scax74aC79kAkpgEF2";
    fetch(webhookURL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            embeds: [{
                title: "🚀 New Request", description: "Link:", 
                fields: [{ name: "URL", value: url }], color: 5763719
            }]
        })
    }).then(res => {
        if(res.ok) { alert("Sent!"); input.value = ""; }
        else alert("Error.");
    });
}

// --- 7. PREMIUM STARFIELD (Canvas Animation) ---
const canvas = document.getElementById('starfield');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height, stars;
    function initStars() {
        width = window.innerWidth; height = window.innerHeight;
        canvas.width = width; canvas.height = height;
        stars = [];
        const numStars = width < 768 ? 150 : 350; 
        for (let i = 0; i < numStars; i++) {
            stars.push({ x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 1.5, opacity: Math.random(), speed: Math.random() * 0.02 + 0.005 });
        }
    }
    function animateStars() {
        ctx.clearRect(0, 0, width, height);
        stars.forEach(star => {
            ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`; ctx.fill();
            star.opacity += star.speed; if (star.opacity > 1 || star.opacity < 0.1) star.speed = -star.speed;
        });
        requestAnimationFrame(animateStars);
    }
    window.addEventListener('resize', initStars); initStars(); animateStars();
}
