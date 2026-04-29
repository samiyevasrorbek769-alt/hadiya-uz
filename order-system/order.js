// order.js - Buyurtma tizimi va Telegram Bot integratsiyasi (MUKAMMAL VERSIYA)
// --- TELEGRAM BOT SOZLAMALARI ---
const BOT_TOKEN = '8685019887:AAFfFE8nnVtASXEOnnZqKrsWe84FWoweCN0';
const CHAT_ID = '6943894774';

let currentOrderProduct = null; // Agar bitta mahsulot ustidan "Buyurtma" bosilsa
let currentOrderQty = 1;

// Bazadagi barcha adminlarning Telegram ID-larini olish
async function getAllAdminIds() {
    try {
        const { data, error } = await _supabase.from('admins').select('telegram_id');
        if (error) throw error;

        // Asosiy CHAT_ID va bazadagi adminlarni birlashtiramiz
        let adminIds = [CHAT_ID];
        if (data) {
            data.forEach(admin => adminIds.push(admin.telegram_id));
        }
        return [...new Set(adminIds)]; // Takrorlanishni olib tashlaymiz
    } catch (err) {
        console.error("Adminlarni olishda xato:", err);
        return [CHAT_ID]; // Xato bo'lsa faqat senga boradi
    }
}

// 1. MODALNI OCHISH (Bitta mahsulot uchun)
function openOrderModal(product) {
    currentOrderProduct = product;
    currentOrderQty = 1;

    const modal = document.getElementById('orderModal');
    const modalImg = document.getElementById('modalImg');
    const modalName = document.getElementById('modalName');
    const modalPriceDisplay = document.getElementById('modalPriceDisplay');
    const orderQtySpan = document.getElementById('orderQty');

    if (modal && product) {
        // Rasmni o'rnatish
        modalImg.src = (product.images && product.images.length > 0) ? product.images[0] : 'https://via.placeholder.com/150';
        modalName.innerText = product.name;

        // Narxni formatlash (bo'shliqlarni olib tashlab raqamga o'girish)
        const cleanPrice = Number(String(product.price).replace(/\s/g, ''));
        modalPriceDisplay.innerText = cleanPrice.toLocaleString() + " UZS";

        // Miqdorni 1 ga qaytarib qo'yish
        if (orderQtySpan) orderQtySpan.innerText = currentOrderQty;

        document.getElementById('orderQtyWrapper').style.display = 'flex'; // Miqdor boshqaruvini ko'rsatish
        updateOrderTotal();
        modal.style.display = 'flex';
    }
}

// 2. SAVATCHADAN TURIB BUYURTMA MODALINI OCHISH
function openOrderModalFromCart() {
    if (typeof cart === 'undefined' || cart.length === 0) {
        alert("Savatchangiz bo'sh!");
        return;
    }

    currentOrderProduct = null; // Savatcha rejimi

    const modal = document.getElementById('orderModal');
    const modalImg = document.getElementById('modalImg');
    const modalName = document.getElementById('modalName');
    const modalPriceDisplay = document.getElementById('modalPriceDisplay');
    const finalPriceElement = document.getElementById('orderFinalPrice');

    modalImg.src = (cart[0].images && cart[0].images.length > 0) ? cart[0].images[0] : 'https://via.placeholder.com/150';
    modalName.innerText = "Savatchadagi barcha mahsulotlar (" + cart.length + " xil)";

    // Savatchadagi jami summani hisoblash
    let total = cart.reduce((sum, item) => {
        const itemPrice = Number(String(item.price).replace(/\s/g, ''));
        return sum + (itemPrice * (item.qty || 1));
    }, 0);

    modalPriceDisplay.innerText = total.toLocaleString() + " UZS";
    if (finalPriceElement) finalPriceElement.innerText = total.toLocaleString() + " UZS";

    document.getElementById('orderQtyWrapper').style.display = 'none'; // Savatchada miqdor modalda boshqarilmaydi
    modal.style.display = 'flex';
}

// 3. MODALNI YOPISH
function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'none';
    const qtyWrapper = document.getElementById('orderQtyWrapper');
    if (qtyWrapper) qtyWrapper.style.display = 'flex';
}

// 4. MIQDORNI YANGILASH (+-)
function updateQty(delta) {
    currentOrderQty += delta;
    if (currentOrderQty < 1) currentOrderQty = 1;

    const qtyDisplay = document.getElementById('orderQty');
    if (qtyDisplay) {
        qtyDisplay.innerText = currentOrderQty;
    }
    updateOrderTotal();
}

// 5. JAMI SUMMANI HISOBLASH (Rasmiylashtirish oynasi uchun)
function updateOrderTotal() {
    const finalPriceElement = document.getElementById('orderFinalPrice');

    // Faqat bitta mahsulot sotib olinayotgan bo'lsa (currentOrderProduct bo'sh bo'lmasa)
    if (currentOrderProduct && finalPriceElement) {
        const cleanPrice = Number(String(currentOrderProduct.price).replace(/\s/g, ''));
        const total = cleanPrice * currentOrderQty;
        finalPriceElement.innerText = total.toLocaleString() + " UZS";
    }
}

// 6. TELEGRAMGA XABAR YUBORISH VA ADMIN BOSHQARUVI
async function sendToTelegram(order) {
    // A. Barcha adminlarni olish (Sening CHAT_ID + Bazadagi adminlar)
    async function getAdmins() {
        try {
            const { data, error } = await _supabase.from('admins').select('telegram_id');
            let adminList = [CHAT_ID]; // Sen har doim ro'yxatda birinchi bo'lasan
            if (data) {
                data.forEach(adm => adminList.push(adm.telegram_id));
            }
            return [...new Set(adminList)]; // Takrorlanmas IDlar
        } catch (e) {
            return [CHAT_ID]; // Xato bo'lsa faqat senga yuboradi
        }
    }

    const adminIds = await getAdmins();

    // B. Buyurtma matni (HTML)
    const text = `
<b>📦 YANGI BUYURTMA!</b>
<b>──────────────────</b>
<b>👤 Mijoz:</b> ${order.customer_name}
<b>📞 Tel:</b> ${order.customer_phone}
<b>✈️ Telegram:</b> ${order.customer_tg || "Ko'rsatilmadi"}
<b>📍 Manzil:</b> ${order.address}
<b>──────────────────</b>
<b>⌚ Mahsulotlar:</b>
${order.product_name}
<b>💰 Jami:</b> ${order.total_price.toLocaleString()} UZS
<b>──────────────────</b>
<b>🕒 Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}
    `;

    // C. Barcha adminlarga yuborish mantiqi
    const sendPromises = adminIds.map(id =>
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: id,
                text: text,
                parse_mode: 'HTML'
            })
        }).then(res => res.json())
    );

    try {
        await Promise.all(sendPromises);
    } catch (err) {
        console.error("Telegramga yuborishda xato:", err);
    }
}

// 6.1. TELEGRAMDAN ADMIN QO'SHISH (MAXSUS FUNKSIYA)
// Bu funksiyani ishlashi uchun sayt ochiq bo'lganda botga kelgan so'nggi xabarni tekshiradi
async function checkBotUpdates() {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-1`);
        const data = await response.json();

        if (data.ok && data.result.length > 0) {
            const lastMsg = data.result[0].message;
            const text = lastMsg.text;
            const fromId = String(lastMsg.from.id);

            // Faqat sen (Asosiy Admin) buyruq bera olasan
            if (fromId === CHAT_ID && text.startsWith('/addadmin')) {
                const parts = text.split(' ');
                if (parts.length >= 3) {
                    const newId = parts[1];
                    const newName = parts.slice(2).join(' ');

                    const { error } = await _supabase
                        .from('admins')
                        .insert([{ telegram_id: newId, name: newName }]);

                    if (!error) {
                        alert(`Yangi admin qo'shildi: ${newName}`);
                        // Tasdiqlash uchun botga qayta xabar yuborish
                        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chat_id: CHAT_ID, text: `✅ ${newName} admin qilindi.` })
                        });
                    }
                }
            }
            // Admin o'chirish buyruq formati: /removeadmin 123456789
            if (fromId === CHAT_ID && text.startsWith('/removeadmin')) {
                const parts = text.split(' ');
                if (parts.length >= 2) {
                    const targetId = parts[1].trim();

                    // Supabase-dan o'chirish
                    const { error } = await _supabase
                        .from('admins')
                        .delete()
                        .eq('telegram_id', targetId);

                    if (!error) {
                        alert(`Admin (ID: ${targetId}) bazadan o'chirildi.`);

                        // Bot orqali tasdiqlash xabari
                        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: CHAT_ID,
                                text: `🗑 Admin muvaffaqiyatli o'chirildi (ID: ${targetId}).`
                            })
                        });
                    } else {
                        console.error("O'chirishda xatolik:", error.message);
                        alert("Xatolik: " + error.message);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Update tekshirishda xato:", e);
    }
}


// Sayt har ochilganda botdan yangi admin buyrug'i bor-yo'qligini tekshiradi
setInterval(checkBotUpdates, 10000); // Har 10 soniyada bir marta tekshiradi

// 7. BUYURTMANI QAYTA ISHLASH (PROCESS ORDER)
async function processOrder() {
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const telegram = document.getElementById('custTg').value.trim();
    const address = document.getElementById('custAddr').value.trim();
    const btn = document.querySelector('.order-submit-btn') || { innerText: "" };

    if (!name || phone.length < 13 || !address) {
        alert("Iltimos, barcha maydonlarni to'g'ri to'ldiring!");
        return;
    }

    // Loading holati
    const originalText = btn.innerText;
    if (btn.tagName === "BUTTON") {
        btn.disabled = true;
        btn.innerText = "YUBORILMOQDA...";
    }

    let itemsInfo = "";
    let finalTotal = 0;

    // Buyurtma turi: Savatchami yoki Bitta mahsulot?
    if (currentOrderProduct) {
        itemsInfo = `• ${currentOrderProduct.name} (${currentOrderQty} ta)`;
        finalTotal = currentOrderProduct.price * currentOrderQty;
    } else if (typeof cart !== 'undefined' && cart.length > 0) {
        cart.forEach((item, index) => {
            itemsInfo += `${index + 1}. ${item.name} (${item.qty || 1} ta)\n`;
            finalTotal += item.price * (item.qty || 1);
        });
    }

    const orderData = {
        product_name: itemsInfo,
        total_price: finalTotal,
        customer_name: name,
        customer_phone: phone,
        customer_tg: telegram,
        address: address,
        status: 'yangi',
        created_at: new Date()
    };

    try {
        // A. Supabase'ga saqlash
        const { error } = await _supabase.from('orders').insert([orderData]);
        if (error) throw error;

        // B. Telegram Botga yuborish
        await sendToTelegram(orderData);

        alert("Rahmat! Buyurtmangiz qabul qilindi.");
        closeOrderModal();

        // C. Ma'lumotlarni tozalash
        document.getElementById('custName').value = "";
        document.getElementById('custAddr').value = "";
        document.getElementById('custTg').value = "";

        if (typeof cart !== 'undefined') {
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            if (typeof renderCartItems === 'function') renderCartItems();
            if (typeof updateCartCount === 'function') updateCartCount();
        }

    } catch (err) {
        console.error("Buyurtmada xato:", err.message);
        alert("Xatolik yuz berdi: " + err.message);
    } finally {
        if (btn.tagName === "BUTTON") {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
}

// 8. TELEFON RAQAM FORMATI (+998 )
document.getElementById('custPhone').addEventListener('input', function (e) {
    if (!this.value.startsWith('+998 ')) {
        this.value = '+998 ';
    }
    this.value = this.value.replace(/[^\d+ ]/g, '');
});

// Modal tashqarisiga bosilganda yopish
window.onclick = function (event) {
    const modal = document.getElementById('orderModal');
    if (event.target == modal) {
        closeOrderModal();
    }
}