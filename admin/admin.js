// 1. KONFIGURATSIYA
const SB_URL = 'https://qamscdwpyoxmkkyfolup.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbXNjZHdweW94bWtreWZvbHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NzI2MDQsImV4cCI6MjA5MTU0ODYwNH0.LICrT7c33XpbiazpztBtbOQZq09-zV1qm9H91i9w_pM';

const _supabase = supabase.createClient(SB_URL, SB_KEY);

let localProducts = [];
let lastOrderCount = 0; // Yangi buyurtmalarni tekshirish uchun

// 2. BOSHLANG'ICH YUKLASH
document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus();
    loadProducts();
    loadReviews();
    fetchOrders(); // Buyurtmalarni yuklash

    // Har 30 soniyada yangi buyurtmalarni avtomatik tekshirib turish
    setInterval(fetchOrders, 30000);
});

// 3. ADMIN TEKSHIRUVI
function checkAdminStatus() {
    if (localStorage.getItem('isAdmin') !== 'true') {
        let password = prompt("Admin panel parolini kiriting:");
        if (password === "1234") {
            localStorage.setItem('isAdmin', 'true');
        } else {
            alert("Xato parol!");
            window.location.replace('../index.html');
        }
    }
}

// 4. TABLARNI BOSHQARISH (To'g'rilangan variant)
function openTab(evt, tabName) {
    let i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
        tabcontent[i].classList.remove("active");
    }
    tablinks = document.getElementsByClassName("tab-btn");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).style.display = "block";
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");

    // FUNKSIYALARNI CHAQRISH
    if (tabName === 'products-tab') {
        loadProducts(); // Sendagi mahsulot yuklash funksiyasi nomi loadProducts ekan
    }
    if (tabName === 'orders-tab') {
        fetchOrders();
    }
}
// --- BUYURTMALAR BILAN ISHLASH (YANGI QISIM) ---

async function fetchOrders() {
    try {
        const { data, error } = await _supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Yangi buyurtmalar sonini hisoblash (statusi 'yangi' bo'lganlar)
        const newOrders = data.filter(o => o.status === 'yangi').length;
        const countBadge = document.getElementById('new-orders-count');

        if (newOrders > 0) {
            countBadge.innerText = newOrders;
            countBadge.style.display = 'inline-block';
        } else {
            countBadge.style.display = 'none';
        }

        renderOrders(data);
    } catch (err) {
        console.error("Buyurtmalarni yuklashda xato:", err.message);
    }
}

function renderOrders(orders) {
    const listDiv = document.getElementById('orders-list');
    listDiv.innerHTML = '';

    orders.forEach(order => {
        const date = new Date(order.created_at).toLocaleString('uz-UZ', { hour12: false });

        listDiv.innerHTML += `
            <tr>
                <td><small>${date}</small></td>
                <td class="customer-info">
                    <b>${order.customer_name}</b>
                    <span>${order.customer_phone}</span>
                    <small style="color:var(--gold)">${order.customer_tg || ''}</small>
                </td>
                <td><div style="max-width:200px; font-size:12px;">${order.product_name}</div></td>
                <td><b style="color:var(--gold)">${Number(order.total_price).toLocaleString()}</b></td>
                <td>
                    <select class="status-select status-${order.status}" onchange="updateOrderStatus(${order.id}, this.value)">
                        <option value="yangi" ${order.status === 'yangi' ? 'selected' : ''}>🟡 YANGI</option>
                        <option value="yetkazildi" ${order.status === 'yetkazildi' ? 'selected' : ''}>✅ YETKAZILDI</option>
                        <option value="bekor" ${order.status === 'bekor' ? 'selected' : ''}>❌ BEKOR</option>
                    </select>
                </td>
                <td>
                    <button class="delete-btn" onclick="deleteOrder(${order.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

async function updateOrderStatus(id, newStatus) {
    console.log("Status o'zgaryapti:", id, newStatus); // Tekshirish uchun
    try {
        const { error } = await _supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error("Supabase xatosi:", error);
            throw error;
        }

        alert("Status muvaffaqiyatli yangilandi!");
        fetchOrders(); // Jadvalni qayta yuklash
    } catch (err) {
        alert("Xatolik: " + err.message);
    }
}

async function deleteOrder(id) {
    if (confirm("Haqiqatan ham bu buyurtmani o'chirmoqchimisiz?")) {
        try {
            const { error } = await _supabase
                .from('orders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert("Buyurtma o'chirildi!");
            fetchOrders();
        } catch (err) {
            alert("O'chirishda xato: " + err.message);
        }
    }
}

// --- MAHSULOTLAR VA BOSHQA FUNKSIYALAR (ESKI KODLARING) ---

// loadProducts funksiyasini shunday o'zgartir
async function loadProducts() {
    console.log("Mahsulotlar yuklanyapti...");
    showLoading(true);
    try {
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        localProducts = data;
        renderAdminProducts(data);
        document.getElementById('pCount').innerText = data.length;

        // Agar filtr tugmalari bo'lsa, "Hammasi"ni active qilish
        const allBtn = document.querySelector('.filter-section .tab-btn:first-child');
        if (allBtn) {
            document.querySelectorAll('.filter-section .tab-btn').forEach(b => b.classList.remove('active'));
            allBtn.classList.add('active');
        }
    } catch (err) {
        console.error("Yuklashda xato:", err.message);
    } finally {
        showLoading(false);
    }
}

function renderAdminProducts(list) {
    const listDiv = document.getElementById('admin-product-list');
    listDiv.innerHTML = '';
    list.forEach(p => {
        const img = p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/100';
        listDiv.innerHTML += `
            <div class="admin-item-card">
                <img src="${img}" class="admin-item-img">
                <div class="admin-item-info">
                    <strong>${p.name}</strong>
                    <small>${p.category} | ${Number(p.price).toLocaleString()} UZS</small>
                </div>
                <div class="admin-item-actions">
                    <button class="edit-btn" onclick="fillFormForEdit(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
}

function previewImages() {
    const preview = document.getElementById('image-preview');
    const files = document.getElementById('pImgFiles').files;
    preview.innerHTML = '';
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

async function saveProduct() {
    const id = document.getElementById('editId').value;
    const name = document.getElementById('pName').value;
    const price = document.getElementById('pPrice').value;
    const category = document.getElementById('pCategory').value;
    const desc = document.getElementById('pDesc').value;
    const files = document.getElementById('pImgFiles').files;

    if (!name || !price) return alert("Nom va narxni kiriting!");

    showLoading(true);
    try {
        let uploadedUrls = [];
        if (files.length > 0) {
            for (let f of files) {
                const fileName = `${Date.now()}_${f.name}`;
                const { error: upErr } = await _supabase.storage.from('product-images').upload(fileName, f);
                if (upErr) throw upErr;
                const { data: urlData } = _supabase.storage.from('product-images').getPublicUrl(fileName);
                uploadedUrls.push(urlData.publicUrl);
            }
        }

        const productData = { name, price: parseInt(price), category, description: desc };
        if (uploadedUrls.length > 0) productData.images = uploadedUrls;

        if (id) {
            await _supabase.from('products').update(productData).eq('id', id);
            alert("Mahsulot yangilandi!");
        } else {
            if (uploadedUrls.length === 0) throw new Error("Kamida bitta rasm yuklang!");
            await _supabase.from('products').insert([productData]);
            alert("Mahsulot qo'shildi!");
        }
        resetForm();
        loadProducts();
    } catch (err) {
        alert("Xato: " + err.message);
    } finally {
        showLoading(false);
    }
}

function fillFormForEdit(id) {
    const p = localProducts.find(item => item.id === id);
    if (!p) return;
    document.getElementById('editId').value = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pDesc').value = p.description;
    document.getElementById('form-title').innerText = "Tahrirlash: " + p.name;
    document.getElementById('uploadBtn').innerHTML = '<i class="fas fa-sync"></i> YANGILASH';
    document.getElementById('cancelEditBtn').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('editId').value = '';
    document.getElementById('pName').value = '';
    document.getElementById('pPrice').value = '';
    document.getElementById('pDesc').value = '';
    document.getElementById('pImgFiles').value = '';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('form-title').innerHTML = '<i class="fas fa-plus-circle"></i> Yangi mahsulot qo\'shish';
    document.getElementById('uploadBtn').innerHTML = '<i class="fas fa-save"></i> MAHSULOTNI SAQLASH';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

async function deleteProduct(id) {
    if (confirm("Ushbu mahsulotni o'chiramizmi?")) {
        await _supabase.from('products').delete().eq('id', id);
        loadProducts();
    }
}

// YOUTUBE VA QIDIRUV FUNKSIYALARI...
function extractVideoID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

async function saveReview() {
    const title = document.getElementById('vTitle').value;
    const url = document.getElementById('vUrl').value;
    if (!url) return alert("Linkni kiriting!");
    const videoId = extractVideoID(url);
    const { error } = await _supabase.from('reviews').insert([{ title: title || "Mijoz fikri", video_url: videoId }]);
    if (error) alert(error.message);
    else { alert("Video qo'shildi!"); loadReviews(); }
}

async function loadReviews() {
    const { data } = await _supabase.from('reviews').select('*').order('id', { ascending: false });
    const listDiv = document.getElementById('admin-review-list');
    listDiv.innerHTML = '';
    if (data) {
        data.forEach(rv => {
            listDiv.innerHTML += `
                <div class="admin-item-card">
                    <div class="admin-item-info"><strong>${rv.title}</strong><br><small>ID: ${rv.video_url}</small></div>
                    <button class="delete-btn" onclick="deleteReview(${rv.id})"><i class="fas fa-trash"></i></button>
                </div>`;
        });
    }
}

async function deleteReview(id) {
    if (confirm("Videoni o'chiramizmi?")) {
        await _supabase.from('reviews').delete().eq('id', id);
        loadReviews();
    }
}

function filterProducts() {
    const val = document.getElementById('searchInp').value.toLowerCase();
    const filtered = localProducts.filter(p => p.name.toLowerCase().includes(val));
    renderAdminProducts(filtered);
}

async function filterByCategory(category, btnElement) {
    // 1. Tugma stillarini yangilash
    document.querySelectorAll('.filter-section .tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    showLoading(true);
    try {
        let query = _supabase.from('products').select('*');

        // 2. Agar "all" bo'lmasa, kategoriya bo'yicha filtrlaymiz
        if (category !== 'all') {
            query = query.eq('category', category);
        }

        const { data, error } = await query.order('id', { ascending: false });

        if (error) throw error;

        // 3. Mahalliy ma'lumotlarni yangilash va ekranga chiqarish
        localProducts = data;
        renderAdminProducts(data);
        document.getElementById('pCount').innerText = data.length;

    } catch (err) {
        alert("Filtrlashda xato yuz berdi: " + err.message);
    } finally {
        showLoading(false);
    }
}

// --- ASOSIY BANNER (HOME) BOSHQARUVI ---
async function saveHeroBanner() {
    const name = document.getElementById('hName').value;
    const price = document.getElementById('hPrice').value;
    const desc = document.getElementById('hDesc').value;
    const fileInput = document.getElementById('hImgFile');
    const files = fileInput.files;

    if (!name || files.length === 0) {
        alert("Iltimos, model nomi va kamida bitta rasm tanlang!");
        return;
    }

    if (typeof showLoading === "function") showLoading(true);

    try {
        const uploadedUrls = [];

        // Tanlangan rasmlarni birma-bir yuklash
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileName = `hero_${Date.now()}_${i}`;

            const { error: upErr } = await _supabase.storage
                .from('product-images')
                .upload(fileName, file);

            if (upErr) throw upErr;

            const { data: urlData } = _supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            uploadedUrls.push(urlData.publicUrl);
        }

        // Bazaga saqlash (images: uploadedUrls massivini yuboradi)
        const { error: dbErr } = await _supabase
            .from('hero_product')
            .upsert([{
                id: 1, // Doim 1-idli bannerni yangilaydi
                name: name,
                price: String(price),
                description: desc,
                images: uploadedUrls
            }]);

        if (dbErr) throw dbErr;

        alert("Ko'p rasmli banner muvaffaqiyatli yangilandi!");
        location.reload();

    } catch (err) {
        console.error(err);
        alert("Xatolik: " + err.message);
    } finally {
        if (typeof showLoading === "function") showLoading(false);
    }
}

function showLoading(s) { document.getElementById('loadingOverlay').style.display = s ? 'flex' : 'none'; }
function logout() { localStorage.removeItem('isAdmin'); window.location.replace('../index.html'); }