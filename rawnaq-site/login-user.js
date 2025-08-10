import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// استهداف النموذج
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorDiv = document.getElementById('login-error'); // div لعرض الأخطاء

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // منع الإرسال التقليدي

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        // محاولة تسجيل الدخول
        await signInWithEmailAndPassword(auth, email, password);

        // التوجيه بعد النجاح
        window.location.href = "index.html";
    } catch (error) {
        // عرض الخطأ للمستخدم
        let message = "حدث خطأ!";

        switch (error.code) {
            case 'auth/user-not-found':
                message = 'هذا الحساب غير موجود.';
                break;
            case 'auth/wrong-password':
                message = 'كلمة المرور غير صحيحة.';
                break;
            case 'auth/invalid-email':
                message = 'البريد الإلكتروني غير صالح.';
                break;
            default:
                message = 'حدث خطأ أثناء تسجيل الدخول.';
        }

        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
});
