import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

let currentUser = null;
let productsCache = []; // لتخزين تفاصيل المنتجات

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            displayCart(user.uid);
        } else {
            alert("يجب عليك تسجيل الدخول لعرض سلة التسوق.");
            window.location.href = 'login-user.html';
        }
    });

    // إضافة وظيفة لزر إتمام الشراء
    const checkoutBtn = document.getElementById('checkout-btn');
    checkoutBtn?.addEventListener('click', handleCheckout);
});

async function displayCart(userId) {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    const totalPriceEl = document.getElementById('total-price');
    
    cartItemsContainer.innerHTML = '<p class="text-center text-gray-500">جاري تحميل السلة...</p>';

    try {
        // ١. جلب قائمة IDs المنتجات من سلة المستخدم
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error("User data not found!");
        
        const productIdsInCart = userSnap.data().cart || [];

        if (productIdsInCart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="text-center text-xl text-gray-600">سلة التسوق فارغة حاليًا.</p>';
            cartSummary.classList.add('hidden');
            return;
        }

        // ٢. جلب كل تفاصيل المنتجات من قاعدة البيانات (إذا لم تكن محملة مسبقًا)
        if (productsCache.length === 0) {
            const productsRef = collection(db, "products");
            const productsSnap = await getDocs(productsRef);
            productsCache = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // ٣. فلترة المنتجات الكاملة لتشمل فقط تلك الموجودة في السلة
        const cartProducts = productsCache.filter(product => productIdsInCart.includes(product.id));

        // ٤. عرض المنتجات في الصفحة وحساب السعر
        cartItemsContainer.innerHTML = '';
        let totalPrice = 0;

        cartProducts.forEach(product => {
            const itemElement = document.createElement('div');
            itemElement.className = 'glass-effect p-4 rounded-lg flex items-center justify-between';
            itemElement.innerHTML = `
                <div class="flex items-center gap-4">
                    <img src="${product.image}" alt="${product.name}" class="w-20 h-20 rounded-md object-cover">
                    <div>
                        <h3 class="text-xl font-bold">${product.name}</h3>
                        <p class="text-lg text-gray-700">${product.price} د.أ</p>
                    </div>
                </div>
                <button data-id="${product.id}" class="remove-from-cart-btn text-red-500 hover:text-red-700 font-bold p-2 rounded-full hover:bg-red-100">✕</button>
            `;
            cartItemsContainer.appendChild(itemElement);
            totalPrice += product.price;
        });
        
        // ٥. عرض ملخص السلة والسعر الإجمالي
        totalPriceEl.textContent = `${totalPrice.toFixed(2)} د.أ`;
        cartSummary.classList.remove('hidden');
        
        // ٦. إضافة وظيفة لأزرار الحذف
        document.querySelectorAll('.remove-from-cart-btn').forEach(btn => {
            btn.addEventListener('click', handleRemoveFromCart);
        });

    } catch (error) {
        console.error("Error displaying cart: ", error);
        cartItemsContainer.innerHTML = '<p class="text-center text-red-500">حدث خطأ أثناء تحميل السلة.</p>';
    }
}

async function handleRemoveFromCart(e) {
    if (!currentUser) return;
    const productId = e.target.dataset.id;
    const userRef = doc(db, "users", currentUser.uid);

    try {
        // استخدام arrayRemove لحذف العنصر من مصفوفة السلة
        await updateDoc(userRef, {
            cart: arrayRemove(productId)
        });
        // إعادة عرض السلة بعد الحذف
        displayCart(currentUser.uid);
    } catch (error) {
        console.error("Error removing from cart: ", error);
        alert("حدث خطأ أثناء إزالة المنتج.");
    }
}

async function handleCheckout() {
    if (!currentUser) return;

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    const productIdsInCart = userSnap.data().cart || [];

    if (productIdsInCart.length === 0) {
        alert("سلة التسوق فارغة!");
        return;
    }

    const cartProducts = productsCache.filter(p => productIdsInCart.includes(p.id));
    const totalPrice = cartProducts.reduce((sum, p) => sum + p.price, 0);

    // إنشاء طلب جديد في مجموعة "orders"
    try {
        await addDoc(collection(db, "orders"), {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            items: cartProducts, // حفظ نسخة كاملة من المنتجات في الطلب
            totalPrice: totalPrice,
            status: 'قيد التجهيز', // الحالة الأولية للطلب
            createdAt: serverTimestamp() // تاريخ إنشاء الطلب
        });

        // تفريغ سلة التسوق الخاصة بالمستخدم
        await updateDoc(userRef, {
            cart: []
        });
        
        alert("شكرًا لك! تم استلام طلبك بنجاح.");
        window.location.href = 'my-account.html'; // سيتم إنشاء هذه الصفحة لاحقًا
        
    } catch (error) {
        console.error("Error creating order: ", error);
        alert("حدث خطأ أثناء إنشاء الطلب.");
    }
}