import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            displayUserOrders(user.uid);
        } else {
            window.location.href = 'login-user.html';
        }
    });

    // إضافة وظيفة لزر الخروج في هذه الصفحة أيضاً
    const logoutBtn = document.getElementById('logout-btn-main');
    logoutBtn?.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });
});

async function displayUserOrders(userId) {
    const ordersListContainer = document.getElementById('my-orders-list');
    if (!ordersListContainer) return;
    
    ordersListContainer.innerHTML = '<p class="text-center text-gray-500">جاري تحميل طلباتك...</p>';
    
    // بناء الاستعلام: جلب الطلبات التي تطابق "userId" الخاص بالمستخدم الحالي فقط
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        ordersListContainer.innerHTML = '<p class="text-center text-xl text-gray-600">ليس لديك أي طلبات سابقة.</p>';
        return;
    }
    
    ordersListContainer.innerHTML = '';
    querySnapshot.forEach(doc => {
        const order = doc.data();
        const orderDate = order.createdAt.toDate().toLocaleDateString('ar-EG');

        // تحديد لون حالة الطلب
        let statusColorClass = 'bg-gray-400'; // افتراضي
        if (order.status === 'قيد التجهيز') statusColorClass = 'bg-yellow-400';
        if (order.status === 'مع شركة التوصيل') statusColorClass = 'bg-blue-400';
        if (order.status === 'تم التوصيل') statusColorClass = 'bg-green-500';

        const itemsHtml = order.items.map(item => `<li>- ${item.name}</li>`).join('');

        const orderCard = document.createElement('div');
        orderCard.className = 'glass-effect p-6 rounded-xl shadow-md';
        orderCard.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <p class="text-sm text-gray-600">تاريخ الطلب: ${orderDate}</p>
                    <p class="text-xl font-bold">${order.totalPrice.toFixed(2)} د.أ</p>
                </div>
                <div class="text-left">
                    <span class="text-white text-sm font-bold px-3 py-1 rounded-full ${statusColorClass}">
                        ${order.status}
                    </span>
                </div>
            </div>
            <div>
                <h4 class="font-semibold mb-1">المنتجات:</h4>
                <ul class="list-disc list-inside text-gray-700">${itemsHtml}</ul>
            </div>
        `;
        ordersListContainer.appendChild(orderCard);
    });
}