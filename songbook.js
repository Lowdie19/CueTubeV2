// songbook.js
import { showPopup } from "./ui/ui-popups.js";
import { addToQueue, isAdminMode } from "./queue.js";
import { refreshSuggestions } from "./floating-suggestions.js";
import { isUserLoggedIn, getCurrentUser, onAuthChange } from "./auth.js";
import { loadSongbook, saveSongbook } from "./firebase-init.js";
import { askConfirm } from "./ui/ui-modals.js";

const tabSongbook = document.getElementById("tabSongbook");
const tabQueue = document.getElementById("tabQueue");
const songbookListDiv = document.getElementById("songbookList");
const searchInput = document.getElementById("songbookSearch");

// DELETE SELECTED BUTTON
const style2 = document.createElement("style");
style2.textContent = `
.song-selected {
  background: rgba(255,255,255,0.09);
  transition: background 0.15s ease;
}
`;
document.head.appendChild(style2);
const deleteSelectedBtn = document.createElement("button");
deleteSelectedBtn.setAttribute("data-theme", "red"); // <-- use red theme
deleteSelectedBtn.classList.add("full-width");       // optional: full-width button
deleteSelectedBtn.style.margin = "10px auto 15px auto";
deleteSelectedBtn.style.maxWidth = "250px";
deleteSelectedBtn.style.display = "none";

// Add icon with spacing
const trashIcon = document.createElement("i");
trashIcon.className = "fa-solid fa-trash-can";
trashIcon.style.marginRight = "6px"; // space between icon and text

// Add text
const btnText = document.createTextNode("Delete Selected (0)");

// Append icon and text
deleteSelectedBtn.appendChild(trashIcon);
deleteSelectedBtn.appendChild(btnText);

// Append button to drawer
const leftDrawer = document.getElementById("leftDrawer");
leftDrawer.appendChild(deleteSelectedBtn);
export const songbook = [];

// MULTI SELECT MODE
let selectionMode = false;
let holdTimer = null;
const selectedSongs = new Set();

// ------------------------------
// CSS for spinner + icon
const style = document.createElement("style");
style.textContent = `
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.songbook-plus-icon { font-size: 16px; color: #ccc; cursor: pointer; opacity: 0; transition: opacity 0.2s ease, transform 0.15s ease, color 0.15s ease; }
.songItem:hover .songbook-plus-icon { opacity: 1; transform: scale(1.2); color: cyan; }
.songbook-plus-icon:active { transform: scale(0.85); color: red; }
@keyframes sbDelete {
  from { opacity: 1; transform: translateX(0); filter: blur(0); }
  to   { opacity: 0; transform: translateX(-22px); filter: blur(3px); }
}
.delete-anim {
  animation: sbDelete 0.32s ease forwards;
}
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
    
    if (!isUserLoggedIn() && songbook.length === 0) {
      const noteDiv = document.createElement("div");
      noteDiv.style.padding = "15px";
      noteDiv.style.color = "white";
      noteDiv.style.fontSize = "14px";
      noteDiv.style.lineHeight = "1.5";
      noteDiv.innerHTML = `<span style="font-size:16px; color: gray;">No songs in the community songbook yet. Be the first to add one!</span>`;
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
        <span id="focusUrlBox" class="action-hover">Input box</span>, press <b>Action</b>, then <b>Save</b>.<br><br>
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
let activeTrashItem = null; // keep track of which song is showing trash

validSongs.forEach((song, index) => {
  const div = document.createElement("div");
  
      if (selectionMode && selectedSongs.has(index)) {
        div.classList.add("song-selected");
    }

    // LONG PRESS (2 seconds) to activate selection mode
    div.addEventListener("pointerdown", () => {

      if (selectionMode) return;

      holdTimer = setTimeout(() => {
        enterSelectionMode();
      }, 1500);

    });

    div.addEventListener("pointerup", () => {
      clearTimeout(holdTimer);
    });

    div.addEventListener("pointerleave", () => {
      clearTimeout(holdTimer);
    });

    div.addEventListener("click", () => {

      if(!selectionMode) return;

      const checkbox = div.querySelector(".song-select");
      if(!checkbox) return;

      checkbox.checked = !checkbox.checked;

      if (checkbox.checked) {
          selectedSongs.add(index);
          div.classList.add("song-selected");   // highlight ON
      } else {
          selectedSongs.delete(index);
          div.classList.remove("song-selected"); // highlight OFF
      }

      deleteSelectedBtn.textContent =
          "Delete Selected (" + selectedSongs.size + ")";
    });

  div.classList.add("songItem");

    if(selectionMode){
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "song-select";
      checkbox.style.marginRight = "10px";
      div.prepend(checkbox);
    }

  div.dataset.index = index;
  div.style.display = "flex";
  div.style.alignItems = "center";
  div.style.justifyContent = "space-between";
  div.style.cursor = "pointer";
  div.style.borderBottom = "1px solid #333";
  div.style.gap = "20px";

  const numberSpan = document.createElement("span");
  numberSpan.textContent = song.songNumber ?? "----";
  numberSpan.style.color = "cyan";
  numberSpan.style.fontWeight = "bold";
  numberSpan.style.width = "40px";
  numberSpan.style.flexShrink = "0";

  const titleSpan = document.createElement("span");
  titleSpan.textContent = song.title;
  titleSpan.style.flex = "1";
  titleSpan.style.wordBreak = "break-word";

  // Reserve icon
  const plusIcon = document.createElement("i");
  plusIcon.className = "fa-solid fa-circle-plus songbook-plus-icon";
  plusIcon.style.cursor = "pointer";
  
    // 🔥 Hide + icon entirely in delete-selection mode
  if (selectionMode) {
    plusIcon.style.display = "none";
  }


  plusIcon.addEventListener("click", async (e) => {
    // ⛔ In delete-selection mode: do nothing
    if (selectionMode) {
      e.stopPropagation();
      return;
  }
    
    e.stopPropagation();
    playSound("clickA");
    if (!song.id) {
      showPopup("Cannot add song without a valid video ID ❌", 2000, "red");
      return;
    }

    plusIcon.classList.remove("fa-circle-plus");
    plusIcon.classList.add("fa-circle-notch");
    plusIcon.style.color = "cyan";
    plusIcon.style.animation = "spin 0.9s linear infinite";
    plusIcon.style.pointerEvents = "none";

    try {
      await addToQueue({ title: song.title, id: song.id });
      await new Promise((res) => setTimeout(res, 800));
    } finally {
      plusIcon.classList.remove("fa-circle-notch");
      plusIcon.classList.add("fa-circle-plus");
      plusIcon.style.color = "";
      plusIcon.style.animation = "none";
      plusIcon.style.pointerEvents = "auto";
    }
  });

  // Trash icon
  const trashIcon = document.createElement("i");
  trashIcon.className = "fa-solid fa-trash-can songbook-plus-icon";
  trashIcon.style.color = "red";
  trashIcon.style.cursor = "pointer";
  trashIcon.style.display = "none";

  trashIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    playSound("clickA");
    
    // Block deletion of global songbook unless admin
    if (!isAdminMode && !isUserLoggedIn()) {
      showPopup("Community songs cannot be deleted ❌", 2000, "red");
      return;
    }

    askConfirm({
      title: "Delete from Songbook",
      message: `
        Are you sure you want to delete<br>
        <span style="color: cyan;">${song.title}</span><br>
        from your songbook?
      `,
      theme: "cyan",

    onYes: async () => {
      requestAnimationFrame(() => div.classList.add("delete-anim"));
      playSound("trash");

      setTimeout(async () => {
        songbook.splice(index, 1);

        if (isAdminMode) {
          // Admin deletes from global songbook
          await saveSongbook("global_songbook", songbook);

        } else if (isUserLoggedIn()) {
          // Normal user deletes from their personal songbook
          const user = getCurrentUser();
          await saveSongbook(user.username, songbook);
        }

        renderSongbook();
      }, 320);
      }
    });
  });

  // ---------------------------
  // Double-tap / double-click to toggle
  // ---------------------------
  let lastTap = 0;
  div.addEventListener("pointerdown", (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

  // 🔥 Prevent toggle while in delete-selection mode
  if (selectionMode) return;

    if (tapLength < 400 && tapLength > 0) {
      // If another item has trash active, reset it
      if (activeTrashItem && activeTrashItem !== div) {
        const prevPlus = activeTrashItem.querySelector(".fa-circle-plus");
        const prevTrash = activeTrashItem.querySelector(".fa-trash-can");
        prevPlus.style.display = "inline-block";
        prevTrash.style.display = "none";
      }

      // Toggle current item
      if (plusIcon.style.display !== "none") {
        plusIcon.style.display = "none";
        trashIcon.style.display = "inline-block";
        activeTrashItem = div; // set as active
      } else {
        plusIcon.style.display = "inline-block";
        trashIcon.style.display = "none";
        activeTrashItem = null;
      }
    }

    lastTap = currentTime;
  });

  // Append all
  div.append(numberSpan, titleSpan, plusIcon, trashIcon);
  songbookListDiv.appendChild(div);
});

// ---------------------------
// Click outside resets active trash
// ---------------------------
document.addEventListener("pointerdown", (e) => {
  if (activeTrashItem && !activeTrashItem.contains(e.target)) {
    const prevPlus = activeTrashItem.querySelector(".fa-circle-plus");
    const prevTrash = activeTrashItem.querySelector(".fa-trash-can");
    prevPlus.style.display = "inline-block";
    prevTrash.style.display = "none";
    activeTrashItem = null;
  }
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

  if (!song.songNumber) song.songNumber = generateUniqueSongNumber();

  if (songbook.some(s => s.id === song.id)) return;
  songbook.push(song);

  if (isUserLoggedIn()) {
    const user = getCurrentUser();
    // Save to personal account
    await saveSongbook(user.username, songbook);
  }

  // Save/update to global account for everyone
  const globalData = await loadSongbook("global_songbook") || [];
  if (!globalData.some(s => s.id === song.id)) {
    globalData.push(song);
    await saveSongbook("global_songbook", globalData);
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
// LOAD SONGBOOK FROM FIRESTORE (updated)
export async function loadUserSongbook() {
  songbook.length = 0;

  let data = [];

  if (isUserLoggedIn()) {
    const user = getCurrentUser();
    if (!user || !user.username) return;

    data = await loadSongbook(user.username) || [];
  } else {
    // Non-logged-in users: load global songbook
    data = await loadSongbook("global_songbook") || [];
  }

  if (Array.isArray(data)) {
    data.forEach(song => {
      if (!songbook.some(s => s.id === song.id)) {
        if (!song.songNumber) song.songNumber = generateUniqueSongNumber();
        songbook.push(song);
      }
    });
  }

  // ------------------------------
  // Sort alphabetically by title
  songbook.sort((a, b) => {
    if (!a.title) return 1;
    if (!b.title) return -1;
    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
  });

  // ------------------------------
  // Render songbook (Quick Guide logic still works)
  renderSongbook();
}


// ------------------------------
// DELETE SELECTION MODE
function enterSelectionMode(){

  if(selectionMode) return;

  selectionMode = true;
  selectedSongs.clear();

  deleteSelectedBtn.style.display = "block";

  renderSongbook();

}

deleteSelectedBtn.addEventListener("click", async () => {

  // Block non-admin from deleting community songs
  if (!isAdminMode && !isUserLoggedIn()) {
    showPopup("Community songs cannot be deleted ❌", 2000, "red");
    return;
  }

  // If no songs selected, show error
  if (selectedSongs.size === 0) {
    showPopup("No songs selected ❌", 2000, "red");
    return;
  }

  // AskConfirm with actual number of selected songs
  askConfirm({
    title: "Delete Selected Songs",
    message: `
      Are you sure you want to delete<br>
      <span style="color: cyan;">${selectedSongs.size} selected song${selectedSongs.size > 1 ? "s" : ""}</span><br>
      from your songbook?
    `,
    theme: "cyan",
    onYes: async () => {

      // Perform the deletion
      const indexes = Array.from(selectedSongs).sort((a, b) => b - a);
      for (const i of indexes) {
        songbook.splice(i, 1);
      }
      selectedSongs.clear();

      // Save updated list
      if (isAdminMode) {
        await saveSongbook("global_songbook", songbook);
      } else if (isUserLoggedIn()) {
        const user = getCurrentUser();
        await saveSongbook(user.username, songbook);
      }

      selectionMode = false;
      deleteSelectedBtn.style.display = "none";
      deleteSelectedBtn.textContent = "Delete Selected (0)";

      showPopup(
        `Deleted ${indexes.length} song${indexes.length > 1 ? "s" : ""}!`,
        2500,
        "cyan"
      );

      renderSongbook();
    }
  });

});

// ------------------------------
// Cancel selection when clicking outside
document.addEventListener("click", (event) => {

  if (!selectionMode) return; // if not in select mode, do nothing

  // If click happens inside the songbook list or the delete button, do nothing
  if (songbookListDiv.contains(event.target) ||
      deleteSelectedBtn.contains(event.target)) {
    return;
  }

  // Otherwise cancel selection mode
  selectionMode = false;
  selectedSongs.clear();
  deleteSelectedBtn.style.display = "none";
  deleteSelectedBtn.textContent = "Delete Selected (0)";

  renderSongbook(); // re-render list without checkboxes
});


// ------------------------------
// AUTH CHANGE LISTENER
onAuthChange(() => loadUserSongbook());

// ------------------------------
// INITIAL LOAD
loadUserSongbook();
