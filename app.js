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

// --- CLOUD STORAGE HELPER (Replaces LocalStorage for Shared Data) ---
const CloudDB = {
  async get(collectionName, docId) {
    try {
      const doc = await db.collection(collectionName).doc(docId).get();
      return doc.exists ? doc.data().value : null;
    } catch (e) {
      console.error("Error getting data from Firebase:", e);
      return null;
    }
  },
  async set(collectionName, docId, data) {
    try {
      await db.collection(collectionName).doc(docId).set({ value: data });
    } catch (e) {
      console.error("Error saving data to Firebase:", e);
    }
  }
};

// --- ADMIN CREDENTIALS ---
const ADMIN_EMAIL = "admin@fudzpenguin.com";
const ADMIN_PASS = "ralph1234#";

// --- STATE MANAGEMENT ---
let currentUser = JSON.parse(localStorage.getItem('fudz_current_user')) || null;
let cart = JSON.parse(localStorage.getItem('fudz_cart')) || [];

// --- DEFAULT MENU ITEMS ---
const defaultMenuItems = [
  { id: '1', name: 'Glacial Salmon Poke', price: 349, category: 'Seafood', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500' },
  { id: '2', name: 'Arctic Blue Lobster Roll', price: 599, category: 'Seafood', image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=500' },
  { id: '3', name: 'Sub-Zero Frosty Smoothie', price: 180, category: 'Drinks', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500' },
  { id: '4', name: 'Iceberg Seafood Ramen', price: 420, category: 'Meals', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500' }
];

// --- INITIALIZE APP DATA IN CLOUD ---
async function initializeCloudData() {
  let menu = await CloudDB.get('app_data', 'menu');
  if (!menu) {
    await CloudDB.set('app_data', 'menu', defaultMenuItems);
  }
  
  let users = await CloudDB.get('app_data', 'users');
  if (!users) {
    await CloudDB.set('app_data', 'users', []);
  }

  let orders = await CloudDB.get('app_data', 'orders');
  if (!orders) {
    await CloudDB.set('app_data', 'orders', []);
  }
}

// --- CORE APP FUNCTIONS ---
async function getMenuItems() {
  return (await CloudDB.get('app_data', 'menu')) || defaultMenuItems;
}

async function getRegisteredUsers() {
  return (await CloudDB.get('app_data', 'users')) || [];
}

async function getOrders() {
  return (await CloudDB.get('app_data', 'orders')) || [];
}

async function saveUsers(users) {
  await CloudDB.set('app_data', 'users', users);
}

async function saveOrders(orders) {
  await CloudDB.set('app_data', 'orders', orders);
}

// Run initialization on load
window.addEventListener('DOMContentLoaded', async () => {
  await initializeCloudData();
  if (typeof renderApp === 'function') {
    renderApp();
  }
});
