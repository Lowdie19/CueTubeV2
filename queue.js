// queue.js
import { askConfirm } from './ui/ui-modals.js';
import { showNotification, clearAllNotifications } from './ui/ui-notification.js';
import { showPopup } from './ui/ui-popups.js';
import { openModal } from './ui/ui-modals.js';
import { createScoreModal, showScore } from './ui/ui-score.js';
import { updateFloatingSuggestions, refreshSuggestions } from './floating-suggestions.js';
import { isUserLoggedIn, getCurrentUser } from './auth.js';
import { saveQueue } from './firebase-init.js';


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
let player = null;
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
      onReady: () => {initIdlePlaylist(); playIdleSong();},
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
    trash.addEventListener('click', (e) => {
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
          requestAnimationFrame(() => div.classList.add('delete-anim'));
          playSound("trash");
          setTimeout(() => {
            removeFromQueue(i);
            renderQueue();
          }, 350);
        }
      });
    });

    div.appendChild(trash);
    queueItems.push(div);
  }

  // Append queue-items **regardless of tab**, but hide if tab inactive
  queueItems.forEach(item => queueListDiv.appendChild(item));

}

// ------------------------------
// ADD TO QUEUE (enhanced with per-user temporary save)
// ------------------------------
export async function addToQueue(songObj) {
  const wasEmpty = queue.length === 0;
  queue.push(songObj);

  // Save to Firestore per user (temporary queue)
  if (isUserLoggedIn()) {
    const user = getCurrentUser();
    try {
      await saveQueue(user.username, queue);
    } catch (err) {
      console.error("Failed to save queue to Firestore:", err);
    }
  }

  // Calculate position in queue (exclude currently playing song)
  const reserveNumber = queue.length - 1; 

  let notifMessage = "";

  if (reserveNumber === 0) {
    notifMessage = songObj.title;
  } else if (reserveNumber === 1) {
    notifMessage = `${songObj.title} 
      <span style="
        margin-left:8px;
        color: gray; 
        font-weight: bold;
        background: rgba(128,128,128,0.25);
        padding: 3px 8px;
        border-radius: 6px;
      ">Next</span>`;
  } else {
    notifMessage = `${songObj.title} 
      <span style="
        margin-left:8px;
        color: gray; 
        font-weight: bold;
        background: rgba(128,128,128,0.25);
        padding: 3px 8px;
        border-radius: 6px;
      ">No. ${reserveNumber}</span>`;
  }

  setTimeout(() => {
    showPopup("Added to Queue! ✅", 2000, "cyan");
  }, 800);
  
  setTimeout(() => {
    showNotification("NEW SONG ADDED", notifMessage);
  }, 4000);

  renderQueue();

  if (wasEmpty) {
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
// SYNC EXISTING QUEUE WHEN USER LOGS IN + FORCE PLAY IF NEEDED
// ------------------------------
export async function handleLoginSync() {
  try {
    const { loadQueue, saveQueue } = await import('./firebase-init.js');
    const { getCurrentUser } = await import('./firebase-init.js');

    const user = getCurrentUser();
    if (!user) return;

    const username = user.username;

    // load Firestore queue
    const savedQueue = await loadQueue(username);

    // Merge local queue + Firestore
    const merged = [...queue];

    for (const song of savedQueue) {
      if (!merged.find(s => s.url === song.url)) {
        merged.push(song);
      }
    }

    // Apply merged queue
    queue.length = 0;
    merged.forEach(s => queue.push(s));
    renderQueue();

    // 🎯 AUTO-PLAY LOGIC
    if (queue.length > 0) {
      // If idle was playing and Firestore queue is not empty → play queue
      if (idleMode) {
        currentSongIndex = 0;
        playCurrentSong();
      }
    }

    // Save merged queue back to Firestore
    await saveQueue(username, queue);

  } catch (err) {
    console.error("Failed to sync queue on login:", err);
  }
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
    showPopup('No songs in queue ❌', 2000, 'red');
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
// ACTION BUTTON DROPUP
// ------------------------------
if (actionBtn && actionDropdown) {
  const tabSongbook = document.getElementById('tabSongbook');
  const tabQueue = document.getElementById('tabQueue');

  actionBtn.addEventListener('click', () => {
    actionDropdown.style.display = actionDropdown.style.display === 'flex' ? 'none' : 'flex';
  });

actionDropdown.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const url = songInput.value.trim();
    if (!url) return showPopup('Paste a YouTube link first ❌', 2000, 'red');

    const id = extractVideoID(url);
    if (!id) return showPopup('Invalid YouTube link ❌', 2000, 'red');

    fetchYouTubeTitle(id).then(title => {
      if (action === 'reserve') {
        addToQueue({ id, title });
        tabQueue.click();
      }

      if (action === 'save') {
        // 🔹 Check if user is logged in
        if (!isUserLoggedIn()) {
          return showPopup('Please login first to save to Songbook ❌', 2500, 'red');
        }

        import('./songbook.js').then(async ({ addSongToSongbook }) => {
          const videoId = extractVideoID(url);
          await addSongToSongbook({ title, url, id: videoId });
          refreshSuggestions();
          showPopup('Saved to Songbook! ✅', 2000, 'green');
          tabSongbook.click();
        });
      }
    });

    songInput.value = '';
    actionDropdown.style.display = 'none';
  });
});

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