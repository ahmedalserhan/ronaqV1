// main.js
import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// متغيرات لـ Cart Modal (تم نقلها إلى هنا لتكون خاصة بـ main.js)
const cartModalOverlay = document.getElementById('cart-modal-overlay');
const cartModalCloseBtn = document.getElementById('cart-modal-close-btn');
const cartItemsListContainer = document.getElementById('cart-items-list');
const cartEmptyMessage = document.getElementById('cart-empty-message');
const cartSubtotalSpan = document.getElementById('cart-subtotal');
const cartTotalSpan = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');

// --- وظائف سلة المشتريات (تتفاعل مع window.userCart و window.updateAndSaveCart من auth.js) ---

// دالة تحديث وعرض محتوى السلة في Modal
const renderCartItems = () => {
    // الوصول إلى userCart من المتغير العالمي في auth.js
    let currentCart = window.userCart || [];
    cartItemsListContainer.innerHTML = '';
    let subtotal = 0;

    if (currentCart.length === 0) {
        cartEmptyMessage.classList.remove('hidden');
        checkoutBtn.disabled = true;
    } else {
        cartEmptyMessage.classList.add('hidden');
        checkoutBtn.disabled = false;
        currentCart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            const cartItemDiv = document.createElement('div');
            cartItemDiv.className = 'cart-item';
            cartItemDiv.innerHTML = `
                <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>${item.price.toFixed(2)} د.أ</p>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-control-btn decrease-quantity" data-id="${item.id}">-</button>
                    <input type="number" class="cart-item-quantity" value="${item.quantity}" min="1" data-id="${item.id}">
                    <button class="quantity-control-btn increase-quantity" data-id="${item.id}">+</button>
                    <button class="remove-item-btn" data-id="${item.id}">حذف</button>
                </div>
            `;
            cartItemsListContainer.appendChild(cartItemDiv);
        });
    }

    cartSubtotalSpan.textContent = subtotal.toFixed(2);
    cartTotalSpan.textContent = subtotal.toFixed(2); // حالياً الإجمالي هو الإجمالي الفرعي

    // ربط الأحداث بأزرار التحكم بالكمية والحذف
    document.querySelectorAll('.decrease-quantity').forEach(btn => {
        btn.onclick = (e) => updateQuantity(e.target.dataset.id, -1);
    });
    document.querySelectorAll('.increase-quantity').forEach(btn => {
        btn.onclick = (e) => updateQuantity(e.target.dataset.id, 1);
    });
    document.querySelectorAll('.cart-item-quantity').forEach(input => {
        input.onchange = (e) => updateQuantityDirect(e.target.dataset.id, parseInt(e.target.value));
    });
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.onclick = (e) => removeItem(e.target.dataset.id);
    });

    // تحديث عداد السلة في الهيدر (باستخدام الدالة العالمية من auth.js)
    if (window.updateCartCountDisplay) {
        window.updateCartCountDisplay();
    }
};

// دالة لتعديل كمية المنتج في السلة
const updateQuantity = async (productId, change) => {
    let currentCart = window.userCart || [];
    const itemIndex = currentCart.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
        currentCart[itemIndex].quantity += change;
        if (currentCart[itemIndex].quantity <= 0) {
            currentCart.splice(itemIndex, 1); // إزالة إذا كانت الكمية صفر أو أقل
        }
        await window.updateAndSaveCart(currentCart); // حفظ التغيير في Firestore عبر auth.js
        renderCartItems(); // إعادة عرض السلة
    }
};

// دالة لتعديل الكمية مباشرة من حقل الإدخال
const updateQuantityDirect = async (productId, newQuantity) => {
    let currentCart = window.userCart || [];
    const itemIndex = currentCart.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
        if (newQuantity <= 0) {
            currentCart.splice(itemIndex, 1);
        } else {
            currentCart[itemIndex].quantity = newQuantity;
        }
        await window.updateAndSaveCart(currentCart); // حفظ التغيير في Firestore عبر auth.js
        renderCartItems();
    }
};

// دالة لإزالة منتج من السلة
const removeItem = async (productId) => {
    let currentCart = window.userCart || [];
    currentCart = currentCart.filter(item => item.id !== productId);
    await window.updateAndSaveCart(currentCart); // حفظ التغيير في Firestore عبر auth.js
    renderCartItems(); // إعادة عرض السلة
};

// دالة لإضافة منتج إلى السلة (يتم استدعاؤها من زر "أضف إلى السلة")
const addToCart = async (productId, productName, productPrice, productImage) => {
    if (!auth.currentUser) {
        alert('يرجى تسجيل الدخول أولاً لإضافة المنتجات إلى سلة المشتريات.');
        window.location.href = 'login.html';
        return;
    }

    let currentCart = window.userCart || [];
    const existingItemIndex = currentCart.findIndex(item => item.id === productId);

    if (existingItemIndex > -1) {
        currentCart[existingItemIndex].quantity += 1;
    } else {
        currentCart.push({
            id: productId,
            name: productName,
            price: productPrice,
            image: productImage,
            quantity: 1
        });
    }

    await window.updateAndSaveCart(currentCart); // حفظ السلة المحدثة إلى Firestore
    alert(`${productName} تم إضافته إلى السلة!`);
};

// --- وظائف فتح/إغلاق Modal ---
const openCartModal = () => {
    if (!auth.currentUser) {
        alert('يرجى تسجيل الدخول أولاً لعرض سلة المشتريات.');
        window.location.href = 'login.html';
        return;
    }
    renderCartItems(); // عرض المنتجات قبل فتح المودال
    cartModalOverlay.classList.add('open');
};

const closeCartModal = () => {
    cartModalOverlay.classList.remove('open');
};

// --- وظيفة تأكيد الطلب (Checkout) ---
const checkout = async () => {
    if (!auth.currentUser) {
        alert('يرجى تسجيل الدخول لتأكيد طلبك.');
        window.location.href = 'login.html';
        return;
    }
    if (window.userCart.length === 0) {
        alert('سلة المشتريات فارغة لا يمكن تأكيد طلب فارغ.');
        return;
    }

    const confirmOrder = confirm('هل أنت متأكد من تأكيد هذا الطلب؟');
    if (!confirmOrder) return;

    try {
        const orderData = {
            userId: auth.currentUser.uid,
            customerEmail: auth.currentUser.email,
            items: window.userCart,
            totalAmount: parseFloat(cartTotalSpan.textContent),
            status: 'Pending', // حالة الطلب الأولية
            timestamp: Timestamp.now() // وقت إنشاء الطلب
        };

        // إضافة الطلب إلى مجموعة 'orders' في Firestore
        await setDoc(doc(collection(db, "orders")), orderData); // هنا يتم إضافة الطلب إلى Firestore
        
        alert('تم تأكيد طلبك بنجاح! سيتم مراجعته قريباً.');

        // مسح السلة بعد تأكيد الطلب
        await window.updateAndSaveCart([]); // قم بمسح السلة في Firestore والواجهة
        closeCartModal(); // إغلاق المودال
        
    } catch (error) {
        console.error("Error processing order:", error);
        alert('حدث خطأ أثناء تأكيد طلبك: ' + error.message);
    }
};

// --- دالة عرض المنتجات في الصفحة الرئيسية (renderProductsPublic) ---
const renderProductsPublic = async () => {
    const productsListContainer = document.getElementById('public-products-list');
    if (!productsListContainer) return;

    productsListContainer.innerHTML = '<p class="text-center text-gray-600">جاري تحميل المنتجات...</p>';

    try {
        const productsSnapshot = await getDocs(collection(db, "products"));
        
        if (productsSnapshot.empty) {
            productsListContainer.innerHTML = '<p class="text-center text-gray-600">لا توجد منتجات لعرضها حالياً.</p>';
            return;
        }

        productsListContainer.innerHTML = '';

        productsSnapshot.forEach(docSnap => {
            const product = docSnap.data();
            const productId = docSnap.id;

            const productCard = document.createElement('div');
            productCard.className = 'product-card glass-effect fade-in p-6 rounded-lg text-center';
            productCard.innerHTML = `
                <img src="${product.image || 'https://via.placeholder.com/200'}" alt="${product.name}" class="w-full h-48 object-cover rounded-lg mb-4">
                <h3 class="text-xl font-bold text-accent mb-2">${product.name}</h3>
                <p class="text-gray-700 text-lg mb-4">${product.price ? product.price.toFixed(2) : 'N/A'} د.أ</p>
                <button data-product-id="${productId}"
                        data-product-name="${product.name}"
                        data-product-price="${product.price}"
                        data-product-image="${product.image || ''}"
                        class="add-to-cart-btn cta-button text-lg w-full">أضف إلى السلة</button>
            `;
            productsListContainer.appendChild(productCard);
        });

        // ربط أحداث النقر لأزرار "أضف إلى السلة"
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                const productName = e.target.dataset.productName;
                const productPrice = parseFloat(e.target.dataset.productPrice);
                const productImage = e.target.dataset.productImage;
                addToCart(productId, productName, productPrice, productImage);
            });
        });

    } catch (error) {
        console.error("Error fetching public products:", error);
        productsListContainer.innerHTML = '<p class="text-center text-red-600">حدث خطأ أثناء تحميل المنتجات.</p>';
    }
};


// --- ربط الأحداث الرئيسية عند تحميل DOM ---
document.addEventListener('DOMContentLoaded', () => {
    // استدعاء عرض المنتجات في الصفحة الرئيسية
    if (document.getElementById('public-products-list')) {
        renderProductsPublic();
    }

    // ربط أيقونة السلة في الهيدر لفتح Modal
    const cartIconHeader = document.getElementById('cart-icon-container');
    if (cartIconHeader) {
        cartIconHeader.addEventListener('click', openCartModal);
    }
    // ربط أيقونة السلة في قائمة الجوال لفتح Modal
    const mobileCartIcon = document.getElementById('mobile-cart-icon-container');
    if (mobileCartIcon) {
        mobileCartIcon.addEventListener('click', openCartModal);
    }

    // ربط زر إغلاق الـ Modal
    if (cartModalCloseBtn) {
        cartModalCloseBtn.addEventListener('click', closeCartModal);
    }
    // ربط زر تأكيد الطلب (Checkout)
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
});