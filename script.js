// --- DATABASE (Yahan apne items add/edit karo) ---
const items = [
    {
        id: 1,
        title: "Genshin Impact V4",
        category: "addon",
        image: "https://xforgeassets002.xboxlive.com/pf-namespace-b63a0803d3653643/e598289b-6e2d-46cc-aef6-1def89890316/Thumbnail_0.jpg",
        description: "Explore the world of Teyvat with new characters, weapons, and powers in Minecraft Bedrock.",
        link: "https://link-to-download.com/genshin"
    },
    {
        id: 2,
        title: "One Block Skyblock",
        category: "world",
        image: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/267d0f7f-0848-4b2b-a248-29a4f3706218/Thumbnail_0.jpg",
        description: "Survival map starting with only one block. Break it to get resources and expand your island!",
        link: "https://link-to-download.com/oneblock"
    },
    {
        id: 3,
        title: "RTX Shaders Mobile",
        category: "texture",
        image: "https://via.placeholder.com/400x250.png?text=RTX+Shaders",
        description: "Realistic lighting and shadows optimized for mobile devices (RenderDragon compatible).",
        link: "https://link-to-download.com/shaders"
    },
    {
        id: 4,
        title: "Naruto Skin Pack",
        category: "skin",
        image: "https://via.placeholder.com/400x250.png?text=Naruto+Skins",
        description: "Over 50 anime skins from the Naruto series including Akatsuki members.",
        link: "https://link-to-download.com/skins"
    },
    {
    id: 5,
    title: "Star Wars Mashup",
    category: "mashup",  // Ye important hai
    image: "https://xforgeassets001.xboxlive.com/pf-namespace-b63a0803d3653643/a69407fb-6802-4036-bd95-ecd431be7987/Star_Wars_Thumbnail_0.jpg",
    description: "Star Wars world with skins and textures.",
    link: "..."
    },
];

// --- SETUP ---
const container = document.getElementById('itemsContainer');
const modal = document.getElementById('itemModal');

// --- DISPLAY ITEMS ---
function displayItems(data) {
    container.innerHTML = "";
    if (data.length === 0) {
        container.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #666;'>No items found.</p>";
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.onclick = () => openModal(item);
        
        card.innerHTML = `
            <img src="${item.image}" alt="${item.title}" loading="lazy">
            <div class="card-info">
                <div class="card-title">${item.title}</div>
                <div class="card-cat"><i class="fas fa-tag"></i> ${item.category}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Initial Load
displayItems(items);

// --- SEARCH FUNCTION ---
function searchItems() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = items.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
    );
    displayItems(filtered);
}

// --- FILTER FUNCTION ---
function filterItems(category) {
    document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (category === 'all') {
        displayItems(items);
    } else {
        const filtered = items.filter(item => item.category === category);
        displayItems(filtered);
    }
}

// --- MODAL LOGIC (Pop-up) ---
function openModal(item) {
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalDesc').innerText = item.description;
    document.getElementById('modalImg').src = item.image;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();
    document.getElementById('modalLink').href = item.link;
    
    modal.style.display = "flex";
}

function closeModal() {
    modal.style.display = "none";
}

// Close if clicked outside
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}

// --- REQUEST BUTTON LOGIC ---
function openRequestForm() {
    // IMPORTANT: Yahan apna Google Form link paste karna
    const googleFormLink = "https://docs.google.com/forms/d/e/1FAIpQLSdg8fzmwKqJjDPVLLG-rT741T6TmsIHpQJ7lADByUMAsyQ6eQ/viewform?usp=publish-editor";
    window.open(googleFormLink, "_blank");
}

// Sort/Filter Button Logic
let isAscending = true;

function toggleSort() {
    // Items ko naam (A-Z) ke hisab se ulta-seedha karega
    isAscending = !isAscending;
    const sortedItems = [...items].sort((a, b) => {
        return isAscending ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    });
    displayItems(sortedItems);
    alert(isAscending ? "Sorted A-Z" : "Sorted Z-A");
}

// --- SORT MENU LOGIC ---

// 1. Menu kholne/band karne ke liye
function toggleSortMenu() {
    const menu = document.getElementById('sortMenu');
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}

// 2. Items ko Sort karne ke liye
function sortContent(type) {
    let sortedItems = [...items]; // Original list ki copy

    if (type === 'recent') {
        // IDs ke hisab se ulta (Newest First)
        sortedItems.sort((a, b) => b.id - a.id);
    } else if (type === 'name') {
        // A se Z naam ke hisab se
        sortedItems.sort((a, b) => a.title.localeCompare(b.title));
    } else {
        // Default (Jesa database me hai)
        sortedItems.sort((a, b) => a.id - b.id);
    }

    displayItems(sortedItems); // Nayi list dikhao
    document.getElementById('sortMenu').style.display = "none"; // Menu band karo
}

// Screen par kahin aur click karne par menu band ho jaye
window.addEventListener('click', function(e) {
    const menu = document.getElementById('sortMenu');
    // Agar click button ya menu par nahi hua, toh band kardo
    if (!e.target.closest('.sort-dropdown') && !e.target.closest('button[title="Filters"]')) {
        menu.style.display = 'none';
    }

// --- REQUEST SYSTEM (Discord Integration) ---

function sendRequest() {
    const input = document.getElementById('requestInput');
    const url = input.value.trim();

    // 1. Check: Kya box khali hai?
    if (url === "") {
        alert("Please paste a link first!");
        return;
    }

    // 2. VALIDATION: Sirf Minecraft Marketplace link allow karein
    // (Jesa aapne screenshot me dikhaya tha)
    if (!url.includes("minecraft.net")) {
        alert("Only Send Minecraft Marketplace Links"); 
        return;
    }

    // 3. Agar sab sahi hai, to Discord par bhejo
    sendToDiscord(url);
}

function sendToDiscord(userLink) {
    // Aapka Webhook URL yahan set kar diya hai
    const webhookURL = "https://discord.com/api/webhooks/1469778264607293562/slHI5zB96puMgK6Zu2aymdqCZs1pAxLuOiG7F9wYOqw6tnFH4-Scax74aC79kAkpgEF2";

    const message = {
        content: null,
        embeds: [
            {
                title: "🚀 New Mod Request!",
                description: "User wants this added:",
                color: 5763719, // Green Color
                fields: [
                    {
                        name: "Link",
                        value: userLink
                    }
                ],
                footer: {
                    text: "Strike Mafia Marketplace"
                },
                timestamp: new Date().toISOString()
            }
        ]
    };

    // Discord ko data bhejna
    fetch(webhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message)
    })
    .then(response => {
        if (response.ok) {
            // Success Message (Screenshot jesa)
            alert("Request Sent Successfully!"); 
            document.getElementById('requestInput').value = ""; // Box clear karein
        } else {
            console.error("Discord Error:", response.status);
            alert("Error sending request. Check console.");
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Something went wrong!");
    });
}
