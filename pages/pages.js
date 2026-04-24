// 1. Supabase-ni sozlash
const supabaseUrl = 'https://qamscdwpyoxmkkyfolup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbXNjZHdweW94bWtreWZvbHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzI2MDQsImV4cCI6MjA5MTU0ODYwNH0.LICrT7c33XpbiazpztBtbOQZq09-zV1qm9H91i9w_pM';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 1. URL-dan ID ni olish
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

// Global o'zgaruvchi mahsulot ma'lumotlarini saqlash uchun
let currentProduct = null;

async function getProductDetails() {
    if (!productId) return;

    try {
        const { data: product, error } = await _supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;

        currentProduct = product; // Mahsulotni saqlab qo'yamiz

        // Ma'lumotlarni HTML ga joylash
        document.getElementById('pName').innerText = product.name;
        document.getElementById('pPrice').innerText = Number(product.price).toLocaleString() + " UZS";
        document.getElementById('pDesc').innerText = product.description;

        // Galereyani hosil qilish
        const mainImg = document.getElementById('mainImg');
        const thumbContainer = document.getElementById('thumbContainer');

        if (product.images && product.images.length > 0) {
            mainImg.src = product.images[0];
            thumbContainer.innerHTML = '';

            product.images.forEach((imgUrl, index) => {
                const img = document.createElement('img');
                img.src = imgUrl;
                if (index === 0) img.classList.add('active');

                img.onclick = function () {
                    mainImg.src = imgUrl;
                    document.querySelectorAll('.thumbnails img').forEach(t => t.classList.remove('active'));
                    img.classList.add('active');
                };
                thumbContainer.appendChild(img);
            });
        }

        loadMoreProducts();

    } catch (err) {
        console.error("Xatolik:", err.message);
    }
}

async function loadMoreProducts() {
    try {
        const { data: others, error } = await _supabase
            .from('products')
            .select('*')
            .neq('id', productId)
            .limit(4);

        if (error) throw error;

        const moreGrid = document.getElementById('moreProductsGrid');
        if (!moreGrid) return;

        moreGrid.innerHTML = '';

        others.forEach(p => {
            const card = `
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
            `;
            moreGrid.innerHTML += card;
        });
    } catch (err) {
        console.error("Qo'shimcha mahsulotlar yuklanmadi:", err);
    }
}

async function getProductDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const productType = urlParams.get('type'); // 'hero' yoki null

    if (!productId) return;

    // Jadvalni aniqlash (hero bo'lsa hero_product, aks holda products)
    const targetTable = (productType === 'hero') ? 'hero_product' : 'products';

    try {
        const { data: product, error } = await _supabase
            .from(targetTable)
            .select('*')
            .eq('id', productId)
            .maybeSingle(); // .single() o'rniga .maybeSingle() xatolarni kamaytiradi

        if (error) throw error;

        if (!product) {
            document.getElementById('pName').innerText = "Mahsulot topilmadi";
            return;
        }

        // Ma'lumotlarni joylash
        document.getElementById('pName').innerText = product.name;
        document.getElementById('pPrice').innerText = Number(product.price).toLocaleString() + " UZS";
        document.getElementById('pDesc').innerText = product.description || "Tavsif yo'q";

        // ... (tepadagi kodlar)
        const mainImg = document.getElementById('mainImg');
        const thumbContainer = document.getElementById('thumbContainer');

        // Rasmlar borligini tekshiramiz
        if (product.images && product.images.length > 0) {
            // 1. Asosiy rasmga massivning birinchi elementini qo'yamiz
            mainImg.src = product.images[0];

            // 2. Galereyani tozalab, qaytadan rasmchalarni chiqaramiz
            thumbContainer.innerHTML = '';
            product.images.forEach((imgUrl, index) => {
                const img = document.createElement('img');
                img.src = imgUrl;
                if (index === 0) img.classList.add('active');

                img.onclick = function () {
                    mainImg.src = imgUrl;
                    document.querySelectorAll('.thumbnails img').forEach(t => t.classList.remove('active'));
                    img.classList.add('active');
                };
                thumbContainer.appendChild(img);
            });
        } else if (product.image_url) {
            // Agar mabodo bazada hali ham eski 'image_url' ustunida rasm bo'lsa
            mainImg.src = product.image_url;
        }
        
        loadMoreProducts();

    } catch (err) {
        console.error("Xatolik:", err.message);
    }
}

// Sahifa yuklanganda funksiyani chaqirishni unutma
window.onload = getProductDetails;

// 3. BUYURTMA BERISH (TUZATILGAN QISM)
function openOrderModal() {
    if (!currentProduct) return;

    // Mahsulot ma'lumotlarini LocalStorage-ga joylaymiz
    const orderData = {
        name: currentProduct.name,
        price: currentProduct.price,
        // Rasm massiv ichida bo'lishi shart: [rasm_url]
        images: [document.getElementById('mainImg').src]
    };

    localStorage.setItem('direct_order', JSON.stringify(orderData));
    // Bosh sahifaga qaytamiz
    window.location.href = '../index.html';
}