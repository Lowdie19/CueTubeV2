import { registerUser, loginUser, logoutUser, listenForAuthChanges } from './firebase-init.js';
import { showPopup } from './ui/ui-popups.js';
import { loadProfile } from './profile.js';
import { playSound, createVolumeIcon } from './sounds.js';
import { askConfirm } from './ui/ui-modals.js';
import * as Events from './modules/eventBus.js';
import { handleLoginSync } from './queue.js';

// DOM references
const authContainer = document.getElementById('authContainer');
const loginBox = document.getElementById('loginBox');
const registerBox = document.getElementById('registerBox');
const loginUsername = document.getElementById('loginUsername');
const loginPin = document.getElementById('loginPin');
const registerUsername = document.getElementById('registerUsername');
const registerPin = document.getElementById('registerPin');
const goRegister = document.getElementById('goRegister');
const goLogin = document.getElementById('goLogin');
const loginPlayIcon = loginBox.querySelector('.auth-play-icon');
const registerPlayIcon = registerBox.querySelector('.auth-play-icon');
const logoutBtn = document.getElementById("logoutBtn");
const profileVolumeSection = document.getElementById('profileVolumeSection');
const myProfileDiv = document.getElementById('myProfileDiv');
const myVolumeDiv = document.getElementById('myVolumeDiv');
const loginEye = loginBox.querySelector('.auth-eye-icon[data-target="loginPin"]');
const registerEye = registerBox.querySelector('.auth-eye-icon[data-target="registerPin"]');
const loadingBlock = document.getElementById('loadingBlock');
const logoutLink = logoutBtn.querySelector("a");

// State
let _currentUser = null;
const authListeners = [];

export function getCurrentUser() { return _currentUser; }
export function isUserLoggedIn() { return !!_currentUser; }
export function onAuthChange(cb) { if (typeof cb === 'function') authListeners.push(cb); }
function triggerAuthChange() { authListeners.forEach(cb => cb(_currentUser)); }

// -----------------------
// Show/hide login/register
// -----------------------
function showLogin() { loginBox.style.display='block'; registerBox.style.display='none'; }
function showRegister() { loginBox.style.display='none'; registerBox.style.display='block'; }
function clearAuthInputs() {
  loginUsername.value = loginPin.value = '';
  registerUsername.value = registerPin.value = '';
  loginPlayIcon.style.display = 'none';
  registerPlayIcon.style.display = 'none';
}
function resetPinEye(input, icon) { input.type="password"; icon.classList.replace('fa-eye-slash','fa-eye'); }

// Switch buttons
goRegister.addEventListener('click', e=>{e.preventDefault(); showRegister(); clearAuthInputs(); resetPinEye(loginPin,loginEye); resetPinEye(registerPin,registerEye);});
goLogin.addEventListener('click', e=>{e.preventDefault(); showLogin(); clearAuthInputs(); resetPinEye(loginPin,loginEye); resetPinEye(registerPin,registerEye);});

// Input listeners
[loginUsername,loginPin].forEach(el=>el.addEventListener('input',()=>{ loginPlayIcon.style.display=(loginUsername.value&&loginPin.value)?'inline-block':'none'; }));
[registerUsername,registerPin].forEach(el=>el.addEventListener('input',()=>{ registerPlayIcon.style.display=(registerUsername.value&&registerPin.value)?'inline-block':'none'; }));

// Numeric-only 4-digit PIN
[loginPin, registerPin].forEach(input=>{
  input.addEventListener('input',()=>{ let v=input.value.replace(/\D/g,''); if(v.length>4)v=v.slice(0,4); input.value=v; });
});

// PIN eye toggle
[loginEye,registerEye].forEach(icon=>icon.addEventListener('click',()=>{
  const input=document.getElementById(icon.dataset.target);
  if(input.type==='password'){input.type='text'; icon.classList.replace('fa-eye','fa-eye-slash');} 
  else {input.type='password'; icon.classList.replace('fa-eye-slash','fa-eye');}
}));

// -----------------------
// Actions
// -----------------------
async function loginAction(){
  const username=loginUsername.value.trim();
  const pin=loginPin.value.trim();
  if(!username||pin.length!==4) throw new Error('Enter username and 4-digit PIN! ❌');
  const userData=await loginUser(username,pin);
  return { username, userData };
}

async function registerAction(){
  const username=registerUsername.value.trim();
  const pin=registerPin.value.trim();
  if(!username) throw new Error('Enter username! ❌');
  if(pin.length!==4||isNaN(pin)) throw new Error('PIN must be 4 digits! ❌');
  await registerUser(username,pin,username);
  const userData=await loginUser(username,pin);
  return { username,userData };
}

// -----------------------
// Play icon binding
// -----------------------
function bindAuthIcon(icon, action,type){
  icon.addEventListener('click',async()=>{
    playSound('clickA');
    loadingBlock.style.display='flex';
    logoutBtn.style.display='none';
    const originalClass=icon.className;
    icon.className='fa-solid fa-circle-notch';
    icon.style.color='cyan';
    icon.style.fontSize='16px';
    icon.style.animation='spin 1s linear infinite';
    icon.style.pointerEvents='none';

  try {
    const { username, userData } = await action();
    _currentUser = { username, userData };
    triggerAuthChange();
    Events.emit('auth:login', _currentUser);

    // ---- LOAD USER QUEUE ----
import('./queue.js').then(async ({ queue, renderQueue, playCurrentSong, setCurrentSongIndex }) => {
  const { loadQueue, saveQueue } = await import('./firebase-init.js');
  const savedQueue = await loadQueue(username); // Firestore queue

  // Merge local (logout) queue with Firestore queue
  const mergedQueue = [...queue]; // start with local queue
  for (const song of savedQueue) {
    if (!mergedQueue.find(s => s.id === song.id)) {
      mergedQueue.push(song); // only add unique songs
    }
  }

  // Replace queue with merged result
  queue.length = 0;
  mergedQueue.forEach(song => queue.push(song));

  if (queue.length > 0) {
    // ✅ restore the previous playing index if available
    const prevIndex = savedQueue.currentSongIndex ?? 0;
    setCurrentSongIndex(prevIndex);

    renderQueue();

    // ✅ only autoplay the previous song if it was playing before
    if (savedQueue.isPlaying) {
      playCurrentSong();
    }

    // Save merged queue back to Firestore
    await saveQueue(username, queue);
  }
});

    showPopup(type==='login'?"Login successful! ✅":"Registered successfully! ✅",2500,'green');
    await new Promise(res=>setTimeout(res,800));
  } catch(err) {
    showPopup(err.message||'Action failed ❌',3000,'red');
  }finally{
      icon.className=originalClass;
      icon.style.color=''; icon.style.animation='none'; icon.style.pointerEvents='auto';
      loadingBlock.style.display='none';
      logoutBtn.style.display='block';
    }
    // after user logs in
    handleLoginSync();
  });
}

bindAuthIcon(loginPlayIcon, loginAction,'login');
bindAuthIcon(registerPlayIcon, registerAction,'register');

// -----------------------
// Logout
// -----------------------
logoutLink.addEventListener('click', e => {
  e.stopPropagation();
  playSound('clickB');

  askConfirm({
    title: "Confirm Logout",
    message: "Are you sure you want to logout?",
    theme: "cyan",

    onYes: async () => {
      const orig = logoutLink.textContent;
      logoutLink.textContent = 'Logging out...';
      logoutLink.style.pointerEvents = 'none';

      try {
        // 🔥 IMPORT SHARED QUEUE MODULE (same instance)
        const { queue, setCurrentSongIndex, renderQueue } = await import('./queue.js');
        const { saveQueue } = await import('./firebase-init.js');

        // 🔥 SAVE username BEFORE logout destroys it
        const username = _currentUser?.username || null;

        // 🔥 CLEAR LOCAL QUEUE
        queue.length = 0;
        setCurrentSongIndex(0);
        renderQueue();

        // 🔥 CLEAR FIRESTORE QUEUE
        if (username) {
          await saveQueue(username, []);
        }

        console.log("Queue cleared locally + Firestore.");

        // 🔥 CONTINUE LOGOUT FLOW
        await logoutUser();
        _currentUser = null;
        triggerAuthChange();
        Events.emit('auth:logout', null);

        profileVolumeSection.style.display = 'none';
        authContainer.style.display = 'flex';
        showLogin();
        clearAuthInputs();
        resetPinEye(loginPin, loginEye);
        resetPinEye(registerPin, registerEye);

        await new Promise(res => setTimeout(res, 800));
        showPopup('Logged out!', 2000, 'cyan');

      } catch (err) {
        showPopup(err.message || 'Logout failed ❌', 3000, 'red');

      } finally {
        logoutLink.textContent = orig;
        logoutLink.style.pointerEvents = 'auto';
      }
        import('./queue.js').then(({ stopCurrentPlayback }) => {
          stopCurrentPlayback();
        });
    }
  });
});

// -----------------------
// Enter key submission
// -----------------------
[loginUsername,loginPin].forEach(input=>input.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault(); if(loginUsername.value&&loginPin.value) loginPlayIcon.click(); }}));
[registerUsername,registerPin].forEach(input=>input.addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault(); if(registerUsername.value&&registerPin.value) registerPlayIcon.click(); }}));

// -----------------------
// Auth state listener (on page load)
listenForAuthChanges(async user=>{
  if(user){
    _currentUser={username:user.username,userData:user};
    profileVolumeSection.style.display='flex';
    authContainer.style.display='none';
    myProfileDiv.innerHTML=''; myVolumeDiv.innerHTML='';
    await loadProfile(user.username,myProfileDiv);
    createVolumeIcon(myVolumeDiv);
    logoutBtn.style.display='block';
  } else {
    _currentUser=null;
    authContainer.style.display='flex';
    profileVolumeSection.style.display='none';
    showLogin();
    clearAuthInputs();
    resetPinEye(loginPin,loginEye); resetPinEye(registerPin,registerEye);
  }
});

// ------------------------------
// STOP CURRENT PLAYBACK (for logout)
// ------------------------------
export function stopCurrentPlayback() {
  if (!player) return;
  try {
    player.loadVideoById('');  // force-stop YouTube player
    player.stopVideo?.();       // optional extra safety
    currentSongIndex = 0;
    idleMode = true;
    queue.length = 0;           // clear queue locally
    updateNowPlayingTitle();
    updateUpNextBox();
    console.log("Playback stopped (forced).");
  } catch (err) {
    console.error("Failed to stop player:", err);
  }
}