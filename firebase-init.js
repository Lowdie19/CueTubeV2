// firebase-init.js — Username + PIN Auth + Songbook
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ------------------------------------------------------
// Firebase config
// ------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDKY72fjO-tiu3otsBzh3F3xJyXJB_uk",
  authDomain: "cuetube-cb101.firebaseapp.com",
  projectId: "cuetube-cb101",
  storageBucket: "cuetube-cb101.firebasestorage.app",
  messagingSenderId: "364944752363",
  appId: "1:364944752363:web:11279eeff48844073f88ae",
  measurementId: "G-XXBQKLJRZT"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ------------------------------------------------------
// Auth state
// ------------------------------------------------------
let currentUser = null;
const authListeners = [];

export function listenForAuthChanges(cb) {
  if (typeof cb === "function") {
    authListeners.push(cb);
    cb(currentUser); // trigger immediately
  }
}

function triggerAuthChange(user) {
  currentUser = user;
  authListeners.forEach(cb => cb(user));
}

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------
function generateCueId() {
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return (
    L[Math.floor(Math.random() * 26)] +
    L[Math.floor(Math.random() * 26)] +
    Math.floor(Math.random() * 10) +
    Math.floor(Math.random() * 10)
  );
}

const userDoc = (username) => doc(db, "users", username);

// ------------------------------------------------------
// REGISTER
// ------------------------------------------------------
export async function registerUser(username, pin, name) {
  if (!username) throw new Error("Username required");
  if (pin.length !== 4) throw new Error("PIN must be 4 digits");

  const ref = userDoc(username);
  const snap = await getDoc(ref);

  if (snap.exists()) throw new Error("Username already taken");

  const cueId = generateCueId();

  await setDoc(ref, {
    username,
    cueId,
    PIN: pin,
    profile: { name, color: "#ffffff33", icon: "fa-music" },
    songbook: [],
    queue: [],
    createdAt: serverTimestamp()
  });

  return true;
}

// ------------------------------------------------------
// LOGIN
// ------------------------------------------------------
export async function loginUser(username, pin) {
  const ref = userDoc(username);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("Account not found");

  const data = snap.data();
  if (data.PIN !== pin) throw new Error("Invalid PIN");

  triggerAuthChange(data);
  return data;
}

// ------------------------------------------------------
// LOGOUT
// ------------------------------------------------------
export async function logoutUser() {
  triggerAuthChange(null);
  return true;
}

// ------------------------------------------------------
// SONGBOOK / QUEUE
// ------------------------------------------------------
export async function saveSongToBoth(username, title, url) {
  const songData = { title, url, addedAt: serverTimestamp() };
  await updateDoc(userDoc(username), {
    songbook: arrayUnion(songData),
    queue: arrayUnion(songData)
  });
  return true;
}

export function saveSongbook(username, data) {
  return setDoc(userDoc(username), { songbook: data }, { merge: true });
}

export function saveQueue(username, data) {
  return setDoc(userDoc(username), { queue: data }, { merge: true });
}

export function saveProfile(username, profile) {
  return setDoc(userDoc(username), { profile }, { merge: true });
}


// ------------------------------------------------------
// LOAD USER SONGBOOK
// ------------------------------------------------------
export async function loadSongbook(username) {
  try {
    const snap = await getDoc(userDoc(username));
    if (!snap.exists()) return [];
    const data = snap.data();
    return Array.isArray(data.songbook) ? data.songbook : [];
  } catch (err) {
    console.error("Failed to load songbook:", err);
    return [];
  }
}

export function getCurrentUser() {
  return currentUser;
}

// ------------------------------------------------------
// LOAD USER QUEUE
// ------------------------------------------------------
export async function loadQueue(username) {
  try {
    const snap = await getDoc(userDoc(username));
    if (!snap.exists()) return [];
    const data = snap.data();
    return Array.isArray(data.queue) ? data.queue : [];
  } catch (err) {
    console.error("Failed to load queue:", err);
    return [];
  }
}