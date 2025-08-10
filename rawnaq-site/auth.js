import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc // لإضافة تحديث doc موجود
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// متغير لتخزين سلة المشتريات الحالية في الذاكرة (هذه هي النسخة التي سنتعامل معها)
let userCart = [];

// دالة لتحديث عدد المنتجات في سلة المشتريات في الواجهة
const updateCartCountDisplay = () => {
    const itemCount = userCart.reduce((total, item) => total + item.quantity, 0);

    const cartCountDesktop = document.getElementById('cart-count');
    if (cartCountDesktop) {
        cartCountDesktop.textContent = itemCount;
    }

    const cartCountMobile = document.getElementById('cart-count-mobile');
    if (cartCountMobile) {
        cartCountMobile.textContent = itemCount;
    }
};

// دالة لحفظ سلة المشتريات في Firestore
const saveCartToFirestore = async (uid) => {
    if (!uid) return;
    try {
        const cartRef = doc(db, "carts", uid);
        await setDoc(cartRef, { items: userCart }); // استخدام setDoc لكتابة السلة بالكامل
        console.log("Cart saved to Firestore successfully!");
    } catch (error) {
        console.error("Error saving cart to Firestore:", error);
    }
};

// دالة لتحميل سلة المشتريات من Firestore
const loadCartFromFirestore = async (uid) => {
    if (!uid) {
        userCart = []; // مسح السلة إذا لم يكن هناك مستخدم
        updateCartCountDisplay();
        return;
    }
    try {
        const cartRef = doc(db, "carts", uid);
        const cartSnap = await getDoc(cartRef);
        if (cartSnap.exists()) {
            userCart = cartSnap.data().items || [];
            console.log("Cart loaded from Firestore:", userCart);
        } else {
            userCart = []; // سلة فارغة إذا لم تكن موجودة
            console.log("No cart found in Firestore for this user.");
        }
        updateCartCountDisplay(); // تحديث الواجهة بعد التحميل
    } catch (error) {
        console.error("Error loading cart from Firestore:", error);
        userCart = []; // في حالة الخطأ، اجعل السلة فارغة
    }
};

// دالة لتحديث السلة وإرسالها إلى Firestore (للاستخدام من main.js)
const updateAndSaveCart = async (newCart) => {
    userCart = newCart;
    updateCartCountDisplay();
    if (auth.currentUser) {
        await saveCartToFirestore(auth.currentUser.uid);
    }
};

// جعل وظائف السلة متاحة عالمياً لـ main.js
window.updateCartCountDisplay = updateCartCountDisplay;
window.updateAndSaveCart = updateAndSaveCart;
window.userCart = userCart; // يمكن لـ main.js الوصول إلى نسخة السلة هذه

// دالة تسجيل الدخول باستخدام جوجل
const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: 'user', // دور افتراضي لمستخدم جوجل الجديد
                createdAt: new Date(),
            });
            console.log('New Google user added to Firestore.');
        } else {
            console.log('Existing Google user logged in.');
        }
        // onAuthStateChanged سيتكفل بالتوجيه وتحميل السلة
    } catch (error) {
        console.error("Error during Google Sign-In:", error);
        alert('حدث خطأ أثناء تسجيل الدخول بحساب جوجل: ' + error.message);
    }
};

// دالة تسجيل الدخول بالإيميل وكلمة المرور
const signInWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User signed in with email:', user.email);
        // onAuthStateChanged سيتكفل بالتوجيه وتحميل السلة
    } catch (error) {
        console.error("Error during Email Sign-In:", error);
        alert('خطأ في تسجيل الدخول: ' + error.message);
    }
};


document.addEventListener('DOMContentLoaded', () => {
  const userActionsDiv = document.getElementById('user-actions'); // لـ index.html
  const adminHeaderControlsDiv = document.getElementById('admin-header-controls'); // لـ admin.html
  const mobileMenu = document.getElementById('mobile-menu'); // قائمة الجوال في index.html
  const cartIconContainer = document.getElementById('cart-icon-container'); // أيقونة السلة في index.html

  // التعامل مع صفحة login.html (النماذج والأزرار فيها)
  const loginForm = document.getElementById('login-form');
  const googleLoginBtnPage = document.getElementById('google-login-btn'); // زر جوجل في login.html

  if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = document.getElementById('login-email').value;
          const password = document.getElementById('login-password').value;
          signInWithEmail(email, password);
      });
  }
  if (googleLoginBtnPage) {
      googleLoginBtnPage.addEventListener('click', signInWithGoogle);
  }


  // مستمع حالة المصادقة (مهم جداً لجميع الصفحات)
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // المستخدم مسجل الدخول
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      let userRole = 'user'; // الدور الافتراضي
      if (userDocSnap.exists()) {
        userRole = userDocSnap.data().role || 'user';
        // فحص الحظر
        const bannedUntil = userDocSnap.data().bannedUntil;
        if (bannedUntil) {
            const banDate = bannedUntil.toDate ? bannedUntil.toDate() : new Date(bannedUntil);
            if (banDate > new Date()) {
                alert('تم حظرك حتى: ' + banDate.toLocaleDateString('ar-EG'));
                await signOut(auth);
                if (window.location.pathname.includes('admin.html')) {
                    return window.location.href = 'login.html';
                }
                return;
            }
        }
      }

      // ----------------------------------------------------
      // منطق التوجيه التلقائي بعد تسجيل الدخول (يعمل على login.html / signup.html)
      // ----------------------------------------------------
      if (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) {
          if (userRole === 'admin' || userRole === 'superadmin') {
              window.location.href = 'admin.html'; // توجيه المسؤولين للوحة التحكم
          } else {
              window.location.href = 'index.html'; // توجيه المستخدمين العاديين للصفحة الرئيسية
          }
          return; // أوقف تنفيذ باقي الكود لمنع أي تداخل
      }

      // تحميل سلة المشتريات من Firestore عند تسجيل الدخول
      await loadCartFromFirestore(user.uid);


      // ----------------------------------------------------
      // تحديث أزرار الهيدر في index.html
      // ----------------------------------------------------
      if (userActionsDiv) { // تأكد أن العنصر موجود (نحن في index.html)
        let indexHeaderHtml = '';

        // زر "لوحة التحكم" يظهر فقط للمسؤولين في الهيدر الرئيسي
        if (userRole === 'admin' || userRole === 'superadmin') {
            indexHeaderHtml += `<a href="admin.html" id="admin-dashboard-link" class="cta-button text-lg">لوحة التحكم</a>`;
        }

        // اسم المستخدم + زر تسجيل الخروج (للجميع)
        indexHeaderHtml += `
            <span class="font-semibold text-gray-800">${user.email.split('@')[0]}</span>
            <button id="logout-btn-header" class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition">
              تسجيل الخروج
            </button>
        `;
        
        userActionsDiv.innerHTML = indexHeaderHtml;

        // ربط أحداث تسجيل الخروج لزر الهيدر
        const logoutBtnHeader = document.getElementById('logout-btn-header');
        if (logoutBtnHeader) {
            logoutBtnHeader.addEventListener('click', async (e) => {
                e.preventDefault();
                await signOut(auth);
                // عند تسجيل الخروج، تأكد من حفظ السلة الأخيرة (اختياري، قد لا تحتاجها هنا إذا تم الحفظ عند كل إضافة)
                // await saveCartToFirestore(user.uid); // لا تحتاجها هنا إذا تم الحفظ مع كل تحديث
                window.location.href = 'login.html';
            });
        }
      }

      // ----------------------------------------------------
      // عرض أيقونة سلة المشتريات (في index.html)
      // ----------------------------------------------------
      if (cartIconContainer) {
        cartIconContainer.innerHTML = `
          <div class="cart-icon-container">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span class="cart-item-count" id="cart-count">0</span>
          </div>
        `;
        cartIconContainer.style.display = 'block'; // تأكد من إظهار الحاوية
        // تم تغيير هذا الربط لاستدعاء openCartModal من main.js
        cartIconContainer.removeEventListener('click', () => { /* old listener */ }); // إزالة المستمع القديم
        // المستمع الجديد سيتم إضافته في main.js
        updateCartCountDisplay(); // تحديث عداد السلة بعد التحميل
      }

      // ----------------------------------------------------
      // تحديث أزرار الهيدر في admin.html (لوحة التحكم)
      // ----------------------------------------------------
      if (adminHeaderControlsDiv) {
        let adminHeaderHtml = `
            <a href="index.html" id="view-site-link" class="cta-button text-lg">عرض الموقع</a>
            <span class="font-semibold text-gray-800">${user.email.split('@')[0]}</span>
            <button id="admin-logout-btn-header" class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition">
                تسجيل الخروج
            </button>
        `;
        adminHeaderControlsDiv.innerHTML = adminHeaderHtml;

        const viewSiteLink = document.getElementById('view-site-link');
        if (viewSiteLink) {
            viewSiteLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'index.html';
            });
        }

        const adminLogoutBtnHeader = document.getElementById('admin-logout-btn-header');
        if (adminLogoutBtnHeader) {
            adminLogoutBtnHeader.addEventListener('click', async () => {
                await signOut(auth);
                window.location.href = 'login.html';
            });
        }
      }


      // ----------------------------------------------------
      // تحديث قائمة الجوال (Mobile Menu)
      // ----------------------------------------------------
      if (mobileMenu) {
        let mobileMenuHtml = `
          <a href="index.html#products" class="block text-center py-3 text-lg hover:bg-gray-100">المنتجات</a>
          <a href="index.html#batches" class="block text-center py-3 text-lg hover:bg-gray-100">دفعتك</a>
          <a href="index.html#initiatives" class="block text-center py-3 text-lg hover:bg-gray-100">المبادرات</a>
          <a href="index.html#community" class="block text-center py-3 text-lg hover:bg-gray-100">المجتمع</a>
          <a href="index.html#membership" class="block text-center py-3 text-lg hover:bg-gray-100">الاشتراك</a>
          <a href="profile.html" class="block text-center py-3 text-lg hover:bg-gray-100">ملفي الشخصي</a>
          ${(userRole === 'admin' || userRole === 'superadmin') ?
              `<a href="admin.html" class="block text-center py-3 text-lg hover:bg-gray-100">لوحة التحكم</a>`
              : ''
          }
          <div class="cart-icon-container block text-center py-3 text-lg hover:bg-gray-100" id="mobile-cart-icon-container" style="justify-content: center; width: 100%;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span class="cart-item-count" id="cart-count-mobile">0</span>
          </div>
          <a href="#" id="logout-btn-mobile" class="block text-center py-3 text-lg hover:bg-gray-100 text-red-600">تسجيل الخروج</a>
        `;
        mobileMenu.innerHTML = mobileMenuHtml;

        // ربط حدث أيقونة السلة في قائمة الجوال
        // تم تغيير هذا الربط لاستدعاء openCartModal من main.js
        const mobileCartIcon = document.getElementById('mobile-cart-icon-container');
        if(mobileCartIcon) {
            mobileCartIcon.removeEventListener('click', () => { /* old listener */ });
            // المستمع الجديد سيتم إضافته في main.js
        }
        updateCartCountDisplay(); // تحديث عدد العناصر في السلة على الجوال
        const logoutBtnMobile = document.getElementById('logout-btn-mobile');
        if (logoutBtnMobile) {
            logoutBtnMobile.addEventListener('click', async (e) => {
                e.preventDefault();
                await signOut(auth);
                window.location.href = 'login.html';
            });
        }
      }


    } else {
      // المستخدم غير مسجل الدخول
      // ----------------------------------------------------
      // تحديث أزرار الهيدر في index.html
      // ----------------------------------------------------
      if (userActionsDiv && !window.location.pathname.includes('login.html')) {
        userActionsDiv.innerHTML = `
          <a href="login.html" class="cta-button text-lg">تسجيل الدخول</a>
        `;
      }
      // إخفاء أيقونة السلة إذا لم يكن المستخدم مسجلاً الدخول
      if (cartIconContainer) {
          cartIconContainer.innerHTML = ''; // إزالة أيقونة السلة
          cartIconContainer.style.display = 'none'; // إخفاء الحاوية تماماً
      }
      // مسح السلة من الذاكرة إذا لم يكن هناك مستخدم مسجل الدخول
      userCart = [];
      updateCartCountDisplay();


      // ----------------------------------------------------
      // تحديث أزرار الهيدر في admin.html (لا يجب أن تظهر هنا)
      // ----------------------------------------------------
      if (adminHeaderControlsDiv) {
        adminHeaderControlsDiv.innerHTML = `<div class="h-8 w-36 bg-gray-200/50 rounded-lg animate-pulse"></div>`;
      }


      // ----------------------------------------------------
      // تحديث قائمة الجوال (Mobile Menu) في index.html
      // ----------------------------------------------------
      if (mobileMenu && !window.location.pathname.includes('login.html')) {
        mobileMenu.innerHTML = `
          <a href="index.html#products" class="block text-center py-3 text-lg hover:bg-gray-100">المنتجات</a>
          <a href="index.html#batches" class="block text-center py-3 text-lg hover:bg-gray-100">دفعتك</a>
          <a href="index.html#initiatives" class="block text-center py-3 text-lg hover:bg-gray-100">المبادرات</a>
          <a href="index.html#community" class="block text-center py-3 text-lg hover:bg-gray-100">المجتمع</a>
          <a href="index.html#membership" class="block text-center py-3 text-lg hover:bg-gray-100">الاشتراك</a>
          <a href="login.html" class="block text-center py-3 text-lg hover:bg-gray-100 font-semibold text-accent">تسجيل الدخول</a>
        `;
      }
    }
  });

  // منطق زر قائمة الجوال في index.html (تظل كما هي)
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  if (mobileMenuButton) {
      mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
  }
});