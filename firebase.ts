
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDCt-NWXEaGLFxfPXCKfHWDzrZfHjH6e0s",
  authDomain: "mughal-distributors-os.firebaseapp.com",
  projectId: "mughal-distributors-os",
  storageBucket: "mughal-distributors-os.firebasestorage.app",
  messagingSenderId: "822492013435",
  appId: "1:822492013435:web:a9dde492aaaeb4664853de"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);