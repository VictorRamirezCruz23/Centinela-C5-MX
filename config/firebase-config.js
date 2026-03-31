// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";

// Configuracion de firebase
const firebaseConfig = {
  apiKey: "AIzaSyB5D45RI21rRAJB9mlt1NeI6N4d3PDyEqg",
  authDomain: "centinela-mx.firebaseapp.com",
  projectId: "centinela-mx",
  storageBucket: "centinela-mx.firebasestorage.app",
  messagingSenderId: "215358382201",
  appId: "1:215358382201:web:cf7e0fffb00ca36b05b4a8",
  measurementId: "G-0S5PVJX04Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// Exportar las instancias
export { db, auth, storage, app, analytics };