import { setupInputsC } from "./ui/ui-inputs.js";
import { db } from "./firebase-init.js";
import { collection, getDocs, updateDoc, arrayUnion, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showPopup } from "./ui/ui-popups.js";
import { askConfirm } from "./ui/ui-modals.js";

let connectedCueId = null; // persistent connection

export function openRemoteUI() {
  const oldUI = document.getElementById("remoteUI");
  if (oldUI) oldUI.remove();

  const songbook = window.currentSongbook || [];

  const ui = document.createElement("div");
  ui.id = "remoteUI";
  ui.style.position = "fixed";
  ui.style.top = "0";
  ui.style.left = "0";
  ui.style.width = "100%";
  ui.style.height = "100%";
  ui.style.background = "#111";
  ui.style.color = "white";
  ui.style.zIndex = "3000";
  ui.style.overflow = "hidden";

  const headerTitle = window.isUserLoggedIn ? `${window.userName}'s` : "Community";

ui.innerHTML = `
  <button class="btnX" id="cueCloseBtn" title="Close" 
    style="position:fixed; top:10px; right:10px; z-index:4000;">✕</button>

  <div id="remoteHeader"
    style="
      position:fixed; top:0; left:0; width:100%;
      background:#111; padding:20px; padding-bottom:12px;
      box-sizing:border-box; z-index:3001;
    "
  >

    <!-- LINE 1: COMMUNITY -->
    <div style="font-size:24px; font-weight:bold; color:magenta; margin-bottom:6px;">
      ${headerTitle}
    </div>

    <!-- LINE 2: Songbook + Play Icon + Connected Name + Disconnect -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">

      <!-- LEFT GROUP: Songbook + Connected Name + Play -->
      <div style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:14px; color:gray;">Songbook</span>

        <!-- Connected Profile Name + Play Icon -->
        <span id="connectionIndicator" style="font-size:14px; color:#00ff88; display:flex; align-items:center; gap:4px;">
          ${connectedCueId ? `<span style="color:cyan;">▶</span>${connectedCueId}` : ""}
        </span>
      </div>

      <!-- RIGHT SIDE: Disconnect Button -->
      <button id="disconnectBtn"
        style="
          padding:6px 14px;
          border-radius:8px;
          background:red;
          color:white;
          font-size:14px;
        ">
        Disconnect
      </button>

    </div>

    <!-- SEARCH FIELD -->
    <input id="remoteSearch"
      placeholder="Search songs..."
      class="ui-input"
      data-theme="magenta"
      data-icon="search"
      style="
        width:100%;
        margin-top:12px;
        box-sizing:border-box;
      "
    >
  </div>

  <div id="remoteSongList"
    style="
      position:absolute; left:0; width:100%;
      overflow-y:auto;
      padding:0 20px 50px;
      box-sizing:border-box;
      display:flex; flex-direction:column; gap:8px;
    "
  ></div>
`;
  
  document.body.appendChild(ui);
  setupInputsC();

  const header = ui.querySelector("#remoteHeader");
  const HEADER_HEIGHT = header.offsetHeight;
  const listEl = ui.querySelector("#remoteSongList");
  listEl.style.top = HEADER_HEIGHT + "px";
  listEl.style.height = `calc(100% - ${HEADER_HEIGHT}px)`;
  const searchEl = ui.querySelector("#remoteSearch");

  renderSongs(songbook, listEl);

  searchEl.addEventListener("input", () => {
    const key = searchEl.value.toLowerCase();
    const filtered = songbook.filter(s => s.title.toLowerCase().includes(key));
    renderSongs(filtered, listEl);
  });

  ui.querySelector("#cueCloseBtn").onclick = () => ui.remove();
  ui.querySelector("#disconnectBtn").onclick = () => {
    connectedCueId = null;
    showPopup("Disconnected", 2000, "cyan");
  };
}

// New helper: handles song row clicks
function handleSongClick(song) {
  if (connectedCueId) {
    renderSendModalFixed(song);
  } else {
    renderSendModal(song);
  }
}

// Render songs list
function renderSongs(list, container) {
  container.innerHTML = "";

  if (!list || list.length === 0) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "flex-start";
    row.style.padding = "10px 5px";
    row.style.borderBottom = "1px solid #333";
    row.style.opacity = "0.6";
    row.textContent = "The Songbook is empty…";
    container.appendChild(row);
    return;
  }

  list.forEach(song => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.padding = "10px 5px";
    row.style.borderBottom = "1px solid #333";
    row.innerHTML = `<span>${song.title}</span><span>${song.songNumber || ""}</span>`;

    row.addEventListener("click", () => {
      // Highlight
      row.style.transition = "background 1.0s ease";
      row.style.background = "#444";
      setTimeout(() => { row.style.background = "transparent"; }, 1000);

      // Use the new helper to decide which modal to show
      handleSongClick(song);
    });

    container.appendChild(row);
  });
}

// Initial Send modal (input + optional connect)
function renderSendModal(song) {
  askConfirm({
    title: "Send",
    message: `
      <span style="color: cyan;">${song.title}</span><br>
      <input id="cueInputModal" class="ui-input" data-theme="white" placeholder="Input receiver's Cue ID" style="width:100%; margin-top:15px; box-sizing:border-box;">
      <div style="margin-top:8px; text-align:center;">
        <span style="color:gray;">or</span> <span id="openConnectModal" style="color:white; text-decoration:underline; cursor:pointer;">Connect</span>
      </div>
    `,
    theme: "magenta",
    onYes: async () => {
      const cueInput = document.getElementById("cueInputModal");
      const targetCueId = cueInput?.value.trim();
      if (!targetCueId) {
        showPopup("Cannot be empty ❌", 2000, "red");
        return false;
      }
      return await sendToUser(targetCueId, song);
    },
    onNo: () => {}
  });

  setupInputsC();

  const connectLink = document.getElementById("openConnectModal");
  if (connectLink) {
    connectLink.addEventListener("click", e => {
      e.stopPropagation();
      openConnectModal(song);
    });
  }
}

// Connect modal
function openConnectModal() {
  askConfirm({
    title: "Connect to",
    message: `<input id="connectCueInput" class="ui-input" data-theme="white" placeholder="Input Cue ID / Profile name" style="width:100%; box-sizing:border-box;">`,
    theme: "cyan",
    onYes: async () => {
      const cueInput = document.getElementById("connectCueInput");
      const targetCueId = cueInput?.value.trim();
      if (!targetCueId) {
        showPopup("Cannot be empty ❌", 2000, "red");
        return false;
      }
      return await connectToUser(targetCueId); // new function
    },
    onNo: () => {}
  });

  setupInputsC();
}

async function connectToUser(cueIdOrName) {
  try {
    const usersRef = collection(db, "users");
    const usersSnap = await getDocs(usersRef);
    const targetUserDoc = usersSnap.docs.find(docSnap => {
      const data = docSnap.data();
      return data.cueId === cueIdOrName || data.profile?.name?.toLowerCase() === cueIdOrName.toLowerCase();
    });

    if (!targetUserDoc) {
      showPopup("User not registered ❌", 2000, "red");
      return false;
    }

    connectedCueId = targetUserDoc.data().cueId; // persist connection
    showPopup(`Connected to ${targetUserDoc.data().profile?.name || connectedCueId} ✅`, 2000, "green");

    // Update the indicator
    const indicator = document.getElementById("connectionIndicator");
    if (indicator) {
      indicator.textContent = `${targetUserDoc.data().profile?.name || connectedCueId}`;
    }

    return true;
  } catch (err) {
    console.error(err);
    showPopup("Failed ❌", 2000, "red");
    return false;
  }
}

// Send modal after connection (falls back to initial modal if disconnected)
function renderSendModalFixed(song) {
  if (!connectedCueId) {
    return renderSendModal(song);
  }

  askConfirm({
    title: "Send",
    message: `<span style="color: cyan;">${song.title}</span>`,
    theme: "magenta",
    onYes: async () => {
      return await sendToUser(connectedCueId, song);
    },
    onNo: () => {}
  });
  setupInputsC();
}

// 🔹 Core function to push song to Firestore user queue
async function sendToUser(cueId, song, isConnect = false) {
  try {
    const usersRef = collection(db, "users");
    const usersSnap = await getDocs(usersRef);
    const targetUserDoc = usersSnap.docs.find(docSnap => {
      const data = docSnap.data();
      return data.cueId === cueId || data.profile?.name?.toLowerCase() === cueId.toLowerCase();
    });
    
    if (!targetUserDoc) {
      showPopup("User not registered ❌", 2000, "red");
      return false;
    }

    // Only persist connection if this is a "Connect" action
    if (isConnect) {
      connectedCueId = cueId;
    }

    const userDocRef = doc(db, "users", targetUserDoc.id);

    await updateDoc(userDocRef, {
      queue: arrayUnion({
        title: song.title,
        songNumber: song.songNumber || "",
        from: window.userName || "Guest",
        timestamp: Date.now()
      })
    });

    if (isConnect) {
      showPopup(`Connected to ${targetUserDoc.data().profile?.name || cueId} ✅`, 2000, "green");
      renderSendModalFixed(song);
    } else {
      showPopup(`Sent to ${targetUserDoc.data().profile?.name || cueId} ✅`, 2000, "green");
    }

    return true;
  } catch (err) {
    console.error(err);
    showPopup("Failed ❌", 2000, "red");
    return false;
  }
}