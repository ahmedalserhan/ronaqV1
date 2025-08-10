document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    if (localStorage.getItem('loggedIn') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // --- Logout functionality ---
    document.getElementById('logoutButton').addEventListener('click', () => {
        localStorage.removeItem('loggedIn');
        window.location.href = 'index.html'; // تم التعديل هنا ليعود إلى الصفحة الرئيسية
    });
    document.getElementById('logoutButtonMobile').addEventListener('click', () => {
        localStorage.removeItem('loggedIn');
        window.location.href = 'index.html'; // تم التعديل هنا ليعود إلى الصفحة الرئيسية
    });

    // --- Mobile menu toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        if (mobileMenu.classList.contains('open')) {
          mobileMenu.style.maxHeight = '0';
          mobileMenu.style.opacity = '0';
          mobileMenu.addEventListener('transitionend', function handler() {
            mobileMenu.classList.remove('open');
            mobileMenu.removeEventListener('transitionend', handler);
          });
        } else {
          mobileMenu.classList.add('open');
          setTimeout(() => {
            mobileMenu.style.maxHeight = mobileMenu.scrollHeight + 'px';
            mobileMenu.style.opacity = '1';
          }, 10);
        }
      });
    }

    // --- Smooth scroll for navigation links ---
    document.querySelectorAll('nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                // Close mobile menu after clicking a link
                if (mobileMenu.classList.contains('open')) {
                    mobileMenu.style.maxHeight = '0';
                    mobileMenu.style.opacity = '0';
                    mobileMenu.addEventListener('transitionend', function handler() {
                        mobileMenu.classList.remove('open');
                        mobileMenu.removeEventListener('transitionend', handler);
                    });
                }
            }
        });
    });

    // --- Product Management ---
    const productsList = document.getElementById('productsList');
    const addProductBtn = document.getElementById('addProductBtn');
    const productModal = document.getElementById('productModal');
    const productModalTitle = document.getElementById('productModalTitle');
    const productForm = document.getElementById('productForm');
    const productNameInput = document.getElementById('productName');
    const productPriceInput = document.getElementById('productPrice');
    const productImageInput = document.getElementById('productImage');
    const currentProductImage = document.getElementById('currentProductImage');
    const cancelProductBtn = document.getElementById('cancelProductBtn');

    let products = JSON.parse(localStorage.getItem('products')) || [];
    let editingProductIndex = -1; // -1 for new product, index for editing

    function saveProducts() {
        localStorage.setItem('products', JSON.stringify(products));
        renderProducts();
    }

    function renderProducts() {
        productsList.innerHTML = '';
        if (products.length === 0) {
            productsList.innerHTML = '<p class="text-gray-600 text-center col-span-full">لا توجد منتجات حاليًا. اضغط "إضافة منتج جديد" لإضافة منتجك الأول.</p>';
            return;
        }
        products.forEach((product, index) => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover rounded-lg mb-4">
                <h3 class="text-xl font-bold mb-2">${product.name}</h3>
                <p class="text-lg text-gray-700 mb-4">${product.price} دينار</p>
                <div class="flex gap-4">
                    <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition edit-product-btn" data-index="${index}">تعديل</button>
                    <button class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition delete-product-btn" data-index="${index}">حذف</button>
                </div>
            `;
            productsList.appendChild(productCard);
        });

        document.querySelectorAll('.edit-product-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                editingProductIndex = index;
                const product = products[index];
                productModalTitle.textContent = 'تعديل المنتج';
                productNameInput.value = product.name;
                productPriceInput.value = product.price;
                currentProductImage.src = product.image;
                currentProductImage.classList.remove('hidden');
                productImageInput.value = ''; // Clear file input
                productModal.classList.remove('hidden');
            });
        });

        document.querySelectorAll('.delete-product-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (confirm('هل أنت متأكد أنك تريد حذف هذا المنتج؟')) {
                    products.splice(index, 1);
                    saveProducts();
                }
            });
        });
    }

    addProductBtn.addEventListener('click', () => {
        editingProductIndex = -1;
        productModalTitle.textContent = 'إضافة منتج جديد';
        productForm.reset();
        currentProductImage.classList.add('hidden');
        currentProductImage.src = '';
        productModal.classList.remove('hidden');
    });

    cancelProductBtn.addEventListener('click', () => {
        productModal.classList.add('hidden');
    });

    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = productNameInput.value;
        const price = parseFloat(productPriceInput.value);
        let image = currentProductImage.src; // Keep current image if not changed

        const file = productImageInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                image = event.target.result;
                saveProductData(name, price, image);
            };
            reader.readAsDataURL(file);
        } else {
            saveProductData(name, price, image);
        }
    });

    function saveProductData(name, price, image) {
        if (editingProductIndex === -1) {
            products.push({ name, price, image });
        } else {
            products[editingProductIndex] = { name, price, image };
        }
        saveProducts();
        productModal.classList.add('hidden');
    }

    // --- Event Countdown Management ---
    const countdownDateInput = document.getElementById('countdownDateInput');
    const saveCountdownBtn = document.getElementById('saveCountdownBtn');
    const currentCountdownDisplay = document.getElementById('currentCountdown');

    // تعريف countdownInterval في نطاق أوسع
    let countdownInterval; 

    let savedCountdownDate = localStorage.getItem('eventCountdownDate');

    if (savedCountdownDate) {
        countdownDateInput.value = savedCountdownDate;
        updateCountdownDisplay(new Date(savedCountdownDate).getTime());
    } else {
        currentCountdownDisplay.textContent = 'العداد الحالي: لم يتم تعيينه';
    }

    function updateCountdownDisplay(targetTime) {
        clearInterval(countdownInterval); // هذا السطر لم يعد يسبب خطأ
        countdownInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetTime - now;

            if (distance < 0) {
                clearInterval(countdownInterval);
                currentCountdownDisplay.textContent = "انتهى العرض";
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            currentCountdownDisplay.textContent =
                `العداد الحالي: ${days.toString().padStart(2, '0')} أيام : ${hours.toString().padStart(2, '0')} ساعات : ${minutes.toString().padStart(2, '0')} دقائق : ${seconds.toString().padStart(2, '0')} ثواني`;
        }, 1000);
    }

    saveCountdownBtn.addEventListener('click', () => {
        const selectedDate = countdownDateInput.value;
        if (selectedDate) {
            localStorage.setItem('eventCountdownDate', selectedDate);
            updateCountdownDisplay(new Date(selectedDate).getTime());
            alert('تم حفظ تاريخ العداد بنجاح!');
        } else {
            alert('الرجاء تحديد تاريخ ووقت للعداد.');
        }
    });

    // --- Event Management ---
    const eventsList = document.getElementById('eventsList');
    const addEventBtn = document.getElementById('addEventBtn');
    const eventModal = document.getElementById('eventModal');
    const eventModalTitle = document.getElementById('eventModalTitle');
    const eventForm = document.getElementById('eventForm');
    const eventTitleInput = document.getElementById('eventTitle');
    const eventDescriptionInput = document.getElementById('eventDescription');
    const eventImageInput = document.getElementById('eventImage');
    const currentEventImage = document.getElementById('currentEventImage');
    const cancelEventBtn = document.getElementById('cancelEventBtn');

    let events = JSON.parse(localStorage.getItem('events')) || [];
    let editingEventIndex = -1; // -1 for new event, index for editing

    function saveEvents() {
        localStorage.setItem('events', JSON.stringify(events));
        renderEvents();
    }

    function renderEvents() {
        eventsList.innerHTML = '';
        if (events.length === 0) {
            eventsList.innerHTML = '<p class="text-gray-600 text-center">لا توجد فعاليات حاليًا. اضغط "إضافة فعالية جديدة" لإضافة فعاليتك الأولى.</p>';
            return;
        }
        events.forEach((event, index) => {
            const eventCard = document.createElement('div');
            eventCard.className = 'glass-effect p-6 rounded-xl flex flex-col md:flex-row items-center gap-6 event-card';
            eventCard.innerHTML = `
                ${event.image ? `<img src="${event.image}" alt="${event.title}" class="w-32 h-32 object-cover rounded-lg flex-shrink-0">` : ''}
                <div class="flex-grow">
                    <h3 class="text-2xl font-bold mb-2">${event.title}</h3>
                    <p class="text-gray-700 mb-4">${event.description}</p>
                    <div class="flex gap-4 mt-auto justify-end md:justify-start">
                        <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition edit-event-btn" data-index="${index}">تعديل</button>
                        <button class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition delete-event-btn" data-index="${index}">حذف</button>
                    </div>
                </div>
            `;
            eventsList.appendChild(eventCard);
        });

        document.querySelectorAll('.edit-event-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                editingEventIndex = index;
                const event = events[index];
                eventModalTitle.textContent = 'تعديل الفعالية';
                eventTitleInput.value = event.title;
                eventDescriptionInput.value = event.description;
                if (event.image) {
                    currentEventImage.src = event.image;
                    currentEventImage.classList.remove('hidden');
                } else {
                    currentEventImage.classList.add('hidden');
                    currentEventImage.src = '';
                }
                eventImageInput.value = ''; // Clear file input
                eventModal.classList.remove('hidden');
            });
        });

        document.querySelectorAll('.delete-event-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (confirm('هل أنت متأكد أنك تريد حذف هذه الفعالية؟')) {
                    events.splice(index, 1);
                    saveEvents();
                }
            });
        });
    }

    addEventBtn.addEventListener('click', () => {
        editingEventIndex = -1;
        eventModalTitle.textContent = 'إضافة فعالية جديدة';
        eventForm.reset();
        currentEventImage.classList.add('hidden');
        currentEventImage.src = '';
        eventModal.classList.remove('hidden');
    });

    cancelEventBtn.addEventListener('click', () => {
        eventModal.classList.add('hidden');
    });

    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = eventTitleInput.value;
        const description = eventDescriptionInput.value;
        let image = currentEventImage.src; // Keep current image if not changed

        const file = eventImageInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                image = event.target.result;
                saveEventData(title, description, image);
            };
            reader.readAsDataURL(file);
        } else {
            saveEventData(title, description, image);
        }
    });

    function saveEventData(title, description, image) {
        if (editingEventIndex === -1) {
            events.push({ title, description, image });
        } else {
            events[editingEventIndex] = { title, description, image };
        }
        saveEvents();
        eventModal.classList.add('hidden');
    }

    // Initial render calls
    renderProducts();
    renderEvents();
});