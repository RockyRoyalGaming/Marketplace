// --- 1. DATABASE (Yahan apne items add karein) ---
// --- 1. DATABASE (New Format with Multiple Links) ---
const items = [
    {
        id: 1,
        title: "Genshin Impact V4 (Full Pack)",
        category: "addon",
        image: "https://via.placeholder.com/400x250.png?text=Genshin+Addon",
        description: "Includes Behavior Pack and Resource Pack separately.",
        // YAHAN DEKHO: Ab 'link' nahi, 'links' array hai
        links: [
            { label: "Download Behavior Pack", url: "https://dl-link.com/genshin-bp" },
            { label: "Download Resource Pack", url: "https://dl-link.com/genshin-rp", type: "secondary" }
        ]
    },
    {
        id: 2,
        title: "One Block World + Skin",
        category: "world",
        image: "https://via.placeholder.com/400x250.png?text=One+Block",
        description: "Classic One Block survival map and a bonus skin.",
        links: [
            { label: "Download World (.mcworld)", url: "https://dl-link.com/oneblock-world" },
            { label: "Download Bonus Skin", url: "https://dl-link.com/skin", type: "secondary" }
        ]
    },
    // Jisme sirf ek link ho, use aise likhein:
    {
        id: 3,
        title: "Simple Texture Pack",
        category: "texture",
        image: "https://via.placeholder.com/400x250.png?text=Texture",
        description: "Just a simple texture pack.",
        links: [
            { label: "Download Texture Pack", url: "https://dl-link.com/texture" }
        ]
    },
    // ... baaki items bhi isi format me ...
];
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

// --- 2. SETUP & DISPLAY ---
const container = document.getElementById('itemsContainer');
const modal = document.getElementById('itemModal');

function displayItems(data) {
    container.innerHTML = "";
    if (data.length === 0) {
        container.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #aaa; padding: 20px;'>No items found.</p>";
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
// Pehli baar load karne ke liye
displayItems(items);

// --- 3. SEARCH FUNCTION ---
function searchItems() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = items.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
    );
    displayItems(filtered);
}

// --- 4. FILTER FUNCTION ---
function filterItems(category) {
    // Sab buttons se active class hatao
    document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
    
    // Jis button par click kiya use active karo
    const activeBtn = document.querySelector(`.filters button[onclick="filterItems('${category}')"]`);
    if(activeBtn) activeBtn.classList.add('active');

    if (category === 'all') {
        displayItems(items);
    } else {
        const filtered = items.filter(item => item.category === category);
        displayItems(filtered);
    }
}

// --- 5. SORT MENU LOGIC ---
function toggleSortMenu() {
    const menu = document.getElementById('sortMenu');
    // Agar khula hai to band karo, band hai to kholo
    menu.style.display = (menu.style.display === "block") ? "none" : "block";
}

function sortContent(type) {
    let sortedItems = [...items];
    if (type === 'recent') {
        sortedItems.sort((a, b) => b.id - a.id); // Naya pehle
    } else if (type === 'name') {
        sortedItems.sort((a, b) => a.title.localeCompare(b.title)); // A-Z
    } else {
        sortedItems.sort((a, b) => a.id - b.id); // Default ID se
    }
    displayItems(sortedItems);
    document.getElementById('sortMenu').style.display = "none";
}

// Menu ke bahar click karne par band hona chahiye
window.addEventListener('click', function(e) {
    if (!e.target.closest('.sort-dropdown') && !e.target.closest('button[title="Filters"]')) {
        document.getElementById('sortMenu').style.display = 'none';
    }
});

// --- 6. HEADER REQUEST BUTTON (Scroll Down) ---
function focusRequestBar() {
    const input = document.getElementById('requestInput');
    if(input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus();
        input.style.border = "1px solid #4caf50";
        setTimeout(() => { input.style.border = "1px solid rgba(255,255,255,0.1)"; }, 2000);
    }
}

// --- 7. DISCORD REQUEST SYSTEM ---
function sendRequest() {
    const input = document.getElementById('requestInput');
    const url = input.value.trim();

    if (url === "") {
        alert("Please paste a link first!");
        return;
    }
    // Validation
    if (!url.includes("minecraft.net")) {
        alert("Only Send Minecraft Marketplace Links"); 
        return;
    }
    
    sendToDiscord(url);
}

function sendToDiscord(userLink) {
    // Aapka Webhook URL
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
    })
    .then(response => {
        if (response.ok) {
            alert("Request Sent Successfully!"); 
            document.getElementById('requestInput').value = "";
        } else {
            alert("Error sending request.");
        }
    })
    .catch(error => console.error('Error:', error));
}

// --- 8. MODAL (Download Popup) ---
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


// --- 9. PREMIUM STARFIELD BACKGROUND (Canvas Logic) ---
const canvas = document.getElementById('starfield');

// Sirf tabhi chalega jab HTML me <canvas id="starfield"> hoga
if (canvas) {
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
}
