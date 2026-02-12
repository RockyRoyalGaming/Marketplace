// --- 1. DATABASE (Items List) ---
const items = [
        {
        id: 15, 
        title: "TrueRealism HD",
        category: "world",
        // Multiple Images
        images: [
            "https://i.imgur.com/RKrsM8s.jpeg", // Pehli Photo
            "https://i.imgur.com/Hs8EZUk.jpeg",
            "https://i.imgur.com/pvcnNk1.jpeg",
            "https://i.imgur.com/5iKN9Kf.jpeg",
            "https://i.imgur.com/xtWrq8v.jpeg",
            "https://i.imgur.com/6OHth66.jpeg",
            "https://i.imgur.com/IUTG5Bz.jpeg", 
            "https://i.imgur.com/Sugugkq.jpeg", 
            "https://i.imgur.com/ALoXW4S.jpeg",
            "https://i.imgur.com/PCA0yMV.jpeg", // Dusri Photo
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
    }, // <--- Comma lagana na bhulein
    // NAYA ITEM (Multiple Images Example)
    {
        id: 102, 
        title: "NAYA ITEM KA NAAM",
        category: "world",
        // Multiple Images
        images: [
            "https://via.placeholder.com/400x250.png?text=Image+1", // Pehli Photo
            "https://via.placeholder.com/400x250.png?text=Image+2", // Dusri Photo
            "https://via.placeholder.com/400x250.png?text=Image+3"
        ],
        description: `Ye ek naya item hai.
• Feature 1
• Feature 2
• Feature 3`,
        links: [
            { type: "Download", url: "#", icon: "fa-download" }
        ]
    }, // <--- Comma lagana na bhulein

    // PURANE ITEMS
    {
        id: 14,
        title: "Actions & Stuff 1.9.1",
        category: "texture",
        // Single Image support
        image: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/bb31b676-ab14-4019-b302-8c0069ddd36b/actionsandstuff_Thumbnail_0.jpg",
        description: `The Animation Pack You Didn't Know You Needed!
• Player Animations
• New & Improved Mob Animations
• 3D Item Models
• Custom Armour
• Now with 100% more Vibrant Visuals`,
        links: [
            { type: "Texture", url: "https://devuploads.com/2y27j0ya5mb8", icon: "fa-image" },
            { type: "Skin", url: "https://devuploads.com/m5ivdmhn4v2j", icon: "fa-tshirt" }
        ]
    },
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
    {
        id: 12,
        title: "PETS Add-On",
        category: "addon",
        image: "https://i.imgur.com/VMRhvz0.jpeg",
        description: "Craft 50+ brainrot pets that EVOLVE, BATTLE, and that you can RIDE! (- 96 Brainrot Pets!)",
        links: [
            { type: "Addon", url: "https://devuploads.com/u5qxftp31ryu", icon: "fa-puzzle-piece" }
        ]
    },
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
    {
        id: 10,
        title: "Forest Craft Add-On 4.0",
        category: "addon",
        image: "https://i.postimg.cc/5yQ7JfGm/image-12-(29).jpg",
        description: "Forest Craft Add-On 4.0 adds 30 Trees to your Survival world. Chop new trees, harvest fruit, and build with 28 new wood types!",
        links: [
            { type: "Addon", url: "https://linkpays.in/d6yftsfw", icon: "fa-puzzle-piece" }
        ]
    },
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
        
        // --- SMART THUMBNAIL LOGIC ---
        // Agar 'images' list hai to pehli photo lo, nahi to 'image' lo
        let thumbUrl = "https://via.placeholder.com/400x250?text=No+Image";
        if (item.images && item.images.length > 0) {
            thumbUrl = item.images[0];
        } else if (item.image) {
            thumbUrl = item.image;
        }

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

// --- 5. MODAL LOGIC (Complete) ---
const btnContainer = document.getElementById('downloadButtonsContainer');

function openModal(item) {
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();
    
    // Description Logic
    const descText = item.description ? item.description.replace(/\n/g, '<br>') : "No description.";
    descElement.innerHTML = descText;

    // --- READ MORE LOGIC ---
    if (readMoreBtn) { // Check if button exists in HTML to prevent crash
        descElement.classList.remove('expanded');
        readMoreBtn.style.display = "none";
        readMoreBtn.innerText = "Read more...";
        
        // Timeout to allow browser to calculate height
        setTimeout(() => {
            if (descElement.scrollHeight > 85) {
                readMoreBtn.style.display = "block";
            }
        }, 10);
    }

    // --- SLIDER LOGIC ---
    const imgElement = document.getElementById('modalImg');
    
    // Decide Image Source
    if (item.images && item.images.length > 0) {
        currentImgList = item.images;
    } else {
        currentImgList = [item.image || "https://via.placeholder.com/400x250"];
    }
    
    currentImgIdx = 0;
    updateModalImage();

    // Reset Buttons
    const existingBtns = document.querySelectorAll('.slider-btn');
    existingBtns.forEach(btn => btn.remove());

    // Add Buttons if Multiple Images
    if (currentImgList.length > 1) {
        const sliderContainer = imgElement.parentElement;
        sliderContainer.style.position = 'relative';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'slider-btn prev-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = (e) => { e.stopPropagation(); changeImage(-1); };

        const nextBtn = document.createElement('button');
        nextBtn.className = 'slider-btn next-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = (e) => { e.stopPropagation(); changeImage(1); };

        imgElement.insertAdjacentElement('afterend', prevBtn);
        imgElement.insertAdjacentElement('afterend', nextBtn);
        
        // Center buttons vertically
        setTimeout(() => {
            const topPos = (imgElement.offsetHeight / 2) + "px";
            prevBtn.style.top = topPos;
            nextBtn.style.top = topPos;
        }, 50);
    }

    // --- DOWNLOAD BUTTONS ---
    btnContainer.innerHTML = "";
    if (item.links && item.links.length > 0) {
        item.links.forEach(link => {
            const a = document.createElement('a');
            a.className = "dwn-option-btn"; 
            a.href = link.url;
            a.target = "_blank";
            a.innerHTML = `
                <div class="btn-left">
                    <i class="fas ${link.icon || 'fa-download'}"></i>
                    <span>${link.type}</span>
                </div>
                <i class="fas fa-external-link-alt" style="font-size: 0.9rem; color:#888;"></i>
            `;
            btnContainer.appendChild(a);
        });
    } else {
        btnContainer.innerHTML = "<p style='color:#666; font-size:0.9rem; text-align:center;'>No links available.</p>";
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
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        stars = [];
        const numStars = width < 768 ? 150 : 350; 
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * width, y: Math.random() * height,
                radius: Math.random() * 1.5, opacity: Math.random(),
                speed: Math.random() * 0.02 + 0.005
            });
        }
    }
    function animateStars() {
        ctx.clearRect(0, 0, width, height);
        stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            ctx.fill();
            star.opacity += star.speed;
            if (star.opacity > 1 || star.opacity < 0.1) star.speed = -star.speed;
        });
        requestAnimationFrame(animateStars);
    }
    window.addEventListener('resize', initStars);
    initStars();
    animateStars();
}
