// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "schoolroute-kfeju",
  "appId": "1:1049183071922:web:e218893501b7c11d0b63ab",
  "storageBucket": "schoolroute-kfeju.firebasestorage.app",
  "apiKey": "AIzaSyDSIMWfzzIGlQJilR78x4LXx-McE5dDYrk",
  "authDomain": "schoolroute-kfeju.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "1049183071922"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
