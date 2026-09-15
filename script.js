// --- 1. FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDOnkkfPgIX9rlEXefUKnZ3atV6zdBu1RU",
  authDomain: "strikemarket-32a5e.firebaseapp.com",
  databaseURL: "https://strikemarket-32a5e-default-rtdb.firebaseio.com",
  projectId: "strikemarket-32a5e",
  storageBucket: "strikemarket-32a5e.firebasestorage.app",
  messagingSenderId: "719596182121",
  appId: "1:719596182121:web:d02df0d3089f560fc560f8",
  measurementId: "G-KTVM3J2491"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
var database = firebase.database();

// Global array for items
let items = [];

// --- 2. DOM ELEMENTS ---
const container = document.getElementById('itemsContainer');
const modal = document.getElementById('itemModal');
const readMoreBtn = document.getElementById('readMoreBtn');
const descElement = document.getElementById('modalDesc');
const btnContainer = document.getElementById('downloadButtonsContainer');
const track = document.getElementById('carouselTrack');
const dotsContainer = document.getElementById('carouselDots');
const panoramaSection = document.getElementById('panoramaSection');
const panoramaImg = document.getElementById('modalPanoramaImg');

// Request Elements
const reqSection = document.getElementById('requestsSection');
const pendingBox = document.getElementById('pendingContainer');
const completedBox = document.getElementById('completedContainer');
const reqModal = document.getElementById('requestFormModal');

// --- 3. LOAD LIVE ITEMS FROM FIREBASE ---
function loadLiveMarketItems() {
    database.ref('market_items').on('value', (snapshot) => {
        items = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                let itemData = childSnapshot.val();
                itemData.firebaseKey = childSnapshot.key;
                items.push(itemData);
            });
            items.reverse();
            displayItems(items);
        } else {
            container.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #666; padding: 20px;'>No items found.</p>";
        }
    });
}
window.addEventListener('DOMContentLoaded', loadLiveMarketItems);

// --- 4. DISPLAY ITEMS (CARDS) ---
function displayItems(data) {
    container.innerHTML = "";
    if (!data || data.length === 0) {
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
                <div class="card-cat"><i class="fas fa-tag"></i> ${item.category ? item.category.toUpperCase() : 'ITEM'}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- 5. SEARCH & FILTERS ---
function searchItems() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filtered = items.filter(item => 
        (item.title && item.title.toLowerCase().includes(query)) || 
        (item.category && item.category.toLowerCase().includes(query))
    );
    displayItems(filtered);
}

function filterItems(category) {
    document.querySelectorAll('.filters button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.filters button[onclick="filterItems('${category}')"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    // Agar requests view khula ho to vapas store grid par switch karein
    if (reqSection && reqSection.style.display === "block") {
        reqSection.style.display = "none";
        container.style.display = "grid";
    }

    if (category === 'all') displayItems(items);
    else displayItems(items.filter(item => item.category === category));
}

function toggleSortMenu() {
    const menu = document.getElementById('sortMenu');
    menu.style.display = (menu.style.display === "block") ? "none" : "block";
}

function sortContent(type) {
    let sortedItems = [...items];
    if (type === 'recent') sortedItems.sort((a, b) => (b.id || 0) - (a.id || 0));
    else if (type === 'name') sortedItems.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else sortedItems.sort((a, b) => (a.id || 0) - (b.id || 0));
    displayItems(sortedItems);
    document.getElementById('sortMenu').style.display = "none";
}

window.addEventListener('click', function(e) {
    if (!e.target.closest('.sort-dropdown') && !e.target.closest('button[title="Filters"]')) {
        const menu = document.getElementById('sortMenu');
        if (menu) menu.style.display = 'none';
    }
});

// --- 6. MODAL SYSTEM ---
function openModal(item) {
    document.getElementById('modalTitle').innerText = item.title || "";
    document.getElementById('modalTag').innerText = item.category ? item.category.toUpperCase() : "ITEM";
    
    // Description & Suggested By Tag Logic
    let rawDesc = item.description || "No description.";
    let suggestedUser = "";
    
    // Check if description has "(Suggested by Name)"
    let match = rawDesc.match(/\(Suggested by (.*?)\)/i);
    if (match) {
        suggestedUser = match[1];
        rawDesc = rawDesc.replace(match[0], "").trim(); // Desc se text hata dein
    }

    // Modal Header me Tag inject karein
    let existingTag = document.getElementById('modalSuggestedTag');
    if (existingTag) existingTag.remove();

    if (suggestedUser) {
        let stag = document.createElement('div');
        stag.id = 'modalSuggestedTag';
        stag.className = 'suggested-tag';
        stag.innerHTML = `<i class="fas fa-user-circle"></i> Suggested by ${suggestedUser}`;
        document.querySelector('.modal-header').insertAdjacentElement('afterend', stag);
    }

    descElement.innerHTML = rawDesc.replace(/\n/g, '<br>');
    
    if (readMoreBtn) {
        descElement.classList.remove('expanded');
        readMoreBtn.style.display = "none";
        readMoreBtn.innerText = "Read more...";
        setTimeout(() => {
            if (descElement.scrollHeight > 85) readMoreBtn.style.display = "block";
        }, 10);
    }

    // Carousel Setup
    if (track) {
        track.innerHTML = "";
        if (dotsContainer) dotsContainer.innerHTML = "";
        let imagesList = (item.images && item.images.length > 0) ? item.images : [item.image || "https://via.placeholder.com/400x250"];

        imagesList.forEach((imgUrl, index) => {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.classList.add('carousel-img');
            track.appendChild(img);

            if (imagesList.length > 1 && dotsContainer) {
                const dot = document.createElement('div');
                dot.classList.add('dot');
                if (index === 0) dot.classList.add('active');
                dotsContainer.appendChild(dot);
            }
        });

        track.onscroll = () => {
            if (imagesList.length <= 1) return;
            const index = Math.round(track.scrollLeft / track.offsetWidth);
            const dots = document.querySelectorAll('.dot');
            dots.forEach(d => d.classList.remove('active'));
            if (dots[index]) dots[index].classList.add('active');
        };
    }

        // --- DOWNLOAD BUTTONS & MIRRORS RENDERING ---
    btnContainer.innerHTML = "";

    // Agar naya fileBlocks structure hai
    if (item.fileBlocks && item.fileBlocks.length > 0) {
        item.fileBlocks.forEach(block => {
            let card = document.createElement('div');
            card.className = "download-group-card";

            // Mirrors HTML
            let mirrorsHtml = "";
            if (block.mirrors && block.mirrors.length > 0) {
                let mBadges = block.mirrors.map(m => `
                    <a href="${m.url}" target="_blank" class="mirror-badge-btn">
                        <i class="fas fa-link"></i> ${m.host}
                    </a>
                `).join('');

                mirrorsHtml = `
                    <div class="mirrors-list">
                        <span style="font-size: 0.7rem; color: #64748b; margin-right: 4px; align-self:center;">Mirrors:</span>
                        ${mBadges}
                    </div>
                `;
            }

            // Main Download Button
            card.innerHTML = `
                <div class="group-header">
                    <span class="group-title"><i class="fas ${block.icon || 'fa-folder'}"></i> ${block.title}</span>
                </div>
                <a href="${block.mainLink.url}" target="_blank" class="dwn-option-btn" style="margin-bottom:0;">
                    <div class="btn-left">
                        <i class="fas fa-download"></i>
                        <span>Download</span>
                    </div>
                    <div class="btn-right">
                        ${block.mainLink.host ? `<span class="host-badge">${block.mainLink.host}</span>` : ""}
                        <i class="fas fa-chevron-right" style="font-size: 0.8rem; color:#666;"></i>
                    </div>
                </a>
                ${mirrorsHtml}
            `;
            btnContainer.appendChild(card);
        });
    } 
    // Purane items ke liye fallback
    else if (item.links && item.links.length > 0) {
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
        btnContainer.innerHTML = "<p style='color:#666; font-size:0.9rem;'>No links available.</p>";
    }

    // Panorama Setup
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
window.onclick = function(e) { if (e.target == modal) closeModal(); };

// --- 7. REQUEST SYSTEM LOGIC ---
function openReqModal() { reqModal.style.display = "flex"; }
function closeReqModal() { reqModal.style.display = "none"; }

function toggleRequestView() {
    if (reqSection.style.display === "none" || reqSection.style.display === "") {
        container.style.display = "none";
        reqSection.style.display = "block";
        loadRequests();
    } else {
        container.style.display = "grid";
        reqSection.style.display = "none";
    }
}

function submitNewRequest() {
    const name = document.getElementById('reqName').value.trim();
    const addon = document.getElementById('reqAddonName').value.trim();
    const link = document.getElementById('reqLink').value.trim();

    if (!name || !addon) {
        alert("Please enter Name and Addon Name!");
        return;
    }

    const newReqRef = database.ref('requests').push();
    newReqRef.set({
        user: name,
        addon: addon,
        link: link || "",
        status: "pending",
        timestamp: Date.now()
    }).then(() => {
        alert("✅ Request submitted successfully!");
        closeReqModal();
        document.getElementById('reqName').value = "";
        document.getElementById('reqAddonName').value = "";
        document.getElementById('reqLink').value = "";
        if (reqSection.style.display === "block") loadRequests();
    }).catch(err => {
        alert("Error: " + err.message);
    });
}

function loadRequests() {
    pendingBox.innerHTML = "<p style='color:#666;'>Loading requests...</p>";
    completedBox.innerHTML = "";

    database.ref('requests').on('value', (snapshot) => {
        pendingBox.innerHTML = "";
        completedBox.innerHTML = "";

        if (!snapshot.exists()) {
            pendingBox.innerHTML = "<p style='color:#777; font-size: 13px;'>No pending requests.</p>";
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const req = childSnapshot.val();
            const div = document.createElement('div');
            div.className = `req-card ${req.status}`;

            let btnHTML = "";
            let linkHTML = "";

            if (req.status === "completed") {
                const dwnLink = req.downloadLink || "#"; 
                btnHTML = `<a href="${dwnLink}" class="req-link-btn" target="_blank"><i class="fas fa-check"></i> Get File</a>`;
            } else {
                btnHTML = `<span style="color:#fbc02d; font-size:0.8rem; background:rgba(251, 192, 45, 0.1); padding:5px 10px; border-radius:10px;"><i class="fas fa-clock"></i> Pending</span>`;
                if (req.link) {
                    linkHTML = `<a href="${req.link}" target="_blank" style="color:#aaa; margin-left:8px; font-size:0.85rem;" title="Link"><i class="fas fa-external-link-alt"></i></a>`;
                }
            }

            div.innerHTML = `
                <div class="req-info">
                    <h4>${req.addon} ${linkHTML}</h4>
                    <p><i class="fas fa-user-circle"></i> Suggested by ${req.user}</p>
                </div>
                ${btnHTML}
            `;

            if (req.status === "pending") pendingBox.prepend(div);
            else completedBox.prepend(div);
        });
    });
}

// --- 8. STARFIELD BACKGROUND ---
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
    window.addEventListener('resize', initStars); 
    initStars(); 
    animateStars();
}
