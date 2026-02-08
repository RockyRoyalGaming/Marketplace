// --- DATABASE ---
// Categories: 'addon', 'world', 'texture', 'skin', 'mashup'
const items = [
    {
        id: 1,
        title: "Genshin Impact V4",
        category: "addon",
        image: "https://via.placeholder.com/400x250.png?text=Genshin+Addon",
        description: "Explore Teyvat in Minecraft with new weapons and characters.",
        link: "https://dl-link.com/genshin"
    },
    {
        id: 2,
        title: "One Block Skyblock",
        category: "world",
        image: "https://via.placeholder.com/400x250.png?text=One+Block",
        description: "Classic One Block survival. Break the block to expand!",
        link: "https://dl-link.com/oneblock"
    },
    {
        id: 3,
        title: "RTX Shaders Mobile",
        category: "texture",
        image: "https://via.placeholder.com/400x250.png?text=RTX+Shaders",
        description: "Realistic lighting for mobile devices (RenderDragon).",
        link: "https://dl-link.com/shaders"
    },
    {
        id: 4,
        title: "Star Wars Mashup",
        category: "mashup",
        image: "https://via.placeholder.com/400x250.png?text=Star+Wars",
        description: "Complete Star Wars experience with skins, world and textures.",
        link: "https://dl-link.com/starwars"
    },
    {
        id: 5,
        title: "Naruto Skin Pack",
        category: "skin",
        image: "https://via.placeholder.com/400x250.png?text=Naruto+Skins",
        description: "HD Skins from the anime Naruto.",
        link: "https://dl-link.com/naruto"
    }
];

// --- SETUP ---
const container = document.getElementById('itemsContainer');
const modal = document.getElementById('itemModal');

// --- DISPLAY FUNCTION ---
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

// --- SEARCH ---
function searchItems() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = items.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
    );
    displayItems(filtered);
}

// --- FILTERS ---
function filterItems(category) {
    document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.filters button[onclick="filterItems('${category}')"]`);
    if(activeBtn) activeBtn.classList.add('active');

    if (category === 'all') {
        displayItems(items);
    } else {
        const filtered = items.filter(item => item.category === category);
        displayItems(filtered);
    }
}

// --- SORT MENU ---
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

// --- HEADER REQUEST BUTTON LOGIC ---
function focusRequestBar() {
    const input = document.getElementById('requestInput');
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus();
    input.style.border = "1px solid #4caf50";
    setTimeout(() => { input.style.border = "1px solid rgba(255,255,255,0.1)"; }, 2000);
}

// --- DISCORD REQUEST SYSTEM ---
function sendRequest() {
    const input = document.getElementById('requestInput');
    const url = input.value.trim();

    if (url === "") { alert("Please paste a link first!"); return; }
    if (!url.includes("minecraft.net")) { alert("Only Send Minecraft Marketplace Links"); return; }
    
    sendToDiscord(url);
}

function sendToDiscord(userLink) {
    // AAPKA WEBHOOK URL
    const webhookURL = "https://discord.com/api/webhooks/1469778264607293562/slHI5zB96puMgK6Zu2aymdqCZs1pAxLuOiG7F9wYOqw6tnFH4-Scax74aC79kAkpgEF2";

    const message = {
        embeds: [{
            title: "🚀 New Mod Request!",
            description: "User wants this added:",
            color: 5763719,
            fields: [{ name: "Link", value: userLink }],
            footer: { text: "Strike Market Request" },
            timestamp: new Date().toISOString()
        }]
    };

    fetch(webhookURL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
    }).then(response => {
        if (response.ok) {
            alert("Request Sent Successfully!"); 
            document.getElementById('requestInput').value = "";
        } else {
            alert("Error sending request.");
        }
    });
}

// --- MODAL ---
function openModal(item) {
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalDesc').innerText = item.description;
    document.getElementById('modalImg').src = item.image;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();
    document.getElementById('modalLink').href = item.link;
    modal.style.display = "flex";
}
function closeModal() { modal.style.display = "none"; }
window.onclick = function(e) { if (e.target == modal) closeModal(); }

/* --- PREMIUM ANIMATED STARFIELD (JavaScript Logic) --- */
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

let width, height, stars;

function initStars() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    stars = [];
    // Mobile par 100 taare, PC par 300 (Performance ke liye)
    const numStars = width < 768 ? 100 : 300; 

    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5, // Taare ka size
            opacity: Math.random(),
            speed: Math.random() * 0.05 // Chamakne ki speed
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

        // Twinkle Effect (Chamak kam-jyada)
        star.opacity += star.speed;
        if (star.opacity > 1 || star.opacity < 0.1) {
            star.speed = -star.speed;
        }
    });
    requestAnimationFrame(animateStars);
}

// Resize hone par taare adjust karein
window.addEventListener('resize', initStars);

// Start Animation
initStars();
animateStars();

/* --- ANIMATED STARFIELD (Random Stars) --- */
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

let width, height, stars;

function initStars() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    stars = [];
    // Mobile par kam taare, PC par jyada
    const numStars = width < 768 ? 150 : 350; 

    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5,
            opacity: Math.random(),
            speed: Math.random() * 0.02 + 0.005
        });
    }
}

function animateStars() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "white";
    
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();

        // Twinkle Logic
        star.opacity += star.speed;
        if (star.opacity > 1 || star.opacity < 0.1) {
            star.speed = -star.speed;
        }
    });
    requestAnimationFrame(animateStars);
}

window.addEventListener('resize', initStars);
initStars();
animateStars();
