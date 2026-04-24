// Supabase sozlamalari
const supabaseUrl = 'https://qamscdwpyoxmkkyfolup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbXNjZHdweW94bWtreWZvbHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzI2MDQsImV4cCI6MjA5MTU0ODYwNH0.LICrT7c33XpbiazpztBtbOQZq09-zV1qm9H91i9w_pM';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Global o'zgaruvchilar
window.allProducts = [];
window.filteredProducts = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentPage = 1;
const itemsPerPage = 45;

// 1. MAHSULOTLARNI SUPABASE'DAN OLISH
async function fetchProducts() {
    try {
        const { data, error } = await _supabase.from('products').select('*');
        if (error) throw error;

        window.allProducts = data;
        window.filteredProducts = data;
        displayProducts(window.filteredProducts, 1);
        updateCartBadge();
    } catch (err) {
        console.error("Xato yuz berdi:", err.message);
    }
}

// 2. MAHSULOTLARNI EKRANGA CHIQARISH (PAGINATION BILAN)
function displayProducts(products, page = 1) {
    const grid = document.getElementById('product-list');
    const countDisplay = document.getElementById('found-count');
    if (!grid) return;

    grid.innerHTML = '';
    countDisplay.innerText = products.length;

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = products.slice(start, end);

    paginatedItems.forEach(p => {
        const img = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/400x450';

        grid.innerHTML += `
            <div class="product-card">
                <div class="product-image">
                    <img src="${img}" alt="${p.name}">
                </div>
                <div class="product-info">
                    <h3 class="product-name">${p.name}</h3>
                    <p class="product-price">${Number(p.price).toLocaleString()} UZS</p>
                    <div class="product-buttons">
                        <button class="btn-more" onclick="window.location.href='pages/pages.html?id=${p.id}'">BATAFSIL</button>
                        <button class="btn-order" onclick="addToCart(${p.id})">BUYURTMA BERISH</button>
                    </div>
                </div>
            </div>`;
    });

    // Agar pagination divi bo'lsa uni render qiladi
    const paginationDiv = document.getElementById('pagination');
    if (paginationDiv) renderPagination(products.length);
}

// 3. QIDIRUV VA MOBIL SEARCH
// Qidiruv paneli ochish/yopish
function toggleSearchInput() {
    const input = document.getElementById("searchInput");
    input.classList.toggle("show-search");

    if (input.classList.contains("show-search")) {
        input.focus(); // Ochilganda avtomatik yozishga tayyor turadi
    }
}

// Qidiruv mantiqi
function searchProducts(query) {
    if (!window.allProducts) return; // Ma'lumotlar bo'lmasa to'xtatadi

    window.filteredProducts = window.allProducts.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
    );

    currentPage = 1;
    displayProducts(window.filteredProducts, 1);
}

// Narx dropdowni
function toggleDropdown(event) {
    if (event) event.stopPropagation();

    const pricePanel = document.getElementById("priceDropdown");
    const searchInp = document.getElementById("searchInput");

    // 1. Agar Search ochiq bo'lsa, uni yopamiz
    if (searchInp.classList.contains("show-search")) {
        searchInp.classList.remove("show-search");
        searchInp.style.display = "none";
    }

    // 2. Narx panelini ochish/yopish (Toggle)
    pricePanel.classList.toggle("show");

    if (pricePanel.classList.contains("show")) {
        pricePanel.style.display = "flex";
        pricePanel.style.top = "60px"; // O'zingga moslab to'g'irlab olasan
    } else {
        pricePanel.style.display = "none";
    }
}

// Search paneli
function toggleSearchInput() {
    const searchInp = document.getElementById("searchInput");
    const pricePanel = document.getElementById("priceDropdown");

    // 1. Agar Narx dropdowni ochiq bo'lsa, uni yopamiz
    if (pricePanel.classList.contains("show")) {
        pricePanel.classList.remove("show");
        pricePanel.style.display = "none";
    }

    // 2. Search panelini ochish/yopish (Toggle)
    searchInp.classList.toggle("show-search");

    if (searchInp.classList.contains("show-search")) {
        searchInp.style.display = "block";
        searchInp.style.top = "60px"; // Bu ham tugma ostida chiqadi
        searchInp.focus();
    } else {
        searchInp.style.display = "none";
    }
}

window.onclick = function (event) {
    if (!event.target.closest('.price-container')) {
        document.getElementById("priceDropdown").classList.remove("show");
        document.getElementById("priceDropdown").style.display = "none";
        document.getElementById("searchInput").classList.remove("show-search");
        document.getElementById("searchInput").style.display = "none";
    }
}

// 4. FILTRLAR (Kategoriya va Narx)
function filterByCategory(category, btn, event) {
    if (event) event.preventDefault();
    document.querySelectorAll('.filter-link').forEach(link => link.classList.remove('active'));
    btn.classList.add('active');

    if (category === 'all') {
        window.filteredProducts = window.allProducts;
    } else {
        window.filteredProducts = window.allProducts.filter(p => p.category === category);
    }
    currentPage = 1;
    displayProducts(window.filteredProducts, 1);
}

function applyFilter() {
    const min = parseInt(document.getElementById('minPrice').value.replace(/\s/g, '')) || 0;
    const max = parseInt(document.getElementById('maxPrice').value.replace(/\s/g, '')) || Infinity;

    window.filteredProducts = window.allProducts.filter(p => p.price >= min && p.price <= max);
    currentPage = 1;
    displayProducts(window.filteredProducts, 1);
    document.getElementById('priceDropdown').classList.remove('show');
}

// 5. SHARHLARNI YUKLASH
async function fetchReviews() {
    try {
        const { data: reviews, error } = await _supabase.from('reviews').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        const container = document.getElementById('video-grid');
        if (!container) return;

        container.innerHTML = '';
        reviews.forEach(rv => {
            let videoId = rv.video_url;
            if (videoId.includes('v=')) {
                videoId = videoId.split('v=')[1].split('&')[0];
            } else if (videoId.includes('youtu.be/')) {
                videoId = videoId.split('youtu.be/')[1].split('?')[0];
            }

            container.innerHTML += `
                <div class="video-card">
                    <div class="video-wrapper">
                        <iframe 
                            src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" 
                            frameborder="0" allowfullscreen>
                        </iframe>
                    </div>
                    <p style="color:white; text-align:center; margin-top:10px; font-weight:600;">${rv.title || 'Mijozimiz fikri'}</p>
                </div>`;
        });
    } catch (err) {
        console.error("Sharhlar yuklanmadi:", err.message);
    }
}

// 6. SAVATCHA FUNKSIYALARI
function addToCart(id) {
    const product = window.allProducts.find(p => p.id == id);
    const existingItem = cart.find(item => item.id == id);

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart();
    renderCartItems();
    toggleCartPanel(true);
}

function toggleCartPanel(show = null) {
    const panel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    if (!panel || !overlay) return;

    if (show === true) {
        panel.classList.add('open');
        overlay.classList.add('active');
    } else if (show === false) {
        panel.classList.remove('open');
        overlay.classList.remove('active');
    } else {
        panel.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

function renderCartItems() {
    const container = document.getElementById('cartItemList');
    const totalDisplay = document.getElementById('cartPanelTotal');
    if (!container) return;

    container.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; margin-top:50px; color:#888;">Savatchangiz bo\'sh</p>';
    }

    cart.forEach((item, index) => {
        total += item.price * item.qty;
        const itemImg = (item.images && item.images.length > 0) ? item.images[0] : 'https://via.placeholder.com/60';
        container.innerHTML += `
            <div class="cart-item">
                <img src="${itemImg}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
                <div style="flex:1; padding-left:10px;">
                    <h4 style="font-size:14px; margin:0;">${item.name}</h4>
                    <div class="order-qty-control" style="gap:8px; margin-top:5px;">
                        <button onclick="changeQty(${index}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button onclick="changeQty(${index}, 1)">+</button>
                    </div>
                </div>
                <div style="text-align:right">
                    <p style="font-weight:bold; font-size:14px; margin:0;">${(item.price * item.qty).toLocaleString()} UZS</p>
                    <span onclick="removeFromCart(${index})" style="color:red; cursor:pointer; font-size:11px;">O'chirish</span>
                </div>
            </div>`;
    });
    if (totalDisplay) totalDisplay.innerText = total.toLocaleString() + " UZS";
    updateCartBadge();
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty < 1) cart.splice(index, 1);
    saveCart();
    renderCartItems();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCartItems();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) badge.innerText = cart.length;
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// 7. NAVBAR VA QO'SHIMCHA ELEMENTLAR (Sen so'ragan vizuallar)
function toggleMobileMenu() {
    const navbar = document.querySelector('.navbar');
    navbar.classList.toggle('active-menu');
    console.log("Mobil menyu bosildi");
}

function toggleDropdown(e) {
    e.stopPropagation();
    document.getElementById('priceDropdown').classList.toggle('show');
}

function formatInput(input) {
    let value = input.value.replace(/\D/g, '');
    input.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// 8. ADMIN ACCESS VA EVENTLAR
function checkAdminAccess(event) {
    event.preventDefault();
    const password = prompt("Admin parolini kiriting:");
    if (password === "1234") {
        window.location.href = "admin/admin.html";
    } else {
        alert("Parol noto'g'ri!");
    }
}

// Scroll bo'lganda Navbarni blur qilish
window.onscroll = function () {
    const navbar = document.querySelector('.navbar');
    if (window.pageYOffset > 50) {
        navbar.style.backdropFilter = "blur(10px)";
        navbar.style.backgroundColor = "rgba(0, 0, 0, 0.50)";
    } else {
        navbar.style.backdropFilter = "none";
        navbar.style.backgroundColor = "#080808";
    }
};

// Dasturni ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    fetchReviews();
    renderCartItems();

    window.onclick = (e) => {
        // Tashqariga bosilganda dropdownni yopish
        if (!e.target.closest('.filter-dropdown')) {
            const drop = document.getElementById('priceDropdown');
            if (drop) drop.classList.remove('show');
        }
        // Search inputdan tashqari bosilganda yopish
        const searchWrap = document.querySelector('.search-wrapper');
        const searchInp = document.getElementById("searchInput");
        if (searchWrap && !searchWrap.contains(e.target) && searchInp.value === "") {
            searchInp.classList.remove("show-search");
        }
    };
});

// To'g'ridan-to'g'ri buyurtma tekshiruvi
window.addEventListener('load', () => {
    const directOrder = localStorage.getItem('direct_order');
    if (directOrder) {
        const product = JSON.parse(directOrder);
        localStorage.removeItem('direct_order');
        setTimeout(() => {
            if (typeof openOrderModal === 'function') {
                openOrderModal(product);
            }
        }, 500);
    }
});

// 1. Qidiruv panelini ochish/yopish funksiyasi
function toggleSearch() {
    const container = document.getElementById('searchContainer');
    const input = document.getElementById('searchnavInput');

    // Klassni qo'shish yoki olib tashlash
    container.classList.toggle('active');

    if (container.classList.contains('active')) {
        // Animatsiya tugashini kutib, inputga fokus beramiz
        setTimeout(() => {
            input.focus();
        }, 300);
    } else {
        // Yopilganda ichini tozalash va hamma mahsulotlarni qaytarish
        input.value = '';
        if (typeof searchProducts === "function") searchProducts();
    }
}

// 2. Qidiruv mantiqi (Real-vaqtda qidirish)
function searchProducts() {
    const term = document.getElementById('searchInput').value.toLowerCase();

    // Diqqat: 'allProducts' - bu sening Supabase'dan kelgan hamma mahsulotlaring massivi bo'lishi kerak
    // Agar massiving boshqa nomda bo'lsa, nomini o'zgartirib qo'y.
    if (typeof allProducts !== 'undefined') {
        const filtered = allProducts.filter(p =>
            p.name.toLowerCase().includes(term) ||
            (p.description && p.description.toLowerCase().includes(term))
        );

        // Bu funksiya mahsulotlarni ekranga qayta chizadi
        if (typeof displayProducts === "function") {
            displayProducts(filtered);
        }
    }
}

function toggleMobileMenu() {
    const sidebar = document.getElementById("mobileSidebar");
    const overlay = document.getElementById("overlay");

    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");

    // Menyu ochiqligida asosiy sahifa scroll bo'lmasligi uchun
    if (sidebar.classList.contains("active")) {
        document.body.style.overflow = "hidden";
    } else {
        document.body.style.overflow = "auto";
    }
}

async function loadMobileHero() {
    try {
        // Supabase'dan eng oxirgi banner ma'lumotini olish
        const { data, error } = await _supabase
            .from('hero_product')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Katta harfga e'tibor bering: maybeSingle

        if (error) throw error;

        if (data) {
            const mobileHeroContainer = document.getElementById('hero-mobile');
            if (mobileHeroContainer) {
                // Rasmni massivning birinchi elementidan olamiz
                const heroImageUrl = (data.images && data.images.length > 0)
                    ? data.images[0]
                    : (data.image_url || ''); // Eskisini ham tekshirib qo'yamiz

                mobileHeroContainer.innerHTML = `
                    <div class="home" style="background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${heroImageUrl}') center/cover no-repeat;">
                        <h1 class="hometext">${data.name}</h1>
                        <button class="home-btn" onclick="window.location.href='pages/pages.html?id=${data.id}&type=hero'">
                            BATAFSIL
                        </button>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Mobil banner yuklanmadi:", err.message);
    }
}

// Sahifa yuklanganda ishga tushirish
document.addEventListener('DOMContentLoaded', loadMobileHero);