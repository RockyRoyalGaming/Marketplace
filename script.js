// FIREBASE INITIALIZATION (SABSE UPAR)
const firebaseConfig = {
  apiKey: "AIzaSyDOnkkfPgIX9rlEXefUKnZ3atV6zdBu1RU",
  authDomain: "strikemarket-32a5e.firebaseapp.com",
  databaseURL: "https://strikemarket-32a5e-default-rtdb.firebaseio.com",
  projectId: "strikemarket-32a5e",
  storageBucket: "strikemarket-32a5e.firebasestorage.app",
  messagingSenderId: "719596182121",
  appId: "1:719596182121:web:d02dfdd3089f560fc560f8",
  measurementId: "G-KTVM3J2491"
};

var database;
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
}

// --- HELPER FUNCTION (Images generate karne ke liye) ---
function getImages(linkPrefix, count) {
    let urls = [];
    for (let i = 1; i <= count; i++) {
        urls.push(`${linkPrefix}${i}.png`);
    }
    return urls;
}

// --- 1. DATABASE (Items List) ---
// Global variable jisme Firebase se live data aayega
let items = []; 

// Firebase se LIVE data laane ka function
function loadLiveMarketItems() {
    const container = document.getElementById('itemsContainer');
    
    // Firebase database (market_items) se data padhna
    database.ref('market_items').on('value', (snapshot) => {
        items = []; // Purani list clear karein
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                items.push(childSnapshot.val());
            });
            
            // Naya item sabse upar dikhane ke liye list ko ulta (reverse) karein
            items.reverse(); 
            
            // Aapka apna purana function jo cards banata hai
            displayItems(items); 
        } else {
            container.innerHTML = "<p style='text-align: center; color: #666;'>No items found.</p>";
        }
    });
}

// Page load hote hi data mangwayein
window.addEventListener('DOMContentLoaded', loadLiveMarketItems);


// --- 2. SETUP & DISPLAY ---
const container = document.getElementById('itemsContainer');
const modal = document.getElementById('itemModal');
const readMoreBtn = document.getElementById('readMoreBtn');
const descElement = document.getElementById('modalDesc');

// Panorama Elements
const panoramaSection = document.getElementById('panoramaSection');
const panoramaImg = document.getElementById('modalPanoramaImg');

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
    const filtered = items.filter(item => item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
    displayItems(filtered);
}
function filterItems(category) {
    document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.filters button[onclick="filterItems('${category}')"]`);
    if(activeBtn) activeBtn.classList.add('active');
    if (category === 'all') displayItems(items);
    else displayItems(items.filter(item => item.category === category));
}
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

// --- 5. MODAL LOGIC (SWIPE CAROUSEL + DOTS) ---
const btnContainer = document.getElementById('downloadButtonsContainer');
const track = document.getElementById('carouselTrack');
const dotsContainer = document.getElementById('carouselDots');

function openModal(item) {
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalTag').innerText = item.category.toUpperCase();
    
    // Description
    const descText = item.description ? item.description.replace(/\n/g, '<br>') : "No description.";
    descElement.innerHTML = descText;
    if (readMoreBtn) {
        descElement.classList.remove('expanded');
        readMoreBtn.style.display = "none";
        readMoreBtn.innerText = "Read more...";
        setTimeout(() => {
            if (descElement.scrollHeight > 85) readMoreBtn.style.display = "block";
        }, 10);
    }

    // --- CAROUSEL LOGIC START ---
    if (track) {
        track.innerHTML = ""; // Clear old images
        if(dotsContainer) dotsContainer.innerHTML = ""; // Clear old dots
        
        let imagesList = [];
        if (item.images && item.images.length > 0) imagesList = item.images;
        else imagesList = [item.image || "https://via.placeholder.com/400x250"];

        // 1. Inject Images
        imagesList.forEach((imgUrl, index) => {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.classList.add('carousel-img'); // CSS class se styling milegi
            track.appendChild(img);

            // 2. Inject Dots (Sirf tab agar 1 se jyada image ho)
            if (imagesList.length > 1 && dotsContainer) {
                const dot = document.createElement('div');
                dot.classList.add('dot');
                if (index === 0) dot.classList.add('active'); // Pehla dot active
                dotsContainer.appendChild(dot);
            }
        });

        // 3. Scroll Listener (Dots update karne ke liye)
        track.onscroll = () => {
            if (imagesList.length <= 1) return;
            const scrollPosition = track.scrollLeft;
            const width = track.offsetWidth;
            // Calculate current index based on scroll position
            const index = Math.round(scrollPosition / width); 
            
            // Update Dots
            const dots = document.querySelectorAll('.dot');
            dots.forEach(d => d.classList.remove('active'));
            if(dots[index]) dots[index].classList.add('active');
        };
    }
    // --- CAROUSEL LOGIC END ---

    // Download Buttons (Wahi purana list style)
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
                <i class="fas fa-chevron-right" style="font-size: 0.8rem; color:#666;"></i>
            `;
            btnContainer.appendChild(a);
        });
    } else {
        btnContainer.innerHTML = "<p style='color:#666; font-size:0.9rem;'>No links.</p>";
    }

    // Panorama
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

// Arrow Buttons function (Desktop ke liye)
function scrollCarousel(direction) {
    if(track) {
        const width = track.offsetWidth;
        track.scrollBy({ left: width * direction, behavior: 'smooth' });
    }
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

// Focus & Send Request
function focusRequestBar() { document.getElementById('requestInput')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
function sendRequest() {
    const input = document.getElementById('requestInput');
    const url = input.value.trim();
    if (url === "") { alert("Please paste a link first!"); return; }
    if (!url.includes("minecraft.net")) { alert("Only Minecraft Marketplace Links!"); return; }
    
    const webhookURL = "https://discord.com/api/webhooks/1469778264607293562/slHI5zB96puMgK6Zu2aymdqCZs1pAxLuOiG7F9wYOqw6tnFH4-Scax74aC79kAkpgEF2";
    fetch(webhookURL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [{ title: "🚀 New Request", description: "Link:", fields: [{ name: "URL", value: url }], color: 5763719 }] })
    }).then(res => { if(res.ok) { alert("Sent!"); input.value = ""; } else alert("Error."); });
}

// Starfield
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

// --- 8. REAL-TIME REQUEST SYSTEM (FIREBASE) ---

// 1. YOUR REAL CONFIGURATION (Copy-Paste from Screenshot)

// 2. INITIALIZE FIREBASE
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var database = firebase.database();
} else {
    console.error("Firebase SDK not loaded in HTML!");
}

// 3. VARIABLES
const reqSection = document.getElementById('requestsSection');
const itemsGrid = document.getElementById('itemsContainer');
const pendingBox = document.getElementById('pendingContainer');
const completedBox = document.getElementById('completedContainer');
const reqModal = document.getElementById('requestFormModal');

// 4. TOGGLE VIEW
function toggleRequestView() {
    if (reqSection.style.display === "none") {
        itemsGrid.style.display = "none";
        reqSection.style.display = "block";
        loadRequests();
    } else {
        itemsGrid.style.display = "grid";
        reqSection.style.display = "none";
    }
}

// 5. SUBMIT REQUEST
function submitNewRequest() {
    const name = document.getElementById('reqName').value;
    const addon = document.getElementById('reqAddonName').value;
    const link = document.getElementById('reqLink').value;

    if (!name || !addon) { alert("Name and Addon Name are required!"); return; }

    const newReqRef = database.ref('requests').push();
    newReqRef.set({
        user: name,
        addon: addon,
        link: link || "",
        status: "pending",
        timestamp: Date.now()
    }, (error) => {
        if (error) { alert("Error: " + error.message); } 
        else {
            alert("✅ Request Sent!");
            closeReqModal();
            document.getElementById('reqName').value = "";
            document.getElementById('reqAddonName').value = "";
            document.getElementById('reqLink').value = "";
            if(reqSection.style.display === "block") loadRequests();
        }
    });
}

// 6. LOAD REQUESTS (Updated: Ab Link bhi dikhega)
function loadRequests() {
    pendingBox.innerHTML = "<p style='color:#666;'>Loading...</p>";
    completedBox.innerHTML = "";

    database.ref('requests').once('value', (snapshot) => {
        pendingBox.innerHTML = "";
        completedBox.innerHTML = "";

        if (!snapshot.exists()) {
            pendingBox.innerHTML = "<p>No pending requests.</p>";
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const req = childSnapshot.val();
            const div = document.createElement('div');
            div.className = `req-card ${req.status}`;

            let btnHTML = "";
            let linkHTML = ""; // Naya variable

            if (req.status === "completed") {
                // Completed hai to Download button
                const dwnLink = req.downloadLink || "#"; 
                btnHTML = `<a href="${dwnLink}" class="req-link-btn" target="_blank"><i class="fas fa-check"></i> Get File</a>`;
            } else {
                // Pending hai
                btnHTML = `<span style="color:#fbc02d; font-size:0.8rem; background:rgba(251, 192, 45, 0.1); padding:5px 10px; border-radius:10px;"><i class="fas fa-clock"></i> Pending</span>`;
                
                // NEW: Agar user ne link diya hai, to chhota icon dikhao
                if (req.link) {
                    linkHTML = `<a href="${req.link}" target="_blank" style="color:#aaa; margin-left:10px; font-size:0.9rem;" title="Open Original Link"><i class="fas fa-external-link-alt"></i></a>`;
                }
            }

            div.innerHTML = `
                <div class="req-info">
                    <h4>${req.addon} ${linkHTML}</h4> <p><i class="fas fa-user-circle"></i> Suggested by ${req.user}</p>
                </div>
                ${btnHTML}
            `;

            if (req.status === "pending") pendingBox.prepend(div);
            else completedBox.prepend(div);
        });
    });
}

// 7. MODAL FUNCTIONS
function openReqModal() { reqModal.style.display = "flex"; }
function closeReqModal() { reqModal.style.display = "none"; }
