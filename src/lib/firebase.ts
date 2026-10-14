import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDqFXkP4SUSyD-DNbaG11G474oRdrDrLXM",
  authDomain: "ilis-docs-vnpt-camau.firebaseapp.com",
  projectId: "ilis-docs-vnpt-camau",
  storageBucket: "ilis-docs-vnpt-camau.firebasestorage.app",
  messagingSenderId: "336347041432",
  appId: "1:336347041432:web:7839261d470a5eb69f8aed",
};

// Khởi tạo Firebase App (Singleton Pattern)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
