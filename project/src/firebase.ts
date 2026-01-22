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
  apiKey: 
  authDomain: 
  projectId:
  storageBucket: 
  messagingSenderId: 
  appId: 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// initialize firestore
const db = getFirestore(app);
const auth = getAuth(app);

export { db, doc, setDoc, getDoc, updateDoc, onSnapshot, collection, arrayUnion, arrayRemove, auth, onAuthStateChanged,signInAnonymously, signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut, deleteDoc};


