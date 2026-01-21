import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD3tsO5FLdvu5_LmCT7U1kW-2qhTfMRzRg",
  authDomain: "social-assist-sistema.firebaseapp.com",
  projectId: "social-assist-sistema",
  storageBucket: "social-assist-sistema.firebasestorage.app",
  messagingSenderId: "88500554526",
  appId: "1:88500554526:web:1c2c3278f1a03d659cd70f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
