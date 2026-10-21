/**
 * FUDZ PENGUIN DELIVERY APP - CORE APPLICATION SCRIPT
 * Architecture: Dynamic Modular Namespace Pattern with Firebase Cloud Firestore Sync
 */

// --- FIREBASE CONFIGURATION & INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCLJnZ69LU2f0zvmOFsf7BZ2Ty2pD5cpfo",
  authDomain: "fudz-penguin.firebaseapp.com",
  projectId: "fudz-penguin",
  storageBucket: "fudz-penguin.firebasestorage.app",
  messagingSenderId: "200980149394",
  appId: "1:200980149394:web:9da0ebd549621aee5ca24b",
  measurementId: "G-9RH1T7PYK6"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Initial Seed Data
const INITIAL_MENU = [
  {
    id: "p1",
    title: "Glacier Penguin Supreme Burger",
    category: "Penguin Combos",
    price: 14.99,
    rating: 4.9,
    description: "Double frozen-crust Angus beef topped with arctic white cheese, crispy iceberg lettuce, and special chill-sauce.",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600"
  },
  {
    id: "p2",
    title: "Frosty Antarctic Salmon Roll",
    category: "Arctic Seafood",
    price: 18.50,
    rating: 4.8,
    description: "Premium sashimi salmon served on a chilled rice bed with authentic wasabi and ocean kelp crunch.",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600"
  },
  {
    id: "p3",
    title: "Snowcap Berry Igloo Sundae",
    category: "Frosty Treats",
    price: 7.99,
    rating: 4.9,
    description: "Tri-layered vanilla bean soft serve garnished with chilled berries, mint leaf, and edible sugar ice flakes.",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600"
  },
  {
    id: "p4",
    title: "Polar Iceberg Chill Cooler",
    category: "Glacier Drinks",
    price: 4.99,
    rating: 4.7,
    description: "Sparkling blue curaçao extract mixed with frozen lemon crush and mint cubes.",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600"
  },
  {
    id: "p5",
    title: "Penguin Party Platter",
    category: "Penguin Combos",
    price: 29.99,
    rating: 5.0,
    description: "Crispy arctic chicken tenders, fish strips, onion rings, served with triple dipping chill sauces.",
    image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600"
  },
  {
    id: "p6",
    title: "Deep Sea Crab Cakes",
    category: "Arctic Seafood",
    price: 16.25,
    rating: 4.6,
    description: "Pan-seared ocean crab meat patties infused with fresh herbs and lemon zest.",
    image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600"
  }
];

// MODULE: STORAGE DATABASE (Synced to Firebase Firestore)
const Storage = {
    KEY_USERS: 'fudz_users',
    KEY_CURRENT_USER: 'fudz_current_user',
    KEY_MENU: 'fudz_menu',
    KEY_ORDERS: 'fudz_orders',
    KEY_CART: 'fudz_cart',

    cache: {
        fudz_users: [],
        fudz_menu: INITIAL_MENU,
        fudz_orders: [],
        fudz_cart: []
    },

    async init() {
        try {
            for (const key of [this.KEY_MENU, this.KEY_USERS, this.KEY_ORDERS, this.KEY_CART]) {
                const docRef = db.collection('app_data').doc(key);
                const doc = await docRef.get();
                if (doc.exists) {
                    this.cache[key] = doc.data().value;
                } else {
                    let initialVal = [];
                    if (key === this.KEY_MENU) initialVal = INITIAL_MENU;
                    await docRef.set({ value: initialVal });
                    this.cache[key] = initialVal;
                }
            }
        } catch (e) {
            console.error("Firebase init error, fallback to local cache:", e);
        }
    },

    get(key) {
        return this.cache[key] || [];
    },

    async set(key, val) {
        this.cache[key] = val;
        try {
            await db.collection('app_data').doc(key).set({ value: val });
        } catch (e) {
            console.error("Firebase sync error:", e);
        }
    },

    getCurrentUser() {
        try {
            const data = localStorage.getItem(this.KEY_CURRENT_USER);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    setCurrentUser(user) {
        if (user) {
            localStorage.setItem(this.KEY_CURRENT_USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(this.KEY_CURRENT_USER);
        }
    }
};

// MODULE: NOTIFICATION TOAST
const Toast = {
    show(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        let bgColor = 'bg-slate-800 border-slate-700 text-white';
        let icon = 'fa-circle-info text-arctic-400';

        if (type === 'success') {
            bgColor = 'bg-emerald-950 border-emerald-800 text-emerald-100';
            icon = 'fa-circle-check text-emerald-400';
        } else if (type === 'error') {
            bgColor = 'bg-rose-950 border-rose-800 text-rose-100';
            icon = 'fa-triangle-exclamation text-rose-400';
        }

        toast.className = `flex items-center gap-3 px-4 py-3 rounded-2xl border ${bgColor} shadow-xl text-xs font-semibold transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto`;
        toast.innerHTML = `<i class="fa-solid ${icon} text-base"></i><span>${message}</span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// MODULE: APPLICATION ROUTER
const App = {
    currentView: 'menu',
    async init() {
        await Storage.init();
        
        const currentUser = Storage.getCurrentUser();
        if (currentUser && currentUser.id === 'admin_root') {
            if (typeof AdminPortal !== 'undefined') {
                AdminPortal.isAuth = true;
            }
        }

        AuthUI.updateNavUser();
        CartUI.updateBadge();

        if (document.getElementById('app-view')) {
            this.navigateTo('menu');
        }
    },
    navigateTo(view, payload = null) {
        this.currentView = view;
        const viewContainer = document.getElementById('app-view');
        if (!viewContainer) return;

        if (view === 'menu') {
            MenuUI.render(viewContainer);
        } else if (view === 'checkout') {
            CheckoutUI.render(viewContainer);
        } else if (view === 'tracking') {
            TrackingUI.render(viewContainer, payload);
        } else if (view === 'admin') {
            AdminPortal.render(viewContainer);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

// MODULE: AUTHENTICATION
const AuthUI = {
    activeTab: 'login',
    switchTab(tab) {
        this.activeTab = tab;
        const loginBtn = document.getElementById('auth-tab-login');
        const regBtn = document.getElementById('auth-tab-register');
        const loginForm = document.getElementById('form-login');
        const regForm = document.getElementById('form-register');

        if (!loginBtn || !regBtn) return;

        if (tab === 'login') {
            loginBtn.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition text-white bg-arctic-600 shadow';
            regBtn.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-400 hover:text-white';
            if (loginForm) loginForm.classList.remove('hidden');
            if (regForm) regForm.classList.add('hidden');
        } else {
            regBtn.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition text-white bg-arctic-600 shadow';
            loginBtn.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-400 hover:text-white';
            if (regForm) regForm.classList.remove('hidden');
            if (loginForm) loginForm.classList.add('hidden');
        }
    },
    handleLogin(e) {
        if (e && e.preventDefault) e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const users = Storage.get(Storage.KEY_USERS);
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            Storage.setCurrentUser(user);
            Toast.show(`Welcome back, ${user.name}!`, 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 300);
        } else {
            Toast.show('Invalid email or password', 'error');
        }
    },
    async handleRegister(e) {
        if (e && e.preventDefault) e.preventDefault();
        
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const phone = document.getElementById('reg-phone').value;
        const address = document.getElementById('reg-address').value;
        const password = document.getElementById('reg-password').value;

        let users = Storage.get(Storage.KEY_USERS);
        
        if (users.some(u => u.email === email)) {
            Toast.show('User with this email already exists', 'error');
            return;
        }

        const newUser = {
            id: 'u_' + Date.now(),
            name: name,
            email: email,
            phone: phone,
            address: address,
            password: password,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        };

        users.push(newUser);
        await Storage.set(Storage.KEY_USERS, users);
        Storage.setCurrentUser(newUser);

        Toast.show('Account created successfully!', 'success');
        window.location.href = 'index.html';
    },
    logout() {
        const currentUser = Storage.getCurrentUser();
        if (currentUser && currentUser.id === 'admin_root') {
            AdminPortal.isAuth = false;
        }
        Storage.setCurrentUser(null);
        this.updateNavUser();
        Toast.show('Logged out safely', 'info');
        
        if (App.currentView === 'checkout' || App.currentView === 'admin') {
            App.navigateTo('menu');
        }
    },
    updateNavUser() {
        const container = document.getElementById('nav-user-container');
        if (!container) return;
        const user = Storage.getCurrentUser();

        if (user) {
            const isAdmin = user.id === 'admin_root';
            container.innerHTML = `
                <div class="flex items-center gap-2">
                    ${!isAdmin ? `
                        <button onclick="App.navigateTo('tracking')" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 transition text-xs font-semibold text-arctic-400 flex items-center gap-1.5">
                            <i class="fa-solid fa-receipt"></i>
                            <span>My Orders</span>
                        </button>
                    ` : ''}
                    <button ${isAdmin ? '' : 'onclick="ProfileUI.openModal()"'} class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 transition text-xs font-semibold text-white">
                        <img src="${user.avatar}" class="w-6 h-6 rounded-full object-cover">
                        <span class="max-w-[100px] truncate">${user.name}</span>
                    </button>
                    <button onclick="AuthUI.logout()" title="Logout" class="p-2 text-slate-400 hover:text-rose-400 text-xs">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <a href="login.html" class="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-arctic-600 to-cyan-500 hover:from-arctic-500 hover:to-cyan-400 text-white shadow-lg shadow-arctic-500/20 transition inline-block">
                    Sign In
                </a>
            `;
        }
    }
};

// MODULE: PROFILE MANAGER
const ProfileUI = {
    openModal() {
        const user = Storage.getCurrentUser();
        if (!user || user.id === 'admin_root') return;
        document.getElementById('profile-name').value = user.name;
        document.getElementById('profile-email').value = user.email;
        document.getElementById('profile-phone').value = user.phone;
        document.getElementById('profile-address').value = user.address;
        document.getElementById('profile-avatar').value = user.avatar;
        document.getElementById('profile-avatar-preview').src = user.avatar;
        document.getElementById('profile-password').value = '';
        document.getElementById('profile-modal').classList.remove('hidden');
    },
    closeModal() {
        document.getElementById('profile-modal').classList.add('hidden');
    },
    async handleSave(e) {
        e.preventDefault();
        const user = Storage.getCurrentUser();
        if (!user || user.id === 'admin_root') return;

        user.name = document.getElementById('profile-name').value;
        user.phone = document.getElementById('profile-phone').value;
        user.address = document.getElementById('profile-address').value;
        user.avatar = document.getElementById('profile-avatar').value;
        const password = document.getElementById('profile-password').value;
        if (password.trim() !== '') user.password = password;

        Storage.setCurrentUser(user);
        const users = Storage.get(Storage.KEY_USERS);
        const idx = users.findIndex(u => u.id === user.id);
        if (idx !== -1) {
            users[idx] = user;
            await Storage.set(Storage.KEY_USERS, users);
        }

        AuthUI.updateNavUser();
        this.closeModal();
        Toast.show('Profile updated successfully!', 'success');
    }
};

// MODULE: CART MANAGER
const CartUI = {
    isOpen: false,
    getCart() { return Storage.get(Storage.KEY_CART); },
    async setCart(cart) {
        await Storage.set(Storage.KEY_CART, cart);
        this.updateBadge();
        this.renderItems();
    },
    async addItem(item) {
        const cart = this.getCart();
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ ...item, qty: 1 });
        }
        await this.setCart(cart);
        Toast.show(`Added "${item.title}" to cart!`, 'success');
    },
    async updateQty(id, delta) {
        let cart = this.getCart();
        const item = cart.find(c => c.id === id);
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
                cart = cart.filter(c => c.id !== id);
            }
        }
        await this.setCart(cart);
    },
    toggleDrawer() {
        const drawer = document.getElementById('cart-drawer');
        const panel = document.getElementById('cart-panel');
        if (!drawer || !panel) return;

        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.renderItems();
            drawer.classList.remove('pointer-events-none', 'opacity-0');
            panel.classList.remove('translate-x-full');
        } else {
            drawer.classList.add('pointer-events-none', 'opacity-0');
            panel.classList.add('translate-x-full');
        }
    },
    updateBadge() {
        const cart = this.getCart();
        const count = cart.reduce((acc, i) => acc + i.qty, 0);
        const badge = document.getElementById('cart-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    },
    renderItems() {
        const container = document.getElementById('cart-items-container');
        if (!container) return;
        const cart = this.getCart();

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 text-slate-500">
                    <i class="fa-solid fa-box-open text-4xl mb-3 opacity-40"></i>
                    <p class="text-sm font-semibold">Your cart is ice cold empty</p>
                    <p class="text-xs mt-1">Add some penguin treats to start!</p>
                </div>
            `;
            document.getElementById('cart-subtotal').textContent = '$0.00';
            document.getElementById('cart-total').textContent = '$0.00';
            return;
        }

        let subtotal = 0;
        container.innerHTML = cart.map(item => {
            const itemTotal = item.price * item.qty;
            subtotal += itemTotal;
            return `
                <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                    <img src="${item.image}" class="w-14 h-14 rounded-xl object-cover">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-xs font-bold text-white truncate">${item.title}</h4>
                        <p class="text-xs text-arctic-400 font-semibold">$${item.price.toFixed(2)}</p>
                    </div>
                    <div class="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1">
                        <button onclick="CartUI.updateQty('${item.id}', -1)" class="text-slate-400 hover:text-white text-xs px-1">-</button>
                        <span class="text-xs font-bold text-white w-4 text-center">${item.qty}</span>
                        <button onclick="CartUI.updateQty('${item.id}', 1)" class="text-slate-400 hover:text-white text-xs px-1">+</button>
                    </div>
                </div>
            `;
        }).join('');

        const delivery = 2.99;
        document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('cart-total').textContent = `$${(subtotal + delivery).toFixed(2)}`;
    }
};

// MODULE: MENU RENDERING
const MenuUI = {
    activeCategory: 'All',
    searchQuery: '',
    render(container) {
        const categories = ['All', 'Penguin Combos', 'Arctic Seafood', 'Frosty Treats', 'Glacier Drinks'];
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div class="relative w-full sm:w-80">
                        <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input type="text" id="menu-search" oninput="MenuUI.handleSearch(event)" placeholder="Search penguin delicacies..." value="${this.searchQuery}" class="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-arctic-500 transition shadow-inner">
                    </div>
                    <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
                        ${categories.map(cat => `
                            <button onclick="MenuUI.filterCategory('${cat}')" class="px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition border ${this.activeCategory === cat ? 'bg-arctic-600 text-white border-arctic-500 shadow-md shadow-arctic-500/20' : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white hover:bg-slate-800'}">
                                ${cat}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div id="menu-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
            </div>
        `;
        this.renderGrid();
    },
    filterCategory(cat) {
        this.activeCategory = cat;
        this.render(document.getElementById('app-view'));
    },
    handleSearch(e) {
        this.searchQuery = e.target.value;
        this.renderGrid();
    },
    renderGrid() {
        const grid = document.getElementById('menu-grid');
        if (!grid) return;
        let items = Storage.get(Storage.KEY_MENU);

        if (this.activeCategory !== 'All') {
            items = items.filter(i => i.category === this.activeCategory);
        }
        if (this.searchQuery.trim() !== '') {
            const q = this.searchQuery.toLowerCase();
            items = items.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
        }

        if (items.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-20 text-slate-500">
                    <i class="fa-solid fa-snowflake text-4xl mb-3 opacity-30 animate-spin"></i>
                    <p class="text-sm font-semibold">No food items found matching criteria</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = items.map(item => `
            <div class="group bg-slate-800/40 border border-slate-800 hover:border-arctic-500/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-arctic-500/10 flex flex-col">
                <div class="relative h-48 overflow-hidden cursor-pointer" onclick="MenuUI.openDetailModal('${item.id}')">
                    <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                    <div class="absolute top-3 left-3 px-3 py-1 bg-slate-900/85 backdrop-blur-md text-slate-200 text-[10px] font-bold rounded-full border border-slate-700">
                        ${item.category}
                    </div>
                    <div class="absolute top-3 right-3 px-2.5 py-1 bg-amber-500/90 text-slate-950 font-bold text-[11px] rounded-full flex items-center gap-1 shadow">
                        <i class="fa-solid fa-star text-[10px]"></i> ${item.rating}
                    </div>
                </div>
                <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                        <h3 class="font-bold text-white text-base hover:text-arctic-400 cursor-pointer transition" onclick="MenuUI.openDetailModal('${item.id}')">
                            ${item.title}
                        </h3>
                        <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">${item.description}</p>
                    </div>
                    <div class="flex items-center justify-between pt-2 border-t border-slate-700/40">
                        <span class="text-lg font-extrabold text-arctic-400">$${item.price.toFixed(2)}</span>
                        <button onclick='CartUI.addItem(${JSON.stringify(item)})' class="px-4 py-2 bg-arctic-600/20 hover:bg-arctic-600 text-arctic-400 hover:text-white border border-arctic-500/30 font-bold rounded-xl text-xs transition flex items-center gap-2">
                            <i class="fa-solid fa-plus text-[10px]"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },
    openDetailModal(id) {
        const item = Storage.get(Storage.KEY_MENU).find(i => i.id === id);
        if (!item) return;
        const body = document.getElementById('item-modal-body');
        body.innerHTML = `
            <div class="relative h-64">
                <img src="${item.image}" class="w-full h-full object-cover">
                <button onclick="MenuUI.closeDetailModal()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900/80 backdrop-blur text-white flex items-center justify-center">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="p-6 space-y-4">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-xs font-bold text-arctic-400 uppercase tracking-wider">${item.category}</span>
                        <h2 class="text-xl font-black text-white mt-0.5">${item.title}</h2>
                    </div>
                    <span class="text-xl font-bold text-white">$${item.price.toFixed(2)}</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">${item.description}</p>
                <button onclick='CartUI.addItem(${JSON.stringify(item)}); MenuUI.closeDetailModal();' class="w-full py-3 bg-gradient-to-r from-arctic-600 to-cyan-500 hover:from-arctic-500 hover:to-cyan-400 text-white font-bold text-sm rounded-xl shadow-lg transition">
                    Add to Order $${item.price.toFixed(2)}
                </button>
            </div>
        `;
        document.getElementById('item-modal').classList.remove('hidden');
    },
    closeDetailModal() {
        document.getElementById('item-modal').classList.add('hidden');
    }
};

// MODULE: CHECKOUT SYSTEM
const CheckoutUI = {
    initiateCheckout() {
        const cart = Storage.get(Storage.KEY_CART);
        if (cart.length === 0) {
            Toast.show('Cart is empty!', 'error');
            return;
        }
        const user = Storage.getCurrentUser();
        if (!user) {
            CartUI.toggleDrawer();
            Toast.show('Please sign in to proceed with order checkout', 'info');
            setTimeout(() => { window.location.href = 'login.html'; }, 1000);
            return;
        }
        if (user.id === 'admin_root') {
            CartUI.toggleDrawer();
            Toast.show('Administrators cannot place customer orders!', 'error');
            return;
        }
        CartUI.toggleDrawer();
        App.navigateTo('checkout');
    },
    render(container) {
        const user = Storage.getCurrentUser() || {};

        if (user.id === 'admin_root') {
            container.innerHTML = `
                <div class="text-center py-20 bg-slate-800/40 border border-slate-800 rounded-3xl p-8 space-y-4 max-w-xl mx-auto">
                    <i class="fa-solid fa-shield-halved text-5xl text-amber-400"></i>
                    <h2 class="text-2xl font-extrabold text-white">Administrator Notice</h2>
                    <p class="text-xs text-slate-400">Admin accounts are restricted from placing customer orders. Please sign in with a registered customer account to order delicacies.</p>
                    <button onclick="App.navigateTo('menu')" class="px-6 py-2.5 bg-arctic-600 hover:bg-arctic-500 text-white text-xs font-bold rounded-xl transition">
                        Back to Menu
                    </button>
                </div>
            `;
            return;
        }

        const cart = Storage.get(Storage.KEY_CART);
        const subtotal = cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
        const total = subtotal + 2.99;

        container.innerHTML = `
            <div class="max-w-3xl mx-auto space-y-6">
                <button onclick="App.navigateTo('menu')" class="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-2">
                    <i class="fa-solid fa-arrow-left"></i> Back to Menu
                </button>
                <div class="bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                    <div class="flex items-center gap-3 border-b border-slate-700/50 pb-4">
                        <i class="fa-solid fa-truck-fast text-arctic-400 text-2xl"></i>
                        <div>
                            <h2 class="text-xl font-bold text-white">Express Arctic Checkout</h2>
                            <p class="text-xs text-slate-400">Confirm delivery destination and order summary</p>
                        </div>
                    </div>
                    <form onsubmit="CheckoutUI.placeOrder(event)" class="space-y-6">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1">Customer Name</label>
                                <input type="text" id="checkout-name" value="${user.name || ''}" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-arctic-500">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-400 mb-1">Phone Number</label>
                                <input type="tel" id="checkout-phone" value="${user.phone || ''}" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-arctic-500">
                            </div>
                            <div class="sm:col-span-2">
                                <label class="block text-xs font-semibold text-slate-400 mb-1">Delivery Address</label>
                                <input type="text" id="checkout-address" value="${user.address || ''}" required class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-arctic-500">
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-semibold text-slate-400">Payment Option</label>
                            <div class="grid grid-cols-2 gap-3">
                                <label id="label-card" class="flex items-center gap-3 p-3 rounded-2xl bg-slate-800 border border-arctic-500 cursor-pointer transition">
                                    <input type="radio" name="payment" value="card" checked onclick="CheckoutUI.switchPayment('card')" class="accent-arctic-500">
                                    <span class="text-xs font-bold text-white"><i class="fa-solid fa-credit-card mr-1 text-arctic-400"></i> Card on Delivery</span>
                                </label>
                                <label id="label-cash" class="flex items-center gap-3 p-3 rounded-2xl bg-slate-800 border border-slate-700 cursor-pointer transition">
                                    <input type="radio" name="payment" value="cash" onclick="CheckoutUI.switchPayment('cash')" class="accent-arctic-500">
                                    <span class="text-xs font-bold text-white"><i class="fa-solid fa-money-bill-wave mr-1 text-emerald-400"></i> Cash on Delivery</span>
                                </label>
                            </div>
                        </div>
                        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                            <div class="flex justify-between text-slate-400">
                                <span>Items Total (${cart.reduce((a,b)=>a+b.qty,0)} items)</span>
                                <span>$${subtotal.toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between text-slate-400">
                                <span>Arctic Express Fee</span>
                                <span>$2.99</span>
                            </div>
                            <div class="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                                <span>Grand Total</span>
                                <span class="text-arctic-400">$${total.toFixed(2)}</span>
                            </div>
                        </div>
                        <button type="submit" class="w-full py-4 bg-gradient-to-r from-arctic-600 to-cyan-500 hover:from-arctic-500 hover:to-cyan-400 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-arctic-500/25 transition flex items-center justify-center gap-2">
                            <i class="fa-solid fa-paper-plane"></i> Place Order Now ($${total.toFixed(2)})
                        </button>
                    </form>
                </div>
            </div>
        `;
    },
    switchPayment(type) {
        const cardLabel = document.getElementById('label-card');
        const cashLabel = document.getElementById('label-cash');
        if (!cardLabel || !cashLabel) return;

        if (type === 'card') {
            cardLabel.className = "flex items-center gap-3 p-3 rounded-2xl bg-slate-800 border border-arctic-500 cursor-pointer transition";
            cashLabel.className = "flex items-center gap-3 p-3 rounded-2xl bg-slate-800 border border-slate-700 cursor-pointer transition";
        } else {
            cashLabel.className = "flex items-center gap-3 p-3 rounded-2xl bg-slate-800 border border-arctic-500 cursor-pointer transition";
            cardLabel.className = "flex items-center gap-3 p-3 rounded-2xl bg-slate-800 border border-slate-700 cursor-pointer transition";
        }
    },
    async placeOrder(e) {
        e.preventDefault();
        const user = Storage.getCurrentUser();
        if (user && user.id === 'admin_root') {
            Toast.show('Administrators cannot place orders', 'error');
            return;
        }

        const cart = Storage.get(Storage.KEY_CART);
        const order = {
            id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
            userId: user ? user.id : 'guest',
            customerName: document.getElementById('checkout-name').value,
            phone: document.getElementById('checkout-phone').value,
            address: document.getElementById('checkout-address').value,
            items: cart,
            total: cart.reduce((acc, i) => acc + (i.price * i.qty), 0) + 2.99,
            status: 'Cooking',
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const orders = Storage.get(Storage.KEY_ORDERS);
        orders.unshift(order);
        await Storage.set(Storage.KEY_ORDERS, orders);

        await Storage.set(Storage.KEY_CART, []);
        CartUI.updateBadge();

        Toast.show('Order placed successfully! Tracking initiated.', 'success');
        App.navigateTo('tracking', order.id);
    }
};

// MODULE: LIVE ANIMATED TRACKING
const TrackingUI = {
    intervalId: null,
    render(container, orderId) {
        const user = Storage.getCurrentUser();
        const orders = Storage.get(Storage.KEY_ORDERS);
        
        const userOrders = user && user.id !== 'admin_root' ? orders.filter(o => o.userId === user.id) : orders;

        if (userOrders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-20 text-slate-500 bg-slate-800/40 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto space-y-4">
                    <i class="fa-solid fa-receipt text-5xl opacity-40 text-arctic-400"></i>
                    <h3 class="text-lg font-bold text-white">No active orders yet</h3>
                    <p class="text-xs text-slate-400">You haven't placed any orders with us yet. Check out our menu to order fresh arctic delicacies!</p>
                    <button onclick="App.navigateTo('menu')" class="px-6 py-2.5 bg-arctic-600 hover:bg-arctic-500 text-white rounded-xl font-bold text-xs transition">
                        Browse Menu
                    </button>
                </div>
            `;
            return;
        }

        const order = orderId ? orders.find(o => o.id === orderId) : userOrders[0];
        if (!order) return;

        const stages = ['Cooking', 'Out for Delivery', 'Delivered'];
        let currentStageIdx = stages.indexOf(order.status);
        if (currentStageIdx === -1) currentStageIdx = 0;

        const progressWidth = currentStageIdx === 0 ? '0%' : (currentStageIdx === 1 ? '50%' : '100%');

        container.innerHTML = `
            <div class="max-w-4xl mx-auto space-y-6">
                ${userOrders.length > 1 ? `
                    <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <span class="text-xs font-bold text-slate-400 whitespace-nowrap mr-2">Your Orders:</span>
                        ${userOrders.map(o => `
                            <button onclick="App.navigateTo('tracking', '${o.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition border ${o.id === order.id ? 'bg-arctic-600 text-white border-arctic-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}">
                                ${o.id} (${o.status})
                            </button>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="bg-slate-800/40 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <span class="text-xs font-bold text-arctic-400 uppercase tracking-widest">Order ID: ${order.id}</span>
                        <h2 class="text-2xl font-black text-white mt-1">Status: <span id="track-status-text" class="text-cyan-400">${order.status}</span></h2>
                        <p class="text-xs text-slate-400 mt-0.5">Estimated Arrival: <span class="text-white font-bold">12-18 mins</span></p>
                    </div>
                    <button onclick="App.navigateTo('menu')" class="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition">
                        Order More Items
                    </button>
                </div>

                <div class="bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8">
                    <div class="relative flex items-center justify-between px-4">
                        <div class="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-700 z-0"></div>
                        <div id="progress-line" class="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-arctic-500 to-cyan-400 transition-all duration-700 z-0" style="width: ${progressWidth};"></div>

                        <div class="relative z-10 flex flex-col items-center">
                            <div id="step-icon-0" class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 ${currentStageIdx >= 0 ? 'bg-arctic-500 text-white ring-4 ring-arctic-500/20 shadow-lg shadow-arctic-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                                <i class="fa-solid fa-fire-burner"></i>
                            </div>
                            <span class="text-[11px] font-bold text-slate-300 mt-2">Prep & Cooking</span>
                        </div>

                        <div class="relative z-10 flex flex-col items-center">
                            <div id="step-icon-1" class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 ${currentStageIdx >= 1 ? 'bg-arctic-500 text-white ring-4 ring-arctic-500/20 shadow-lg shadow-arctic-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                                <i class="fa-solid fa-person-biking"></i>
                            </div>
                            <span class="text-[11px] font-bold text-slate-300 mt-2">Out for Express Delivery</span>
                        </div>

                        <div class="relative z-10 flex flex-col items-center">
                            <div id="step-icon-2" class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 ${currentStageIdx >= 2 ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                                <i class="fa-solid fa-house-chimney text-xs"></i>
                            </div>
                            <span class="text-[11px] font-bold text-slate-300 mt-2">Delivered Fresh</span>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-800/40 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4">
                    <div class="flex justify-between items-center text-xs font-semibold text-slate-400">
                        <span><i class="fa-solid fa-location-dot text-arctic-400 mr-1"></i> Live Delivery Simulation Radar</span>
                        <span class="text-emerald-400 font-bold flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Signal
                        </span>
                    </div>
                    <div class="relative h-64 sm:h-80 w-full rounded-2xl bg-slate-950 map-grid overflow-hidden border border-slate-800 flex items-center justify-center">
                        <div class="absolute top-8 left-8 flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-full shadow">
                            <span class="text-xs text-white font-bold">Arctic Kitchen</span>
                        </div>
                        <div class="absolute bottom-8 right-8 flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-full shadow">
                            <span class="text-xs text-white font-bold">${order.customerName}</span>
                        </div>
                        <div id="courier-marker" class="absolute transition-all duration-1000 ease-linear flex flex-col items-center" style="top: 20%; left: 15%;">
                            <div class="w-10 h-10 rounded-2xl bg-arctic-500 text-white flex items-center justify-center text-xl shadow-lg shadow-arctic-500/40 animate-bounce">
                                🐧
                            </div>
                            <span class="text-[9px] font-extrabold text-white bg-slate-900 px-2 py-0.5 rounded-full border border-arctic-500/40 mt-1 whitespace-nowrap">
                                Courier Tux
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.startSimulation(order.id);
    },
    startSimulation(orderId) {
        if (this.intervalId) clearInterval(this.intervalId);
        let step = 0;
        const marker = document.getElementById('courier-marker');

        this.intervalId = setInterval(async () => {
            step++;
            const orders = Storage.get(Storage.KEY_ORDERS);
            const orderIdx = orders.findIndex(o => o.id === orderId);
            if (orderIdx === -1) return;

            if (step === 3) {
                orders[orderIdx].status = 'Out for Delivery';
                await Storage.set(Storage.KEY_ORDERS, orders);
                
                const statusTxt = document.getElementById('track-status-text');
                const progress = document.getElementById('progress-line');
                const icon1 = document.getElementById('step-icon-1');
                
                if (statusTxt) statusTxt.textContent = 'Out for Delivery';
                if (progress) progress.style.width = '50%';
                if (icon1) {
                    icon1.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 bg-arctic-500 text-white ring-4 ring-arctic-500/20 shadow-lg shadow-arctic-500/30";
                }
            } else if (step === 7) {
                orders[orderIdx].status = 'Delivered';
                await Storage.set(Storage.KEY_ORDERS, orders);
                
                const statusTxt = document.getElementById('track-status-text');
                const progress = document.getElementById('progress-line');
                const icon2 = document.getElementById('step-icon-2');
                
                if (statusTxt) statusTxt.textContent = 'Delivered';
                if (progress) progress.style.width = '100%';
                if (icon2) {
                    icon2.className = "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/30";
                }
                
                clearInterval(this.intervalId);
                Toast.show('Penguin courier has arrived with your fresh food!', 'success');
            }

            if (marker) {
                const topPos = 20 + step * 8;
                const leftPos = 15 + step * 9;
                marker.style.top = `${topPos}%`;
                marker.style.left = `${leftPos}%`;
            }
        }, 3000);
    }
};

// MODULE: ADMIN PORTAL
const AdminPortal = {
    isAuth: false,
    activeTab: 'menu',
    openAuthModal() {
        const currentUser = Storage.getCurrentUser();
        if (this.isAuth || (currentUser && currentUser.id === 'admin_root')) {
            this.isAuth = true;
            App.navigateTo('admin');
        } else {
            document.getElementById('admin-auth-modal').classList.remove('hidden');
        }
    },
    closeAuthModal() {
        document.getElementById('admin-auth-modal').classList.add('hidden');
    },
    verifyAuth(e) {
        e.preventDefault();
        const email = document.getElementById('admin-email-input').value;
        const pass = document.getElementById('admin-pass-input').value;
        
        const ADMIN_EMAIL = 'admin@fudzpenguin.com';
        const ADMIN_PASS = 'ralph1234#';

        if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
            this.isAuth = true;
            this.closeAuthModal();
            document.getElementById('admin-email-input').value = '';
            document.getElementById('admin-pass-input').value = '';
            
            const adminUser = {
                id: 'admin_root',
                name: 'Raffy Salas',
                email: ADMIN_EMAIL,
                avatar: 'https://cdn-icons-png.flaticon.com/512/9703/9703596.png'
            };
            Storage.setCurrentUser(adminUser);
            AuthUI.updateNavUser();

            Toast.show('Admin Access Granted', 'success');
            App.navigateTo('admin');
        } else {
            Toast.show('Incorrect Admin Email or Password', 'error');
        }
    },
    render(container) {
        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/40 border border-slate-800 p-6 rounded-3xl">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-md bg-arctic-500/20 text-arctic-400 text-[10px] font-extrabold uppercase">Protected Portal</span>
                            <h2 class="text-2xl font-black text-white">Fudz Penguin Control Center</h2>
                        </div>
                        <p class="text-xs text-slate-400 mt-1">Manage database records: Menu, Customers, and Orders</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-3">
                        <button onclick="AdminPortal.clearCloudData()" class="px-3 py-2 text-xs font-bold rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition">
                            <i class="fa-solid fa-trash-can mr-1"></i> Clear Orders & Users
                        </button>
                        <div class="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
                            <button onclick="AdminPortal.switchTab('menu')" class="px-4 py-2 text-xs font-bold rounded-lg transition ${this.activeTab === 'menu' ? 'bg-arctic-600 text-white' : 'text-slate-400 hover:text-white'}">Menu Items</button>
                            <button onclick="AdminPortal.switchTab('customers')" class="px-4 py-2 text-xs font-bold rounded-lg transition ${this.activeTab === 'customers' ? 'bg-arctic-600 text-white' : 'text-slate-400 hover:text-white'}">Customers</button>
                            <button onclick="AdminPortal.switchTab('orders')" class="px-4 py-2 text-xs font-bold rounded-lg transition ${this.activeTab === 'orders' ? 'bg-arctic-600 text-white' : 'text-slate-400 hover:text-white'}">Orders</button>
                        </div>
                    </div>
                </div>
                <div id="admin-tab-content"></div>
            </div>
        `;
        this.renderTabContent();
    },
    async clearCloudData() {
        await Storage.set(Storage.KEY_ORDERS, []);
        await Storage.set(Storage.KEY_USERS, []);
        Storage.setCurrentUser(null);
        Toast.show('Cloud orders and users cleared', 'info');
        location.reload();
    },
    switchTab(tab) {
        this.activeTab = tab;
        this.render(document.getElementById('app-view'));
    },
    renderTabContent() {
        const container = document.getElementById('admin-tab-content');
        if (!container) return;
        if (this.activeTab === 'menu') this.renderMenuTab(container);
        else if (this.activeTab === 'customers') this.renderCustomersTab(container);
        else if (this.activeTab === 'orders') this.renderOrdersTab(container);
    },
    renderMenuTab(container) {
        const menu = Storage.get(Storage.KEY_MENU);
        container.innerHTML = `
            <div class="space-y-6">
                <div class="bg-slate-800/40 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <i class="fa-solid fa-plus text-arctic-400"></i> Add New Menu Item
                    </h3>
                    <form onsubmit="AdminPortal.handleAddMenuItem(event)" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <input type="text" id="adm-item-title" placeholder="Item Title" required class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white">
                        <select id="adm-item-category" class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white">
                            <option value="Penguin Combos">Penguin Combos</option>
                            <option value="Arctic Seafood">Arctic Seafood</option>
                            <option value="Frosty Treats">Frosty Treats</option>
                            <option value="Glacier Drinks">Glacier Drinks</option>
                        </select>
                        <input type="number" step="0.01" id="adm-item-price" placeholder="Price ($)" required class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white">
                        <input type="url" id="adm-item-image" placeholder="Image URL (Unsplash)" required class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white sm:col-span-2">
                        <input type="number" step="0.1" max="5" id="adm-item-rating" placeholder="Rating (1.0-5.0)" value="4.8" required class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white">
                        <textarea id="adm-item-desc" placeholder="Description" required class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white sm:col-span-3 h-20"></textarea>
                        <button type="submit" class="sm:col-span-3 py-2.5 bg-arctic-600 hover:bg-arctic-500 text-white font-bold text-xs rounded-xl transition">Save Item to Menu</button>
                    </form>
                </div>
                <div class="bg-slate-800/40 border border-slate-800 rounded-3xl overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800">
                                <tr>
                                    <th class="p-4">Item</th>
                                    <th class="p-4">Category</th>
                                    <th class="p-4">Price</th>
                                    <th class="p-4">Rating</th>
                                    <th class="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800 text-slate-300">
                                ${menu.map(item => `
                                    <tr class="hover:bg-slate-800/30">
                                        <td class="p-4 flex items-center gap-3 font-semibold text-white">
                                            <img src="${item.image}" class="w-10 h-10 rounded-lg object-cover">
                                            <span>${item.title}</span>
                                        </td>
                                        <td class="p-4">${item.category}</td> <td class="p-4 text-arctic-400 font-bold">$${item.price.toFixed(2)}</td>
                                        <td class="p-4">${item.rating}</td>
                                        <td class="p-4 text-right space-x-2">
                                            <button onclick="AdminPortal.deleteMenuItem('${item.id}')" class="p-2 text-rose-400 hover:text-rose-300">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },
    async handleAddMenuItem(e) {
        e.preventDefault();
        const newItem = {
            id: 'p_' + Date.now(),
            title: document.getElementById('adm-item-title').value,
            category: document.getElementById('adm-item-category').value,
            price: parseFloat(document.getElementById('adm-item-price').value),
            image: document.getElementById('adm-item-image').value,
            rating: parseFloat(document.getElementById('adm-item-rating').value),
            description: document.getElementById('adm-item-desc').value
        };
        const menu = Storage.get(Storage.KEY_MENU);
        menu.unshift(newItem);
        await Storage.set(Storage.KEY_MENU, menu);
        Toast.show('New menu item created!', 'success');
        this.renderTabContent();
    },
    async deleteMenuItem(id) {
        let menu = Storage.get(Storage.KEY_MENU);
        menu = menu.filter(i => i.id !== id);
        await Storage.set(Storage.KEY_MENU, menu);
        Toast.show('Menu item removed', 'info');
        this.renderTabContent();
    },
    renderCustomersTab(container) {
        const users = Storage.get(Storage.KEY_USERS);
        if (users.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 text-slate-500 bg-slate-800/40 border border-slate-800 rounded-3xl">
                    <p class="text-sm font-semibold">No registered customers yet.</p>
                    <p class="text-xs mt-1">New customer registrations will appear here.</p>
                </div>
            `;
            return;
        }
        container.innerHTML = `
            <div class="bg-slate-800/40 border border-slate-800 rounded-3xl overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800">
                            <tr>
                                <th class="p-4">Customer</th>
                                <th class="p-4">Email</th>
                                <th class="p-4">Phone</th>
                                <th class="p-4">Default Address</th>
                                <th class="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800 text-slate-300">
                            ${users.map(u => `
                                <tr class="hover:bg-slate-800/30">
                                    <td class="p-4 flex items-center gap-3 font-semibold text-white">
                                        <img src="${u.avatar}" class="w-8 h-8 rounded-full object-cover">
                                        <span>${u.name}</span>
                                    </td>
                                    <td class="p-4">${u.email}</td>
                                    <td class="p-4">${u.phone}</td>
                                    <td class="p-4 max-w-xs truncate">${u.address}</td>
                                    <td class="p-4 text-right">
                                        <button onclick="AdminPortal.deleteCustomer('${u.id}')" class="p-2 text-rose-400 hover:text-rose-300 transition" title="Delete Customer">
                                            <i class="fa-solid fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    async deleteCustomer(id) {
        let users = Storage.get(Storage.KEY_USERS);
        users = users.filter(u => u.id !== id);
        await Storage.set(Storage.KEY_USERS, users);
        Toast.show('Customer removed from database', 'info');
        this.renderTabContent();
    },
    renderOrdersTab(container) {
        const orders = Storage.get(Storage.KEY_ORDERS);
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 text-slate-500 bg-slate-800/40 border border-slate-800 rounded-3xl">
                    <p>No customer orders placed yet.</p>
                </div>
            `;
            return;
        }
        container.innerHTML = `
            <div class="bg-slate-800/40 border border-slate-800 rounded-3xl overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-800">
                            <tr>
                                <th class="p-4">Order ID</th>
                                <th class="p-4">Customer</th>
                                <th class="p-4">Ordered Items</th>
                                <th class="p-4">Total</th>
                                <th class="p-4">Status</th>
                                <th class="p-4 text-right">Update Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800 text-slate-300">
                            ${orders.map(o => `
                                <tr class="hover:bg-slate-800/30">
                                    <td class="p-4 font-bold text-white">${o.id}</td>
                                    <td class="p-4 font-semibold text-slate-200">${o.customerName}</td>
                                    <td class="p-4">
                                        <div class="space-y-1">
                                            ${(o.items || []).map(item => `
                                                <div class="flex items-center gap-2">
                                                    <span class="px-1.5 py-0.5 rounded bg-arctic-500/20 text-arctic-400 font-bold text-[10px]">${item.qty}x</span>
                                                    <span class="text-white font-medium">${item.title}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </td>
                                    <td class="p-4 text-arctic-400 font-bold">$${o.total.toFixed(2)}</td>
                                    <td class="p-4">
                                        <span class="px-2 py-1 rounded-full text-[10px] font-bold ${o.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}">
                                            ${o.status}
                                        </span>
                                    </td>
                                    <td class="p-4 text-right">
                                        <select onchange="AdminPortal.updateOrderStatus('${o.id}', this.value)" class="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white">
                                            <option value="Cooking" ${o.status==='Cooking'?'selected':''}>Cooking</option>
                                            <option value="Out for Delivery" ${o.status==='Out for Delivery'?'selected':''}>Out for Delivery</option>
                                            <option value="Delivered" ${o.status==='Delivered'?'selected':''}>Delivered</option>
                                        </select>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    async updateOrderStatus(orderId, status) {
        const orders = Storage.get(Storage.KEY_ORDERS);
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            await Storage.set(Storage.KEY_ORDERS, orders);
            Toast.show(`Order ${orderId} updated to ${status}`, 'success');
        }
    }
};

window.onload = function() {
    App.init();
};
