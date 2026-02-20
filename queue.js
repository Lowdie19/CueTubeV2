// queue.js
import { askConfirm } from './ui/ui-modals.js';
import { showNotification, clearAllNotifications } from './ui/ui-notification.js';
import { showPopup } from './ui/ui-popups.js';
import { openModal } from './ui/ui-modals.js';
import { createScoreModal, showScore } from './ui/ui-score.js';
import { updateFloatingSuggestions, refreshSuggestions } from './floating-suggestions.js';
import { isUserLoggedIn, getCurrentUser } from './auth.js';
import { saveQueue, db } from './firebase-init.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firestore real-time listener
let unsubscribeQueueListener = null;
let lastQueueSnapshot = []; // keeps track of what we already notified about
let firstSnapshotHandled = false;

export function subscribeToUserQueue() {
  if (unsubscribeQueueListener) unsubscribeQueueListener();

  const user = getCurrentUser();
  if (!user) return;

  const userRef = doc(db, "users", user.username);

  unsubscribeQueueListener = onSnapshot(userRef, (snap) => {
    const data = snap.data();
    if (!data || !Array.isArray(data.queue)) return;

    const serverQueue = data.queue;

    // 🔹 Determine if this is the first snapshot after login
    const isRestore = !firstSnapshotHandled && queue.length === 0 && serverQueue.length > 0;

    if (isRestore) {
      showPopup("Previous Queue Restored! ✅", 2500, "cyan");
    }

    // 🔹 Detect truly new songs (skip for first snapshot restore)
    // 🔹 Detect truly new songs (skip for first snapshot restore)
    let newSongs = [];
    if (firstSnapshotHandled) {
      // Count occurrences in previous snapshot
      const lastCounts = lastQueueSnapshot.reduce((acc, s) => {
        acc[s.id] = (acc[s.id] || 0) + 1;
        return acc;
      }, {});

      const currentCounts = {}; // Track counts while iterating
      serverQueue.forEach((song, idx) => {
        currentCounts[song.id] = (currentCounts[song.id] || 0) + 1;

        const previousCount = lastCounts[song.id] || 0;

        // Only push if this occurrence is new
        if (currentCounts[song.id] > previousCount) {
          // Keep position in queue for correct "(No. x)"
          newSongs.push({ ...song, positionNumber: idx });
        }
      });
    }

    newSongs.forEach((song) => {
      let notifMessage = "";
      if (song.positionNumber === 0) notifMessage = song.title;
      else if (song.positionNumber === 1)
        notifMessage = `${song.title} <span style="margin-left:8px;color:gray;font-weight:bold;background:rgba(128,128,128,0.25);padding:3px 8px;border-radius:6px;">Next</span>`;
      else
        notifMessage = `${song.title} <span style="margin-left:8px;color:gray;font-weight:bold;background:rgba(128,128,128,0.25);padding:3px 8px;border-radius:6px;">No. ${song.positionNumber}</span>`;

      showPopup("Added to Queue! ✅", 2000, "cyan");
      showNotification("NEW SONG ADDED", notifMessage);
    });

    // 🔹 Update local queue to match Firestore
    queue.length = 0;
    serverQueue.forEach(song => queue.push(song));

    if (currentSongIndex >= queue.length) currentSongIndex = 0;
    renderQueue();
    updateUpNextBox();

    // 🔹 Auto-play first song if idle
    if (idleMode && queue.length > 0) playCurrentSong();

    // 🔹 Update lastQueueSnapshot to include all current songs
    lastQueueSnapshot = [...queue];

    firstSnapshotHandled = true; // mark first snapshot as processed
  });
}
// Stop listening when user logs out
export function unsubscribeQueue() {
  if (unsubscribeQueueListener) {
    unsubscribeQueueListener();
    unsubscribeQueueListener = null;
  }
}

// ------------------------------
// DOM ELEMENTS
// ------------------------------
const queueListDiv = document.getElementById('queueList');
const upNextBox = document.getElementById('upNextBox');
const upNextTitle = document.getElementById('upNextTitle');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const songInput = document.getElementById('songInput');
const actionBtn = document.getElementById('actionBtn');
const actionDropdown = document.getElementById('actionDropdown');
const nextSongBtn = document.getElementById('nextSongBtn');
const ytPlayer = document.getElementById('ytPlayer');

// MODAL DOM
const confirmModal = document.getElementById('confirmModal');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmModalYes = document.getElementById('confirmModalYes');
const confirmModalNo = document.getElementById('confirmModalNo');
const confirmModalClose = confirmModal.querySelector('.btnX');

// ------------------------------
// STATE
// ------------------------------
export const queue = [];
export function setCurrentSongIndex(i) {
  currentSongIndex = i;
}
export function getCurrentSongIndex() {
  return currentSongIndex;
}

let currentSongIndex = 0;
export let player = null;  // keep it exported
window.player = player;    // expose globally for score modal
let idleMode = true;

// Notification timers
let notifStartTimeout = null;
let notifEndInterval = null;

// For Idle
let idleQueue = [];
let idleIndex = 0;

// Flag to prevent profile reload during queue sync
let isQueueSyncing = false;

// ------------------------------
// IDLE VIDEOS (1980s vibe, no ads)
// ------------------------------
const idleVideos = [
  { title: "Rick Astley – Never Gonna Give You Up", id: "dQw4w9WgXcQ" },
  { title: "a-ha – Take On Me", id: "djV11Xbc914" },
  { title: "Michael Jackson – Billie Jean", id: "Zi_XLOBDo_Y" },
  { title: "Toto – Africa", id: "FTQbiNvZqaY" },
  { title: "Eye of the Tiger – Survivor", id: "btPJPFnesV4" },
  { title: "Girls Just Want to Have Fun – Cyndi Lauper", id: "PIb6AZdTr-A" },
  { title: "Bon Jovi – Livin’ On A Prayer", id: "lDK9QqIzhwk" },
  { title: "Wham! – Wake Me Up Before You Go‑Go", id: "pIgZ7gMze7A" },
  { title: "Journey – Don’t Stop Believin’", id: "x3idGV-7kSQ" },
];

// ---------------------------------------
// CHECK IF QUEUE TAB IS CURRENTLY ACTIVE
// ---------------------------------------
function isQueueTabActive() {
  const tabQueue = document.getElementById("tabQueue");
  return tabQueue && tabQueue.classList.contains("active");
}

// ------------------------------
// INIT YOUTUBE PLAYER
// ------------------------------
function initYTPlayer() {
  player = new YT.Player('ytPlayer', {
    height: '360',
    width: '640',
    events: {
      onReady: () => {
        window.player = player;   // <- add this line
        initIdlePlaylist(); 
        playIdleSong();
      },
      onStateChange: (event) => {
        if (event.data === YT.PlayerState.ENDED) (async () => await handleSongEnded())();
      }
    }
  });
}

// Load YT API if not loaded
if (window.YT && YT.Player) {
  initYTPlayer();
} else {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
  window.onYouTubeIframeAPIReady = initYTPlayer;
}

// ------------------------------
// SHOW CONFIRM MODAL
// ------------------------------
function showConfirmModal(title, message, onConfirm) {
  confirmModalTitle.textContent = title;
  confirmModalMessage.textContent = message;
  confirmModal.style.display = 'flex';

  // Clean previous YES listeners
  const yesClone = confirmModalYes.cloneNode(true);
  confirmModalYes.parentNode.replaceChild(yesClone, confirmModalYes);
  yesClone.addEventListener('click', () => {
    onConfirm();
    confirmModal.style.display = 'none';
  });

  confirmModalNo.onclick = confirmModalClose.onclick = () => {
    confirmModal.style.display = 'none';
  };
}
// ------------------------------
// NOW PLAYING TITLE
// ------------------------------
function updateNowPlayingTitle() {
  const nextIndex = currentSongIndex;

  if (queue.length > 0 && nextIndex < queue.length) {
    const nextSong = queue[nextIndex];
    nowPlayingTitle.innerHTML = nextSong.title;
  } else {
    // Fix: idle reference
    const idle = idleQueue[idleIndex];
    if (idle) {
      nowPlayingTitle.innerHTML = idle.title;
    } else {
      nowPlayingTitle.innerHTML = "(Idle)";
    }
  }

  nowPlayingTitle.style.display = "block";
  nowPlayingTitle.classList.remove("loading-text");
}

// ------------------------------
// UP-NEXT BOX
// ------------------------------
function updateUpNextBox() {
  upNextTitle.innerHTML = ''; // clear previous content
  const nextIndex = currentSongIndex + 1;

  if (queue.length >= 2 && nextIndex < queue.length) {
    // There **is a next song**
    const nextSong = queue[nextIndex];

    const wrapper = document.createElement('div');
    wrapper.classList.add('queue-item');

    const titleSpan = document.createElement('span');
    titleSpan.textContent = nextSong.title;
    titleSpan.style.display = 'block';
    titleSpan.style.whiteSpace = 'normal';
    titleSpan.style.wordBreak = 'break-word';
    titleSpan.style.lineHeight = '1.25em';
    titleSpan.style.paddingRight = '45px';

    const trash = document.createElement('i');
    trash.className = 'fa-solid fa-trash-can tab-icons';
    trash.addEventListener('click', (e) => {
      e.stopPropagation();
      playSound("clickA");

      askConfirm({
        title: "Remove from Queue",
        message: `Are you sure you want to remove<br><span style="color: cyan;">${nextSong.title}</span><br>from the queue?`,
        theme: "cyan",
        onYes: async () => {
          requestAnimationFrame(() => wrapper.classList.add('delete-anim'));
          playSound("trash");
          setTimeout(async () => {
            queue.splice(nextIndex, 1);
            renderQueue();
            await syncQueueToFirestore(); // ✅ Firestore updated
          }, 350);
        }
      });
    });

    wrapper.appendChild(titleSpan);
    wrapper.appendChild(trash);
    upNextTitle.appendChild(wrapper);
  } else {
    // No next song → show (None)
    upNextTitle.innerHTML = '<span>(None)</span>';
  }

  // Show only if Queue tab is active
  if (isQueueTabActive()) {
    upNextBox.classList.add("visible");
  } else {
    upNextBox.classList.remove("visible");
  }
}



// ------------------------------
// RENDER QUEUE
// ------------------------------
export function renderQueue() {
  if (!queueListDiv) return;
  queueListDiv.innerHTML = '';

  // Always update up-next box
  updateUpNextBox();

  // Build queue-item elements
  const start = currentSongIndex + 2;
  const queueItems = [];

  for (let i = start; i < queue.length; i++) {
    const song = queue[i];
    const div = document.createElement('div');
    div.classList.add('queue-item');
    div.textContent = song.title;

    const trash = document.createElement('i');
    trash.className = 'fa-solid fa-trash-can tab-icons';

    // ✅ Use helper function
    trash.addEventListener('click', createTrashClickHandler(i, song, div));

    div.appendChild(trash);
    queueItems.push(div);
  }

  // Append queue-items **regardless of tab**, but hide if tab inactive
  queueItems.forEach(item => queueListDiv.appendChild(item));
}

function createTrashClickHandler(index, song, divEl) {
  return (e) => {
    e.stopPropagation();
    playSound("clickA");
    askConfirm({
      title: "Remove from Queue",
      message: `
        Are you sure you want to remove<br>
        <span style="color: cyan;">${song.title}</span><br>
        from the queue?
      `,
      theme: "cyan",
      onYes: () => {
        requestAnimationFrame(() => divEl.classList.add('delete-anim'));
        playSound("trash");
        setTimeout(() => {
          removeFromQueue(index);
          renderQueue();
        }, 350);
      }
    });
  };
}


// ------------------------------
// ADD TO QUEUE (allow duplicates)
// ------------------------------
export async function addToQueue(songObj) {
  if (!songObj?.id) return;

  queue.push(songObj); // push locally

  if (isUserLoggedIn()) {
    const user = getCurrentUser();
    try {
      await saveQueue(user.username, queue); // Firestore snapshot triggers notification
    } catch (err) {
      console.error("Failed to save queue to Firestore:", err);
    }
  }

  renderQueue();

  if (queue.length === 1 && idleMode) {
    currentSongIndex = 0;
    playCurrentSong();
  }
}

// ------------------------------
// REMOVE FROM QUEUE
// ------------------------------
export async function removeFromQueue(index) {
  queue.splice(index, 1);
  if (index <= currentSongIndex && currentSongIndex > 0) currentSongIndex--;

  // Save queue per user
  if (isUserLoggedIn()) {
    const user = getCurrentUser();
    await saveQueue(user.username, queue);
  }

  renderQueue();
}

// ------------------------------
// SYNC EXISTING QUEUE WHEN USER LOGS IN + MERGE OFFLINE RESERVES (ALLOW DUPLICATES)
// ------------------------------
export async function handleLoginSync() {
  try {
    const { loadQueue, saveQueue } = await import('./firebase-init.js');

    const user = getCurrentUser();
    if (!user) return;
    const username = user.username;

    // 1️⃣ Load Firestore queue safely
    const firestoreQueue = Array.isArray(await loadQueue(username)) ? await loadQueue(username) : [];

    // 2️⃣ Offline queue (may have reserved songs before login)
    const offlineQueue = Array.isArray(queue) ? [...queue] : [];

    // 3️⃣ Merge queues: duplicates ALLOWED
    const mergedQueue = [...firestoreQueue, ...offlineQueue];

    // 4️⃣ Apply merged queue to local queue
    queue.length = 0;
    mergedQueue.forEach(song => queue.push(song));

    console.log("Merged queue on login (duplicates allowed):", queue);

    renderQueue();
    
    // New popups
    if (mergedQueue.length > 0) {
      showPopup("Previous Queue Restored! ✅", 2500, "cyan");
    }
    
    // 5️⃣ Auto-play if idle
    if (queue.length > 0 && idleMode) {
      currentSongIndex = 0;
      playCurrentSong();
    }

    // 6️⃣ Save merged queue back to Firestore
    await saveQueue(username, queue);

  } catch (err) {
    console.error("Failed to sync queue on login:", err);
  }
  subscribeToUserQueue();
}


// ------------------------------
// SCHEDULE NOTIFICATIONS (SAFE)
// ------------------------------
function scheduleNotifications() {
  if (!player || idleMode) return; // 🔹 do not schedule in idle

  // Clear previous timers first
  if (notifStartTimeout) {
    clearTimeout(notifStartTimeout);
    notifStartTimeout = null;
  }
  if (notifEndInterval) {
    clearInterval(notifEndInterval);
    notifEndInterval = null;
  }

  // --- 1 min after start: NO MORE SONGS ---
  notifStartTimeout = setTimeout(() => {
    if (idleMode || queue.length === 0) return; // 🔹 skip if idle or empty

    const nextSong = queue[currentSongIndex + 1];
    if (!nextSong) {
      showNotification("NOTICE", "No upcoming song.");
    }
  }, 60000);

  // --- 10 sec before end ---
  notifEndInterval = setInterval(() => {
    if (!player || idleMode || queue.length === 0) return; // 🔹 skip if idle or empty

    const duration = player.getDuration();
    const currentTime = player.getCurrentTime();

    if (duration > 10 && currentTime >= duration - 10) {
      const nextSong = queue[currentSongIndex + 1];

      if (nextSong) {
        showNotification("UP NEXT", nextSong.title);
      } else {
        showNotification("NOTICE", "No upcoming song.");
      }

      clearInterval(notifEndInterval);
      notifEndInterval = null;
    }
  }, 250);
}

// ------------------------------
// PLAY CURRENT SONG
// ------------------------------
function playCurrentSong() {
  if (!player || !player.loadVideoById) return;
  if (queue.length === 0 || currentSongIndex >= queue.length) {
    playIdleSong();
    return;
  }

  idleMode = false;
  const song = queue[currentSongIndex];
  player.loadVideoById(song.id);
  renderQueue();
  updateNowPlayingTitle();
  scheduleNotifications();
  updateFloatingSuggestions(idleMode);
  
}

// ------------------------------
// PLAY IDLE SONG
// ------------------------------
function playIdleSong() {
  if (!player || !player.loadVideoById) return;

  idleMode = true;

  // 🔥 CLEAR ANY PENDING NOTIFICATIONS
  if (notifStartTimeout) {
    clearTimeout(notifStartTimeout);
    notifStartTimeout = null;
  }
  if (notifEndInterval) {
    clearInterval(notifEndInterval);
    notifEndInterval = null;
  }

  // Pick the current idle video
  const idle = idleQueue[idleIndex];
  if (!idle) {
    // Safety fallback: initialize idle playlist if empty
    initIdlePlaylist();
    idleIndex = 0;
  }

  player.loadVideoById(idleQueue[idleIndex].id);

  // Update UI
  nowPlayingTitle.innerHTML = idleQueue[idleIndex].title;
  nowPlayingTitle.style.display = "block";
  upNextBox.classList.remove("visible");

  // 🔹 DO NOT schedule notifications in idle
  // scheduleNotifications();

  updateFloatingSuggestions(idleMode);

  // Remove loading effect
  nowPlayingTitle.classList.remove("loading-text");

  console.log("Idle playback started safely, no notifications scheduled.");
}

function nextIdleSong() {
  if (!idleQueue.length) initIdlePlaylist();

  const lastIdle = idleQueue[idleIndex]; // remember last played
  idleIndex++;

  // If we reached end, reshuffle
  if (idleIndex >= idleQueue.length) {
    idleQueue = shuffleArray([...idleVideos]);

    // make sure the first video isn't same as last played
    if (idleQueue[0].id === lastIdle.id) {
      const swapIndex = Math.floor(Math.random() * (idleQueue.length - 1)) + 1;
      [idleQueue[0], idleQueue[swapIndex]] = [idleQueue[swapIndex], idleQueue[0]];
    }

    idleIndex = 0;
  }

  playIdleSong();
}

// ------------------------------
// SONG ENDED
// ------------------------------
export async function handleSongEnded() {
  if (notifStartTimeout) clearTimeout(notifStartTimeout);
  if (notifEndInterval) clearInterval(notifEndInterval);
  notifStartTimeout = notifEndInterval = null;

  currentSongIndex++;

  // Remove finished songs
  if (currentSongIndex > 0 && queue.length > 0) {
    const remainingQueue = queue.slice(currentSongIndex);
    queue.length = 0;
    remainingQueue.forEach(song => queue.push(song));
    currentSongIndex = 0;

    await syncQueueToFirestore(); // ✅ Firestore updated
  }

  if (queue.length > 0) {
    playCurrentSong();
    setTimeout(() => showScore(), 200);
  } else {
    idleMode = true;
    playIdleSong();
  }
}

// ------------------------------
// NEXT SONG BUTTON
// ------------------------------
async function nextSongBtnAction() {
  if (queue.length === 0 && idleMode) {
    showPopup('Next music video ▶️', 2000, 'cyan');
    nextIdleSong();
    return;
  }

  if (queue.length === 0) {
    showPopup('No songs in queue! ❌', 2000, 'red');
    nextIdleSong();
    return;
  }

  showScore();
  setTimeout(async () => {
    if (currentSongIndex < queue.length - 1) {
      currentSongIndex++;
      playCurrentSong();
    } else {
      queue.length = 0;
      currentSongIndex = 0;
      idleMode = true;
      playIdleSong();
    }

    await syncQueueToFirestore(); // ✅ Firestore always updated
  }, 4000);
}

// Utility: shuffle array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Initialize idle playlist (shuffle)
function initIdlePlaylist() {
  idleQueue = shuffleArray([...idleVideos]); // full shuffle
  idleIndex = 0;
}

// ------------------------------
// YOUTUBE URL PARSER
// ------------------------------
function extractVideoID(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.substring(1);
    return u.searchParams.get('v');
  } catch {
    return null;
  }
}

function fetchYouTubeTitle(id) {
  return fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
    .then(r => r.json())
    .then(j => j.title)
    .catch(() => '(Unknown Title)');
}


// ------------------------------
// CLEAR SONGBOOK SEARCH INPUT
// ------------------------------
function clearSongbookSearch() {
  const searchInput = document.getElementById('songbookSearch');
  if (searchInput) {
    searchInput.value = '';
    import('./songbook.js').then(({ renderSongbook }) => {
      renderSongbook(); // re-render full songbook
    });
  }
}


// ------------------------------
// SONG INPUT ACTION (URL OR NUMBER)
// ------------------------------
if (songInput && actionBtn && actionDropdown) {
  // Pre-select default action (reserve)
  const defaultBtn = actionDropdown.querySelector('button[data-action="reserve"]');
  if (defaultBtn) defaultBtn.classList.add('active');
  
  const tabSongbook = document.getElementById('tabSongbook');
  const tabQueue = document.getElementById('tabQueue');

  // 🔹 Fixed: function expression instead of declaration
  const handleSongInput = async () => {
    const value = songInput.value.trim();
    if (!value) return showPopup('Paste song URL / link or<br>Input 4-digit song number first! ❌', 2000, 'red');

    const action = actionDropdown.querySelector('button[data-action].active')?.dataset.action || 'reserve';

    // ----------------------------
    // RESERVE ACTION
    // ----------------------------
    if (action === 'reserve') {
      let songObj = null;

      // 1️⃣ If input is a number → lookup in songbook
      if (/^\d+$/.test(value)) {
        const songNumber = parseInt(value);
        const { songbook } = await import('./songbook.js');
        const song = songbook.find(s => s.songNumber === songNumber);

        if (!song || !song.id) return showPopup('Song number not found! ❌', 2000, 'red');
        songObj = { id: song.id, title: song.title };
      } else {
        // 2️⃣ Otherwise, treat as YouTube URL
        const id = extractVideoID(value);
        if (!id) return showPopup('Invalid song URL / link! ❌', 2000, 'red');

        const title = await fetchYouTubeTitle(id);
        songObj = { id, title };
      }

      if (songObj) {
        await addToQueue(songObj);
        tabQueue?.click(); // switch to queue tab
      }
    }

    // ----------------------------
    // SAVE ACTION (YouTube URL only)
    // ----------------------------
    if (action === 'save') {
      const id = extractVideoID(value);
      if (!id) return showPopup('Invalid song URL / link! ❌', 2000, 'red');
      if (!isUserLoggedIn()) return showPopup('Login first to save! ❌', 2000, 'red');

      const title = await fetchYouTubeTitle(id);
      const { addSongToSongbook } = await import('./songbook.js');
      await addSongToSongbook({ id, title, url: value });
      refreshSuggestions();
      showPopup(`Saved to Songbook! ✅`, 2000, 'green');
      tabSongbook?.click();
    }

    songInput.value = '';
    actionDropdown.style.display = 'none';
  };

  // Click on action button opens the dropdown (UI toggle)
  actionBtn.addEventListener('click', () => {
    actionDropdown.style.display = actionDropdown.style.display === 'flex' ? 'none' : 'flex';
  });

  // Pressing Enter triggers the selected action
  songInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSongInput();
  });

  // Click on dropdown buttons triggers the same handler
  actionDropdown.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.add('active');
      actionDropdown.querySelectorAll('button[data-action]').forEach(b => {
        if (b !== btn) b.classList.remove('active');
      });
      handleSongInput();
    });
  });

  // Close dropdown if clicked outside
  document.addEventListener('click', (e) => {
    if (!actionBtn.contains(e.target) && !actionDropdown.contains(e.target))
      actionDropdown.style.display = 'none';
  });
}


// ------------------------------
// TAB SWITCH LISTENERS
// ------------------------------
const tabSongbook = document.getElementById('tabSongbook');
const tabQueue = document.getElementById('tabQueue');

if (tabSongbook) {
  tabSongbook.addEventListener('click', () => {
    tabSongbook.classList.add('active');
    tabSongbook.classList.remove('inactive');
    tabQueue.classList.remove('active');
    tabQueue.classList.add('inactive');

    const songbookListDiv = document.getElementById('songbookList');
    if (songbookListDiv) songbookListDiv.style.display = 'flex';

    // Hide queue UI when in songbook
    queueListDiv.style.display = 'none';
    upNextBox.classList.remove("visible");

    clearSongbookSearch();
  });
}

if (tabQueue) {
  tabQueue.addEventListener('click', () => {
    tabQueue.classList.add('active');
    tabQueue.classList.remove('inactive');
    tabSongbook.classList.remove('active');
    tabSongbook.classList.add('inactive');

    const songbookListDiv = document.getElementById('songbookList');
    if (songbookListDiv) songbookListDiv.style.display = 'none';

    // Show queue UI properly
    queueListDiv.style.display = 'block';
    upNextBox.classList.add("visible");

    clearSongbookSearch();
  });
}


// ------------------------------
// NEXT BUTTON DROPUP
// ------------------------------
const nextDropdown = document.getElementById('nextConfirmDropup');
if (nextSongBtn && nextDropdown) {
  nextSongBtn.addEventListener('click', () => {
    nextDropdown.style.display = nextDropdown.style.display === 'flex' ? 'none' : 'flex';
  });

  nextDropdown.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      nextDropdown.style.display = 'none';
      nextSongBtnAction();
    });
  });

  document.addEventListener('click', (e) => {
    if (!nextSongBtn.contains(e.target) && !nextDropdown.contains(e.target))
      nextDropdown.style.display = 'none';
  });
}

// ------------------------------
// UPDATE USER QUEUE
// ------------------------------
export async function updateQueue(newQueue) {
  queue.length = 0;
  newQueue.forEach(song => queue.push(song));

  await syncQueueToFirestore(); // cleaner, avoids duplicate try/catch

  renderQueue();
}

// Save queue to Firestore if user is logged in
async function syncQueueToFirestore() {
  if (!isUserLoggedIn()) return;

  const user = getCurrentUser();
  if (!user) return;

  try {
    isQueueSyncing = true; // 🔹 prevent profile UI from reloading

    await saveQueue(user.username, queue);

  } catch (err) {
    console.error("Failed to sync queue to Firestore:", err);
  } finally {
    setTimeout(() => { isQueueSyncing = false; }, 200); // small delay for safety
  }
}


// ------------------------------
// USER LOGOUT / STOP PLAYBACK
// ------------------------------
export function stopCurrentPlayback(startIdle = true) {
  if (!player) return;
  try {
    player.loadVideoById(''); 
    player.stopVideo?.();

    currentSongIndex = 0;
    idleMode = true;
    queue.length = 0;

    updateNowPlayingTitle();
    updateUpNextBox();

    if (notifStartTimeout) {
      clearTimeout(notifStartTimeout);
      notifStartTimeout = null;
    }
    if (notifEndInterval) {
      clearInterval(notifEndInterval);
      notifEndInterval = null;
    }

    // 🔹 Clear pending notif queue
    clearAllNotifications();

    if (startIdle) {
      playIdleSong();
    }

  } catch (err) {
    console.error("Failed to stop player:", err);
  }
}
