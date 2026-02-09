// --- 1. DATABASE (Items List) ---
const items = [
        {
        id: 7,  // Number badhate rahein (pichla 6 tha to ye 7)
        title: "Bluey's House",
        category: "world", // Options: 'addon', 'world', 'skin', 'texture', 'mashup'
        image: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/345ffd83-2bc6-4990-86a5-6e79888ab6d4/BLUEY_Thumbnail_0.jpg", // Photo ka link
        description: "Get ready for heaps of fun with Bluey, Bingo, Mum, and Dad! Step inside Bluey’s Family home and play games like I-Spy, Hide and Seek, and Ragdoll. Find the Family’s favourite items to unlock even more games and surprises!",
        links: [
            // Agar Addon hai to bas ye line rakhein:
            { type: "World", url: "https://linkpays.in/HOApOgEm", icon: "fa-globe" }
            
            // Agar World + Skin hai to niche wali line bhi use karein:
            // { type: "Skin", url: "LINK_HERE", icon: "fa-tshirt" }
        ]
    },
    {
        id: 1,
        title: "How to Train Your Dragon Add-On",
        category: "addon",
        image: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/ccca9e5a-b363-47d4-b75d-b8622d28cb15/zenith_thumbnail_0.jpg",
        description: "Discover Toothless and other beloved dragons in your Minecraft Worlds! Become a dragon rider with this Add-On based on Universal Pictures’ live-action reimagining of DreamWorks Animation’s How to Train Your Dragon.
Take off into the skies, learn each dragon's personality, and bond with them to unlock unique abilities. Embark on an iconic adventure with your new dragon! New: - Added Baby Dragons!

- Added texture variants for dragons

- Added a Toothless per player toggle",
        // Addon: Sirf ek button
        links: [
            { type: "Addon", url: "https://linkpays.in/fXMhJX", icon: "fa-puzzle-piece" }
        ]
    },
    {
        id: 2,
        title: "Dragon Ball Z",
        category: "world",
        image: "https://via.placeholder.com/400x250.png?text=DBZ",
        description: "Full DBZ World experience with custom skins and powers.",
        // World: World + Skin Buttons
        links: [
            { type: "World", url: "https://dl-link.com/dbz-world", icon: "fa-globe" },
            { type: "Skin", url: "https://dl-link.com/dbz-skin", icon: "fa-tshirt" }
        ]
    },
    {
        id: 3,
        title: "Star Wars Mashup",
        category: "mashup", /* <-- Ye raha Mashup Item */
        image: "https://via.placeholder.com/400x250.png?text=Star+Wars",
        description: "Complete Star Wars experience including World, Skins, and Textures.",
        // Mashup: Mashup Pack Button
        links: [
            { type: "Mashup Pack", url: "#", icon: "fa-layer-group" }
        ]
    },
    {
        id: 4,
        title: "RTX Shaders Mobile",
        category: "texture",
        image: "https://via.placeholder.com/400x250.png?text=RTX",
        description: "Realistic lighting for RenderDragon.",
        // Texture: Texture Button
        links: [
            { type: "Texture", url: "#", icon: "fa-image" }
        ]
    },
    {
        id: 5,
        title: "Naruto Skin Pack",
        category: "skin",
        image: "https://via.placeholder.com/400x250.png?text=Naruto",
        description: "HD Skins from Naruto Anime.",
        // Skin: Skin Button
        links: [
            { type: "Skin", url: "#", icon: "fa-tshirt" }
        ]
    },
    {
        id: 6,
        title: "Jurassic World",
        category: "mashup", /* <-- Ek aur Mashup example */
        image: "https://via.placeholder.com/400x250.png?text=Jurassic",
        description: "Explore the park with dinosaurs. Includes map and skins.",
        links: [
            { type: "Mashup Pack", url: "#", icon: "fa-layer-group" }
        ]
    }
];

// --- 2. SETUP & DISPLAY ---
const container = document.getElementById('itemsContainer');
const modal = document.getElementById('itemModal');

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
        
        card.innerHTML = `
            <img src="${item.image}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/400x250?text=No+Image'">
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

// --- 5. MODAL LOGIC (Buttons Fixed) ---
const btnContainer = document.getElementById('downloadButtonsContainer');

function openModal(item) {
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalDesc').innerText = item.description;
    document.getElementById('modalImg').src = item.image;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();

    // Clear old buttons
    btnContainer.innerHTML = "";

    // Generate Buttons
    if (item.links && item.links.length > 0) {
        item.links.forEach(link => {
            const a = document.createElement('a');
            a.className = "dwn-option-btn"; 
            a.href = link.url;
            a.target = "_blank";

            // HTML Structure: [Icon + Type Name] ........... [Arrow Icon]
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
function closeModal() { modal.style.display = "none"; }
window.onclick = function(e) { if (e.target == modal) closeModal(); }

// --- 6. DISCORD REQUEST ---
function focusRequestBar() {
    const input = document.getElementById('requestInput');
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus();
    input.style.border = "1px solid #4caf50";
    setTimeout(() => { input.style.border = "1px solid rgba(255,255,255,0.1)"; }, 2000);
}

function sendRequest() {
    const input = document.getElementById('requestInput');
    const url = input.value.trim();
    if (url === "") { alert("Please paste a link first!"); return; }
    if (!url.includes("minecraft.net")) { alert("Only Minecraft Marketplace Links!"); return; }
    
    // Webhook Logic
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
