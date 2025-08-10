import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  collection, getDocs, query, orderBy, doc, updateDoc,
  getDoc, addDoc, deleteDoc, where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
// لاحظ أنك ستحتاج إلى مكتبة Firebase Storage إذا كنت تخطط لرفع الصور
// import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

let selectedUserId = null;

document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        console.warn("User document not found or role not defined. Redirecting to login.");
        await signOut(auth);
        return window.location.href = 'login.html';
      }

      const userData = userDocSnap.data();
      const userRole = userData.role;

      const bannedUntil = userData.bannedUntil;
      if (bannedUntil) {
        const banDate = bannedUntil.toDate ? bannedUntil.toDate() : new Date(bannedUntil);
        if (banDate > new Date()) {
          alert('تم حظرك حتى: ' + banDate.toLocaleDateString('ar-EG'));
          await signOut(auth);
          return window.location.href = 'login.html';
        }
      }

      if (userRole === 'admin' || userRole === 'superadmin') {
        initializeDashboard(user, userRole);
      } else {
        alert('ليس لديك الصلاحيات الكافية للوصول إلى لوحة التحكم.');
        window.location.href = 'index.html';
      }
    } else {
      window.location.href = 'login.html';
    }
  });
});

function initializeDashboard(adminUser, adminRole) {
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarToggleMain = document.getElementById('sidebar-toggle-main');
  const sidebar = document.getElementById('sidebar');

  const toggleSidebar = () => {
    sidebar.classList.toggle('hidden-mobile'); // هذا الكلاس يتحكم في إخفاء/إظهار الشريط الجانبي في الجوال
  };

  sidebarToggle.addEventListener('click', toggleSidebar);
  sidebarToggleMain.addEventListener('click', toggleSidebar);

  // تحديث معلومات المستخدم في الهيدر الرئيسي
  const userActionsAdmin = document.getElementById('user-actions-admin');
  userActionsAdmin.innerHTML = `
    <span class="font-semibold text-gray-800">${adminUser.email.split('@')[0]}</span>
    <button id="admin-logout-btn-header" class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition">
      تسجيل الخروج
    </button>`;

  // حدث تسجيل الخروج من زر الهيدر
  document.getElementById('admin-logout-btn-header').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  });

  // حدث تسجيل الخروج من زر الشريط الجانبي
  document.getElementById('admin-logout-btn-sidebar').addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = 'login.html';
  });

  // إظهار رابط إدارة المستخدمين فقط لـ SuperAdmin
  if (adminRole === 'superadmin') {
    document.getElementById('users-nav-link').classList.remove('hidden');
  }

  // تهيئة الأقسام المختلفة
  setupOverview();
  setupOrders();
  setupProducts();
  setupEvents();
  if (adminRole === 'superadmin') {
    setupUserManagement();
  }

  // تبديل الأقسام عند النقر على روابط الشريط الجانبي
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // إخفاء جميع الأقسام وإعادة تعيين حالة الـ fade-in
      document.querySelectorAll('main > section').forEach(sec => {
          sec.classList.add('hidden');
          sec.classList.remove('fade-in'); // لإزالة الـ fade-in القديم
          // قد تحتاج لإعادة تعيين الـ opacity/transform يدويا هنا إذا كانت الـ fade-in لا تعمل بشكل متسق
          // sec.style.opacity = '0';
          // sec.style.transform = 'translateY(20px)';
      });

      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      const targetId = link.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);
      targetSection.classList.remove('hidden');
      targetSection.classList.add('fade-in'); // تطبيق الـ fade-in عند ظهور القسم
      link.classList.add('active');

      if (window.innerWidth < 1024) {
          toggleSidebar(); // إخفاء الشريط الجانبي بعد الاختيار على الجوال
      }
    });
  });

  // تعيين القسم الافتراضي (نظرة عامة) كنشط عند التحميل مع تطبيق الـ fade-in
  const defaultSection = document.getElementById('overview');
  defaultSection.classList.remove('hidden');
  defaultSection.classList.add('fade-in');
  document.querySelector('.sidebar-link[data-target="overview"]').classList.add('active');
}

// الأقسام (الوظائف الداخلية لم تتغير بشكل كبير، ولكن الستايلات والمحتوى سيتم حقنهما في الـ admin-content-card)
async function setupOverview() {
    const totalUsersEl = document.getElementById('total-users');
    const newOrdersEl = document.getElementById('new-orders');
    const activeProductsEl = document.getElementById('active-products');

    if (totalUsersEl) {
        const usersSnapshot = await getDocs(collection(db, "users"));
        totalUsersEl.textContent = usersSnapshot.size;
    }

    if (newOrdersEl) {
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        newOrdersEl.textContent = ordersSnapshot.size;
    }

    if (activeProductsEl) {
        const productsSnapshot = await getDocs(collection(db, "products"));
        activeProductsEl.textContent = productsSnapshot.size;
    }
}

async function setupOrders() {
    const ordersListContainer = document.getElementById('ordersListAdmin');
    ordersListContainer.innerHTML = '<p class="text-gray-600">جاري تحميل الطلبات...</p>';

    try {
        const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            ordersListContainer.innerHTML = '<p class="text-gray-600">لا توجد طلبات حالياً.</p>';
            return;
        }

        let ordersHtml = `<div class="admin-table-container overflow-x-auto">
                            <table class="admin-table w-full text-sm">
                                <thead>
                                    <tr>
                                        <th>معرف الطلب</th>
                                        <th>العميل</th>
                                        <th>الإجمالي</th>
                                        <th>الحالة</th>
                                        <th>التاريخ</th>
                                        <th>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>`;

        querySnapshot.forEach(docSnap => {
            const order = docSnap.data();
            const orderId = docSnap.id;
            const orderDate = order.timestamp ? new Date(order.timestamp.seconds * 1000).toLocaleString('ar-EG') : 'غير معروف';
            const orderStatus = order.status || 'معلق';

            ordersHtml += `
                <tr>
                    <td>${orderId.substring(0, 8)}...</td>
                    <td>${order.customerEmail || 'غير متاح'}</td>
                    <td>${order.totalAmount ? order.totalAmount.toFixed(2) : '0.00'} د.أ</td>
                    <td><span class="px-2 py-1 rounded-full text-xs font-semibold ${orderStatus === 'Shipped' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${orderStatus}</span></td>
                    <td>${orderDate}</td>
                    <td class="flex gap-2">
                        <button data-id="${orderId}" class="view-order-btn bg-blue-500 text-white px-3 py-1 rounded">عرض</button>
                        <button data-id="${orderId}" class="mark-shipped-btn bg-purple-500 text-white px-3 py-1 rounded">شحن</button>
                    </td>
                </tr>
            `;
        });
        ordersHtml += `</tbody></table></div>`;
        ordersListContainer.innerHTML = ordersHtml;

        document.querySelectorAll('.view-order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                alert('عرض تفاصيل الطلب: ' + e.target.dataset.id);
            });
        });

        document.querySelectorAll('.mark-shipped-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderIdToUpdate = e.target.dataset.id;
                if (confirm('هل أنت متأكد من تغيير حالة الطلب إلى "تم الشحن"؟')) {
                    await updateDoc(doc(db, "orders", orderIdToUpdate), { status: "Shipped" });
                    alert('تم تحديث حالة الطلب إلى "تم الشحن".');
                    setupOrders();
                }
            });
        });

    } catch (error) {
        console.error("Error fetching orders: ", error);
        ordersListContainer.innerHTML = '<p class="text-red-600">حدث خطأ أثناء تحميل الطلبات.</p>';
    }
}

function setupProducts() {
  const section = document.getElementById('products');
  section.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-semibold text-accent">إدارة المنتجات</h3>
      <button id="addProductBtn" class="cta-button">إضافة منتج</button>
    </div>
    <div id="productsListAdmin" class="space-y-4"></div>`;

  const modal = document.getElementById('productModal');
  const form = document.getElementById('productForm');
  const productsListContainer = document.getElementById('productsListAdmin');
  let editingProductId = null;

  document.getElementById('addProductBtn').addEventListener('click', () => {
    modal.classList.remove('hidden');
    form.reset();
    document.getElementById('currentProductImage').classList.add('hidden').src = '';
    editingProductId = null;
  });

  document.getElementById('cancelProductBtn').addEventListener('click', () => modal.classList.add('hidden'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const imageInput = document.getElementById('productImage');
    const imageFile = imageInput.files[0];
    let imageUrl = document.getElementById('currentProductImage').src;

    if (imageFile) {
        // هنا يجب إضافة منطق رفع الصورة إلى Firebase Storage
        imageUrl = URL.createObjectURL(imageFile);
        alert('تنبيه: وظيفة رفع الصور إلى Firebase Storage تحتاج إلى تطبيق كامل هنا.');
    }

    if (editingProductId) {
      await updateDoc(doc(db, "products", editingProductId), { name, price, image: imageUrl });
      alert('تم تحديث المنتج بنجاح!');
    } else {
      await addDoc(collection(db, "products"), { name, price, image: imageUrl });
      alert('تم إضافة المنتج بنجاح!');
    }

    modal.classList.add('hidden');
    renderProducts();
  });

  async function renderProducts() {
    productsListContainer.innerHTML = '<p class="text-gray-600">جاري تحميل المنتجات...</p>';
    const q = query(collection(db, "products"), orderBy("name"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      productsListContainer.innerHTML = '<p class="text-gray-600">لا توجد منتجات حالياً.</p>';
      return;
    }

    let productsHtml = `<div class="admin-table-container overflow-x-auto">
                            <table class="admin-table w-full text-sm">
                                <thead>
                                    <tr>
                                        <th>صورة</th>
                                        <th>اسم المنتج</th>
                                        <th>السعر</th>
                                        <th>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>`;
    snapshot.forEach(docSnap => {
      const product = docSnap.data();
      const productId = docSnap.id;
      productsHtml += `
        <tr>
            <td><img src="${product.image || 'https://via.placeholder.com/60'}" alt="${product.name}" class="w-12 h-12 object-cover rounded-md border border-gray-200"></td>
            <td class="font-bold">${product.name}</td>
            <td>${product.price ? product.price.toFixed(2) : 'N/A'} د.أ</td>
            <td class="flex gap-2">
              <button data-id="${productId}" class="edit-product-btn bg-blue-500 text-white px-3 py-1 rounded">تعديل</button>
              <button data-id="${productId}" class="delete-product-btn bg-red-500 text-white px-3 py-1 rounded">حذف</button>
            </td>
        </tr>`;
    });
    productsHtml += `</tbody></table></div>`;
    productsListContainer.innerHTML = productsHtml;

    document.querySelectorAll('.edit-product-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        editingProductId = e.target.dataset.id;
        const productDoc = await getDoc(doc(db, "products", editingProductId));
        if (productDoc.exists()) {
          const productData = productDoc.data();
          document.getElementById('productName').value = productData.name;
          document.getElementById('productPrice').value = productData.price;
          const currentImage = document.getElementById('currentProductImage');
          if (productData.image) {
            currentImage.src = productData.image;
            currentImage.classList.remove('hidden');
          } else {
            currentImage.classList.add('hidden');
          }
          modal.classList.remove('hidden');
        }
      });
    });

    document.querySelectorAll('.delete-product-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productIdToDelete = e.target.dataset.id;
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
          await deleteDoc(doc(db, "products", productIdToDelete));
          alert('تم حذف المنتج بنجاح!');
          renderProducts();
        }
      });
    });
  }

  renderProducts();
}

function setupEvents() {
  const section = document.getElementById('events');
  section.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-semibold text-accent">إدارة الفعاليات</h3>
      <button id="addEventBtn" class="cta-button">إضافة فعالية</button>
    </div>
    <div id="eventsListAdmin" class="space-y-4"></div>`;

  const modal = document.getElementById('eventModal');
  const form = document.getElementById('eventForm');
  const eventsListContainer = document.getElementById('eventsListAdmin');
  let editingEventId = null;

  document.getElementById('addEventBtn').addEventListener('click', () => {
    modal.classList.remove('hidden');
    form.reset();
    document.getElementById('currentEventImage').classList.add('hidden').src = '';
    editingEventId = null;
  });

  document.getElementById('cancelEventBtn').addEventListener('click', () => modal.classList.add('hidden'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const imageInput = document.getElementById('eventImage');
    const imageFile = imageInput.files[0];
    let imageUrl = document.getElementById('currentEventImage').src;

    if (imageFile) {
        // هنا يجب إضافة منطق رفع الصورة إلى Firebase Storage
        imageUrl = URL.createObjectURL(imageFile);
        alert('تنبيه: وظيفة رفع الصور إلى Firebase Storage تحتاج إلى تطبيق كامل هنا.');
    }

    if (editingEventId) {
      await updateDoc(doc(db, "events", editingEventId), { title, description, image: imageUrl });
      alert('تم تحديث الفعالية بنجاح!');
    } else {
      await addDoc(collection(db, "events"), { title, description, image: imageUrl });
      alert('تم إضافة الفعالية بنجاح!');
    }

    modal.classList.add('hidden');
    renderEvents();
  });

  async function renderEvents() {
    eventsListContainer.innerHTML = '<p class="text-gray-600">جاري تحميل الفعاليات...</p>';
    const q = query(collection(db, "events"), orderBy("title"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      eventsListContainer.innerHTML = '<p class="text-gray-600">لا توجد فعاليات حالياً.</p>';
      return;
    }

    let eventsHtml = `<div class="admin-table-container overflow-x-auto">
                        <table class="admin-table w-full text-sm">
                            <thead>
                                <tr>
                                    <th>صورة</th>
                                    <th>العنوان</th>
                                    <th>الوصف</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>`;
    snapshot.forEach(docSnap => {
      const event = docSnap.data();
      const eventId = docSnap.id;
      eventsHtml += `
        <tr>
            <td><img src="${event.image || 'https://via.placeholder.com/60'}" alt="${event.title}" class="w-12 h-12 object-cover rounded-md border border-gray-200"></td>
            <td class="font-bold">${event.title}</td>
            <td>${event.description.substring(0, 100)}...</td>
            <td class="flex gap-2">
              <button data-id="${eventId}" class="edit-event-btn bg-blue-500 text-white px-3 py-1 rounded">تعديل</button>
              <button data-id="${eventId}" class="delete-event-btn bg-red-500 text-white px-3 py-1 rounded">حذف</button>
            </td>
        </tr>`;
    });
    eventsHtml += `</tbody></table></div>`;
    eventsListContainer.innerHTML = eventsHtml;

    document.querySelectorAll('.edit-event-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        editingEventId = e.target.dataset.id;
        const eventDoc = await getDoc(doc(db, "events", editingEventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          document.getElementById('eventTitle').value = eventData.title;
          document.getElementById('eventDescription').value = eventData.description;
          const currentImage = document.getElementById('currentEventImage');
          if (eventData.image) {
            currentImage.src = eventData.image;
            currentImage.classList.remove('hidden');
          } else {
            currentImage.classList.add('hidden');
          }
          modal.classList.remove('hidden');
        }
      });
    });

    document.querySelectorAll('.delete-event-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const eventIdToDelete = e.target.dataset.id;
        if (confirm('هل أنت متأكد من حذف هذه الفعالية؟')) {
          await deleteDoc(doc(db, "events", eventIdToDelete));
          alert('تم حذف الفعالية بنجاح!');
          renderEvents();
        }
      });
    });
  }

  renderEvents();
}

function setupUserManagement() {
  const section = document.getElementById('users');
  section.innerHTML = `
    <h3 class="text-xl font-semibold mb-4 text-accent">إدارة المستخدمين والمدراء</h3>
    <div class="flex flex-col md:flex-row gap-4 mb-4">
      <input type="email" id="user-search-email" class="form-input flex-grow p-2 rounded" placeholder="ابحث بالبريد الإلكتروني...">
      <button id="user-search-btn" class="cta-button p-2 rounded">بحث</button>
    </div>
    <div id="usersList" class="space-y-4"></div>`;

  const userSearchBtn = document.getElementById('user-search-btn');
  const userSearchEmail = document.getElementById('user-search-email');
  const usersListContainer = document.getElementById('usersList');

  userSearchBtn.addEventListener('click', async () => {
    const email = userSearchEmail.value.trim();
    if (!email) {
      usersListContainer.innerHTML = '<p class="text-red-500">الرجاء إدخال بريد إلكتروني للبحث.</p>';
      return;
    }
    usersListContainer.innerHTML = '<p class="text-gray-600">جاري البحث...</p>';
    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        usersListContainer.innerHTML = '<p class="text-gray-600">لم يتم العثور على مستخدم بهذا البريد الإلكتروني.</p>';
        return;
      }

      let usersHtml = `<div class="admin-table-container overflow-x-auto">
                        <table class="admin-table w-full text-sm">
                            <thead>
                                <tr>
                                    <th>البريد الإلكتروني</th>
                                    <th>الدور</th>
                                    <th>الحالة</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>`;
      snapshot.forEach(docSnap => {
        const user = docSnap.data();
        const userId = docSnap.id;
        const bannedUntilDate = user.bannedUntil ? (user.bannedUntil.toDate ? user.bannedUntil.toDate() : new Date(user.bannedUntil)) : null;
        const bannedText = bannedUntilDate && bannedUntilDate > new Date() ? `محظور حتى ${bannedUntilDate.toLocaleDateString('ar-EG')}` : 'غير محظور';
        const bannedClass = bannedUntilDate && bannedUntilDate > new Date() ? 'text-red-600 font-semibold' : '';


        usersHtml += `
          <tr>
              <td>${user.email}</td>
              <td><span class="px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' : user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}">${user.role || 'مستخدم عادي'}</span></td>
              <td class="${bannedClass}">${bannedText}</td>
              <td class="flex gap-2 flex-wrap justify-end">
                <button data-id="${userId}" class="make-admin-btn bg-green-500 text-white px-3 py-1 rounded">ترقية لمدير</button>
                <button data-id="${userId}" class="remove-admin-btn bg-red-500 text-white px-3 py-1 rounded">إزالة صلاحيات</button>
                <button data-id="${userId}" class="ban-user-btn bg-yellow-500 text-white px-3 py-1 rounded">حظر</button>
                <button data-id="${userId}" class="unban-user-btn bg-gray-500 text-white px-3 py-1 rounded">إلغاء الحظر</button>
              </td>
          </tr>`;
      });
      usersHtml += `</tbody></table></div>`;
      usersListContainer.innerHTML = usersHtml;


      document.querySelectorAll('.make-admin-btn').forEach(btn =>
        btn.addEventListener('click', e => updateUserRole(e.target.dataset.id, 'admin')));
      document.querySelectorAll('.remove-admin-btn').forEach(btn =>
        btn.addEventListener('click', e => updateUserRole(e.target.dataset.id, 'user')));
      document.querySelectorAll('.ban-user-btn').forEach(btn =>
        btn.addEventListener('click', e => {
          selectedUserId = e.target.dataset.id;
          document.getElementById('banModal').classList.remove('hidden');
        }));
      document.querySelectorAll('.unban-user-btn').forEach(btn =>
        btn.addEventListener('click', e => unbanUser(e.target.dataset.id)));

    } catch (error) {
      console.error("Error searching user: ", error);
      usersListContainer.innerHTML = '<p class="text-red-600">حدث خطأ أثناء البحث عن المستخدم.</p>';
    }
  });

  async function updateUserRole(userId, newRole) {
    if (userId === auth.currentUser.uid) {
      alert('لا يمكنك تغيير صلاحيات نفسك.');
      return;
    }
    if (confirm(`هل أنت متأكد من تغيير صلاحيات المستخدم إلى "${newRole}"؟`)) {
      try {
        await updateDoc(doc(db, "users", userId), { role: newRole });
        alert('تم تحديث صلاحيات المستخدم بنجاح!');
        userSearchBtn.click();
      } catch (error) {
        console.error("Error updating user role: ", error);
        alert('حدث خطأ أثناء تحديث صلاحيات المستخدم.');
      }
    }
  }

  async function unbanUser(userId) {
    if (confirm('هل أنت متأكد من إلغاء حظر هذا المستخدم؟')) {
      try {
        await updateDoc(doc(db, "users", userId), { bannedUntil: null });
        alert('تم إلغاء الحظر بنجاح!');
        userSearchBtn.click();
      } catch (error) {
        console.error("Error unbanning user: ", error);
        alert('حدث خطأ أثناء إلغاء الحظر.');
      }
    }
  }

  document.getElementById('cancelBanBtn').addEventListener('click', () => {
    document.getElementById('banModal').classList.add('hidden');
    selectedUserId = null;
    document.getElementById('banDuration').value = '';
  });

  document.getElementById('confirmBanBtn').addEventListener('click', async () => {
    const days = parseInt(document.getElementById('banDuration').value);
    if (isNaN(days) || days <= 0) {
      alert('يرجى إدخال عدد أيام صالح للحظر.');
      return;
    }
    if (!selectedUserId) {
        alert('لم يتم تحديد مستخدم للحظر.');
        return;
    }

    if (selectedUserId === auth.currentUser.uid) {
        alert('لا يمكنك حظر نفسك.');
        document.getElementById('banModal').classList.add('hidden');
        selectedUserId = null;
        return;
    }

    const untilDate = new Date(Date.now() + days * 86400000);
    try {
      await updateDoc(doc(db, "users", selectedUserId), { bannedUntil: untilDate });
      alert(`تم حظر المستخدم بنجاح لمدة ${days} أيام.`);
      document.getElementById('banModal').classList.add('hidden');
      document.getElementById('banDuration').value = '';
      userSearchBtn.click();
    } catch (error) {
      console.error("Error banning user: ", error);
      alert('حدث خطأ أثناء حظر المستخدم.');
    } finally {
        selectedUserId = null;
    }
  });
}