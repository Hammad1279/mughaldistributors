import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCt-NWXEaGLFxfPXCKfHWDzrZfHjH6e0s",
  authDomain: "mughal-distributors-os.firebaseapp.com",
  projectId: "mughal-distributors-os",
  storageBucket: "mughal-distributors-os.firebasestorage.app",
  messagingSenderId: "822492013435",
  appId: "1:822492013435:web:1916fa8c106cc8aa4853de"
};

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export default firebase;
