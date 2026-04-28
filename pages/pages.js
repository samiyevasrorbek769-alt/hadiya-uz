// 1. Supabase-ni sozlash
const supabaseUrl = 'https://qamscdwpyoxmkkyfolup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbXNjZHdweW94bWtreWZvbHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzI2MDQsImV4cCI6MjA5MTU0ODYwNH0.LICrT7c33XpbiazpztBtbOQZq09-zV1qm9H91i9w_pM';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentProduct = null;
let productSwiper = null;

// 2. Mahsulot ma'lumotlarini olish
async function getProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const productType = urlParams.get('type');

    if (!productId) return;

    const targetTable = (productType === 'hero') ? 'hero_product' : 'products';

    try {
        const { data: product, error } = await _supabase
            .from(targetTable)
            .select('*')
            .eq('id', productId)
            .maybeSingle();

        if (error) throw error;
        if (!product) {
            document.getElementById('pName').innerText = "Mahsulot topilmadi";
            return;
        }

        currentProduct = product;

        // Ma'lumotlarni HTML ga joylash
        document.getElementById('pName').innerText = product.name;
        document.getElementById('pPrice').innerText = Number(product.price).toLocaleString() + " UZS";
        document.getElementById('pDesc').innerText = product.description || "Tavsif yo'q";

        // Galereyani shakllantirish
        const mainWrapper = document.getElementById('main-slides');
        const thumbContainer = document.getElementById('thumbContainer');

        if (product.images && product.images.length > 0) {
            // Asosiy slaydlarni to'ldirish
            mainWrapper.innerHTML = product.images.map(img => `
                <div class="swiper-slide">
                    <img src="${img}" alt="${product.name}">
                </div>
            `).join('');

            // Thumbnail-larni to'ldirish
            thumbContainer.innerHTML = product.images.map((img, index) => `
                <img src="${img}" class="${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})">
            `).join('');

            // Swiper-ni ishga tushirish
            productSwiper = new Swiper(".mainPageSwiper", {
                loop: true,
                navigation: {
                    nextEl: ".swiper-button-next",
                    prevEl: ".swiper-button-prev",
                },
                on: {
                    slideChange: function () {
                        updateThumbs(this.realIndex);
                    }
                }
            });
        }

        loadMoreProducts(productId);

    } catch (err) {
        console.error("Xatolik:", err.message);
    }
}

// Thumbnail yangilanishi
function updateThumbs(index) {
    const thumbs = document.querySelectorAll('.thumbnails img');
    thumbs.forEach(t => t.classList.remove('active'));
    if (thumbs[index]) thumbs[index].classList.add('active');
}

// Thumbnail bosilganda slaydga o'tish
function goToSlide(index) {
    if (productSwiper) productSwiper.slideToLoop(index);
}

// 3. Boshqa mahsulotlarni yuklash
async function loadMoreProducts(excludeId) {
    try {
        const { data: others, error } = await _supabase
            .from('products')
            .select('*')
            .neq('id', excludeId)
            .limit(4);

        if (error) throw error;

        const moreGrid = document.getElementById('moreProductsGrid');
        if (!moreGrid) return;

        moreGrid.innerHTML = others.map(p => `
            <div class="product-card">
                <div class="product-image">
                    <img src="${p.images[0]}" alt="${p.name}">
                </div>
                <div class="product-info">
                    <div class="product-name">${p.name}</div>
                    <div class="product-price">${Number(p.price).toLocaleString()} UZS</div>
                    <button class="btn-more" onclick="window.location.href='pages.html?id=${p.id}'">BATAFSIL</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Qo'shimcha mahsulotlar yuklanmadi:", err);
    }
}

// 4. Buyurtma berish
function openOrderModal() {
    if (!currentProduct) return;
    const orderData = {
        name: currentProduct.name,
        price: currentProduct.price,
        images: currentProduct.images
    };
    localStorage.setItem('direct_order', JSON.stringify(orderData));
    window.location.href = '../index.html';
}

// Sahifa yuklanganda
window.onload = getProductDetails;