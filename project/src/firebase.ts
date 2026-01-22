// firebase firestore commands
const {
  initializeApp,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  collection,
  arrayUnion,
  arrayRemove,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} = (window as any).firebase;

// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkecBr6HVzoI9wtokvVcDTvK7Y5ln3fXc",
  authDomain: "btd-2-18e6d.firebaseapp.com",
  projectId: "btd-2-18e6d",
  storageBucket: "btd-2-18e6d.firebasestorage.app",
  messagingSenderId: "283044997984",
  appId: "1:283044997984:web:158123e5432abbbcb0cc05"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// initialize firestore
const db = getFirestore(app);
const auth = getAuth(app);

export { db, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, arrayUnion, arrayRemove, auth, onAuthStateChanged,signInAnonymously, signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut, deleteDoc};

