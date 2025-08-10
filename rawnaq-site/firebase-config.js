// استيراد الدوال اللازمة من حزمة Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// إعدادات Firebase الخاصة بمشروعك
// تأكد من أن هذه البيانات مطابقة للموجودة في حسابك
const firebaseConfig = {
    apiKey: "AIzaSyDOkvz5A5gOSBb7WuFIv7FDtqDHvt8fgwk",
    authDomain: "rawnak-6861b.firebaseapp.com",
    projectId: "rawnak-6861b",
    storageBucket: "rawnak-6861b.appspot.com",
    messagingSenderId: "113857573863",
    appId: "1:113857573863:web:5bd0abfa769274a7e60342",
    measurementId: "G-NCNNS15E84"
};

// تهيئة تطبيق Firebase
const app = initializeApp(firebaseConfig);

// تهيئة الخدمات التي سنستخدمها (المصادقة وقاعدة البيانات) وتصديرها لتكون متاحة لباقي الملفات
export const auth = getAuth(app);
export const db = getFirestore(app);