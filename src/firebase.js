// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";

// ✅ Firebase configuration for QuizRush
const firebaseConfig = {
  apiKey: "AIzaSyDIFqWokMYlIeinI28i9wWSnRCPNfK3ArQ",
  authDomain: "quizrush-a8480.firebaseapp.com",
  projectId: "quizrush-a8480",
  storageBucket: "quizrush-a8480.appspot.com",
  messagingSenderId: "1099205741342",
  appId: "1:1099205741342:web:a5f6ed5cc274115266970f"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Exports (Modular)
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Optional utility export if you need Firestore timestamps
export const timestamp = serverTimestamp;
