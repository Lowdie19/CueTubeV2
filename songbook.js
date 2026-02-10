// songbook.js
import { showPopup } from "./ui/ui-popups.js";
import { addToQueue } from "./queue.js";
import { refreshSuggestions } from "./floating-suggestions.js";
import { isUserLoggedIn, getCurrentUser, onAuthChange } from "./auth.js";
import { loadSongbook, saveSongbook } from "./firebase-init.js";

const tabSongbook = document.getElementById("tabSongbook");
const tabQueue = document.getElementById("tabQueue");
const songbookListDiv = document.getElementById("songbookList");
const searchInput = document.getElementById("songbookSearch");

export const songbook = [];

// ------------------------------
// CSS for spinner + icon
const style = document.createElement("style");
style.textContent = `
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.songbook-plus-icon { font-size: 16px; color: #ccc; cursor: pointer; opacity: 0; transition: opacity 0.2s ease, transform 0.15s ease, color 0.15s ease; }
.songItem:hover .songbook-plus-icon { opacity: 1; transform: scale(1.2); color: cyan; }
.songbook-plus-icon:active { transform: scale(0.85); color: red; }
`;
document.head.appendChild(style);

// ------------------------------
// RENDER SONGBOOK
export function renderSongbook(filtered = null) {
  const list = filtered ?? songbook;
  const validSongs = list.filter(s => s && s.title && s.id);

  const isSearchActive = searchInput.value.trim() !== "";
  songbookListDiv.innerHTML = "";

  // Handle empty list
  if (validSongs.length === 0) {
    const noteDiv = document.createElement("div");
    noteDiv.style.padding = "15px";
    noteDiv.style.color = "white";
    noteDiv.style.fontSize = "14px";
    noteDiv.style.lineHeight = "1.5";

    if (isSearchActive) {
      noteDiv.innerHTML = `<span style="font-size:16px; color: gray;">No results found...</span>`;
      songbookListDiv.appendChild(noteDiv);
      return;
    }

    if (!isUserLoggedIn()) {
      noteDiv.innerHTML = `<b style="font-size:16px; color:#ff00ff;">Login</b> / <b style="font-size:16px; color:#ff00ff;">Register</b><br>first to add music to your songbook.`;
    } else {
      noteDiv.innerHTML = `
        <b style="font-size:16px; color:#ff00ff;">Quick Guide</b><br>
        to add music to your songbook:<br><br>
        <span style="color:#ff00ff; font-weight:bold;">Step 1</span>: Open 
        <a href="https://www.youtube.com/results?search_query=karaoke" target="_blank" class="youtube-link">YouTube ↗</a><br><br>
        <span style="color:#ff00ff; font-weight:bold;">Step 2</span>: Copy the full URL.<br><br>
        <span style="color:#ff00ff; font-weight:bold;">Step 3</span>: Paste into 
        <span id="focusUrlBox" class="action-hover">URL Input box</span>, press <b>Action</b>, then <b>Save</b>.<br><br>
        <b>Action type:</b><br>
        <span style="color:#00ffff; font-weight:bold;">Save</span> - Songbook<br>
        <span style="color:#00ffff; font-weight:bold;">Reserve</span> - Queue
      `;

      setTimeout(() => {
        const urlBoxLink = document.getElementById("focusUrlBox");
        if (urlBoxLink) urlBoxLink.addEventListener("click", () => {
          const input = document.getElementById("songInput");
          if (input) {
            input.focus();
            input.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
      }, 10);
    }

    songbookListDiv.appendChild(noteDiv);
    return;
  }

  // Render songs
  validSongs.forEach((song, index) => {
    const div = document.createElement("div");
    div.classList.add("songItem");
    div.dataset.index = index;
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "space-between";
    div.style.cursor = "pointer";
    div.style.borderBottom = "1px solid #333";
    div.style.gap = "20px";

    // SONG NUMBER span
    const numberSpan = document.createElement("span");
    numberSpan.textContent = song.songNumber ?? "----"; // fallback if missing
    numberSpan.style.color = "cyan";
    numberSpan.style.fontWeight = "bold";
    numberSpan.style.width = "40px"; // fixed width to align numbers
    numberSpan.style.flexShrink = "0";

    // Title span
    const titleSpan = document.createElement("span");
    titleSpan.textContent = song.title;
    titleSpan.style.flex = "1";
    titleSpan.style.wordBreak = "break-word";

    // Plus icon
    const plusIcon = document.createElement("i");
    plusIcon.className = "fa-solid fa-circle-plus songbook-plus-icon";

    plusIcon.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!song.id) {
        showPopup('Cannot add song without a valid video ID ❌', 2000, 'red');
        return;
      }

      plusIcon.classList.remove("fa-circle-plus");
      plusIcon.classList.add("fa-circle-notch");
      plusIcon.style.color = "cyan";
      plusIcon.style.animation = "spin 0.9s linear infinite";
      plusIcon.style.pointerEvents = "none";

      try {
        await addToQueue({ title: song.title, id: song.id });
        await new Promise(res => setTimeout(res, 800));
      } finally {
        plusIcon.classList.remove("fa-circle-notch");
        plusIcon.classList.add("fa-circle-plus");
        plusIcon.style.color = "";
        plusIcon.style.animation = "none";
        plusIcon.style.pointerEvents = "auto";
      }
    });

    // Append all: number, title, plus icon
    div.append(numberSpan, titleSpan, plusIcon);
    songbookListDiv.appendChild(div);
  });
}


// ------------------------------
// HELPER: Generate unique 4-digit songNumber
function generateUniqueSongNumber() {
  let number;
  const existingNumbers = songbook.map(s => s.songNumber);
  do {
    number = Math.floor(1000 + Math.random() * 9000); // 1000–9999
  } while (existingNumbers.includes(number));
  return number;
}

// ------------------------------
// ADD SONG TO SONGBOOK & FIRESTORE
export async function addSongToSongbook(song) {
  if (!song || !song.title || !song.id) return;

  // Assign unique songNumber
  if (!song.songNumber) {
    song.songNumber = generateUniqueSongNumber();
  }

  // Avoid duplicates by video ID
  if (songbook.some(s => s.id === song.id)) return;

  songbook.push(song);

  if (isUserLoggedIn()) {
    const user = getCurrentUser();
    await saveSongbook(user.username, songbook);
  }

  renderSongbook();
}

// ------------------------------
// SEARCH
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  renderSongbook(songbook.filter((s) => s.title.toLowerCase().includes(query)));
});

// ------------------------------
// LOAD SONGBOOK FROM FIRESTORE
export async function loadUserSongbook() {
  if (!isUserLoggedIn()) {
    songbook.length = 0;
    renderSongbook();
    return;
  }

  const user = getCurrentUser();
  if (!user || !user.username) return;

  const data = await loadSongbook(user.username);
  songbook.length = 0;

  if (Array.isArray(data)) {
    data.forEach(song => {
      // Only add if not already in songbook
      if (!songbook.some(s => s.id === song.id)) {
        // Assign unique songNumber if missing
        if (!song.songNumber) {
          song.songNumber = generateUniqueSongNumber();
        }
        songbook.push(song);
      }
    });
  }

  // Save back updated songNumbers to Firestore
  if (isUserLoggedIn()) {
    await saveSongbook(user.username, songbook);
  }

  renderSongbook();
}

// ------------------------------
// AUTH CHANGE LISTENER
onAuthChange(() => loadUserSongbook());

// ------------------------------
// INITIAL LOAD
loadUserSongbook();
