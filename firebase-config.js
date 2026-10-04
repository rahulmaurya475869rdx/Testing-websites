/* =========================================================
   Shree Shiv Alankar Mandir — Firebase + Cloudinary config
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCgwgIIVyw4531YOiBOCT11wgbJ8RvmBn0",
  authDomain: "sree-shiv-alankar-mandir.firebaseapp.com",
  projectId: "sree-shiv-alankar-mandir",
  storageBucket: "sree-shiv-alankar-mandir.firebasestorage.app",
  messagingSenderId: "726949898910",
  appId: "1:726949898910:web:9813347104ee61d9a9e98f"
};

firebase.initializeApp(firebaseConfig);

// *** CRITICAL — iske bina `db` kahin defined nahi hoga ***
const db = firebase.firestore();

// Cloudinary cloud name (uploads Cloudflare Worker se hote hain)
const CLOUDINARY_CLOUD_NAME = "x75lvlx6";
