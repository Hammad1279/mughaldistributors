// 1. Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Aapko yahan apne Firebase project ki details daalni hain.
// Apne Firebase project console mein jayein, apni web app select karein,
// aur project settings mein se configuration object ko copy karke yahan paste karein.
// (You need to add your Firebase project's configuration here.
// Go to your Firebase project console, select your web app,
// and copy the configuration object from the project settings and paste it here.)
const firebaseConfig = {
  apiKey: "AIzaSyDCt-NWXEaGLFxfPXCKfHWDzrZfHjH6e0s",
  authDomain: "mughal-distributors-os.firebaseapp.com",
  projectId: "mughal-distributors-os",
  storageBucket: "mughal-distributors-os.firebasestorage.app",
  messagingSenderId: "822492013435",
  appId: "1:822492013435:web:1916fa8c106cc8aa4853de"
};

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 3. Get references to the services you want to use
export const auth = getAuth(app);
export const db = getFirestore(app);
