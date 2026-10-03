/* =========================================================
   Shree Shiv Alankar Mandir — Firebase + Cloudinary config
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBghagikxhoVpWg6-vyjWGBgpGC9VDJ6Tg",
  authDomain: "gaurav-shop-website.firebaseapp.com",
  projectId: "gaurav-shop-website",
  storageBucket: "gaurav-shop-website.firebasestorage.app",
  messagingSenderId: "62577914839",
  appId: "1:62577914839:web:d2decfb7217fbd74731192"
};

firebase.initializeApp(firebaseConfig);

// *** YE LINE CRITICAL HAI — iske bina `db` kahin bhi defined nahi hoga ***
const db = firebase.firestore();

// Cloudinary cloud name (uploads Cloudflare Worker se hote hain)
const CLOUDINARY_CLOUD_NAME = "nanffhss";
