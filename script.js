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
                        <button class="btn-more" onclick="window.location.href='../pages/pages.html?id=${p.id}'">BATAFSIL</button>
                        <button class="btn-order" onclick="addToCart(${p.id})">BUYURTMA BERISH</button>
                    </div>
                </div>
            </div>`;
    });
    // Agar pagination divi bo'lsa uni render qiladi
    const paginationDiv = document.getElementById('pagination');
    if (paginationDiv) renderPagination(products.length);
}

// 3. QIDIRUV VA FILTRLAR
function searchProducts(query) {
    window.filteredProducts = window.allProducts.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
    );
    currentPage = 1;
    displayProducts(window.filteredProducts, 1);
}

// event argumenti qo'shildi
function filterByCategory(category, btn, event) {
    // Sahifa tepaga sakrab ketishini bloklaymiz
    if (event) {
        event.preventDefault();
    }

    // Klasslarni almashtirish
    document.querySelectorAll('.filter-link').forEach(link => link.classList.remove('active'));
    btn.classList.add('active');

    // Filtrlash mantiqi
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
// 4. SHARHLARNI SUPABASE'DAN OLISH (YouTube 1-da-2 qilib)
async function fetchReviews() {
    try {
        const { data: reviews, error } = await _supabase.from('reviews').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        const container = document.getElementById('video-grid');
        if (!container) return;

        container.innerHTML = '';
        reviews.forEach(rv => {
            // Video linkidan ID ni ajratib olish (agar u yerda to'liq link saqlanib qolgan bo'lsa)
            let videoId = rv.video_url;

            // Agar bazada to'liq link bo'lsa, uni ID ga aylantiramiz
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
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    </div>
                    <p style="color:white; text-align:center; margin-top:10px; font-weight:600; font-family: sans-serif;">
                        ${rv.title || 'Mijozimiz fikri'}
                    </p>
                </div>`;
        });
    } catch (err) {
        console.error("Sharhlar yuklanmadi:", err.message);
    }
}

// 5. SAVATCHA MANTIQI
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
                        <button onclick="changeQty(${index}, -1)" style="width:25px; height:25px; font-size:16px;">-</button>
                        <span style="font-weight:bold;">${item.qty}</span>
                        <button onclick="changeQty(${index}, 1)" style="width:25px; height:25px; font-size:16px;">+</button>
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

// 6. QOSHIMCHA FUNKSIYALAR
function checkAdminAccess(event) {
    event.preventDefault();
    const password = prompt("Admin parolini kiriting:");
    if (password === "1234") {
        window.location.href = "../admin/admin.html";
    } else {
        alert("Parol noto'g'ri!");
    }
}

function toggleDropdown(e) {
    e.stopPropagation();
    document.getElementById('priceDropdown').classList.toggle('show');
}

function formatInput(input) {
    let value = input.value.replace(/\D/g, '');
    input.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Dasturni ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    fetchReviews();
    renderCartItems();

    window.onclick = (e) => {
        if (!e.target.closest('.filter-dropdown')) {
            const drop = document.getElementById('priceDropdown');
            if (drop) drop.classList.remove('show');
        }
    };
});

window.addEventListener('load', () => {
    const directOrder = localStorage.getItem('direct_order');
    if (directOrder) {
        const product = JSON.parse(directOrder);
        localStorage.removeItem('direct_order'); // Xotirani tozalaymiz

        // Modal ochilishi uchun ozgina kutamiz (sahifa to'liq yuklanishi uchun)
        setTimeout(() => {
            if (typeof openOrderModal === 'function') {
                openOrderModal(product);
            }
        }, 500);
    }
});