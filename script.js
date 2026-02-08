// --- 1. DATABASE (Corrected Buttons) ---
const items = [
    {
        id: 1,
        title: "FarmCraft Add-on",
        category: "addon",
        image: "https://via.placeholder.com/400x250.png?text=FarmCraft",
        description: "Experience farming like never before with new tractors and crops.",
        // CASE 1: Simple Addon (Sirf 1 Button: "Addon")
        links: [
            { type: "Addon", url: "https://dl-link.com/farmcraft", icon: "fa-puzzle-piece" }
        ]
    },
    {
        id: 2,
        title: "Dragon Ball Z",
        category: "world",
        image: "https://via.placeholder.com/400x250.png?text=DBZ",
        description: "Full DBZ World experience with custom skins.",
        // CASE 2: World + Skin (2 Buttons)
        links: [
            { type: "World", url: "https://dl-link.com/dbz-world", icon: "fa-globe" },
            { type: "Skin", url: "https://dl-link.com/dbz-skin", icon: "fa-tshirt" }
        ]
    },
    {
        id: 3,
        title: "Genshin Impact V4",
        category: "addon",
        image: "https://via.placeholder.com/400x250.png?text=Genshin",
        description: "Explore Teyvat in Minecraft.",
        // Addon hai to sirf ek button
        links: [
            { type: "Addon", url: "#", icon: "fa-puzzle-piece" }
        ]
    },
    {
        id: 4,
        title: "RTX Shaders Mobile",
        category: "texture",
        image: "https://via.placeholder.com/400x250.png?text=RTX",
        description: "Realistic lighting for RenderDragon.",
        // Texture hai to "Texture" button
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
        // Skin hai to "Skin" button
        links: [
            { type: "Skin", url: "#", icon: "fa-tshirt" }
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

// --- 5. MODAL LOGIC (Button Style Fix) ---
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
