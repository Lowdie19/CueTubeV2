import { setupInputsC } from "./ui/ui-inputs.js";
import { db } from "./firebase-init.js";
import { collection, getDocs, updateDoc, arrayUnion, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { showPopup } from "./ui/ui-popups.js";
import { askConfirm } from "./ui/ui-modals.js";

let connectedCueId = null; // persistent connection
let connectedProfileName = null;

export function openRemoteUI() {
  const oldUI = document.getElementById("remoteUI");
  if (oldUI) oldUI.remove();

  const songbook = window.currentSongbook || [];
  const headerTitle = window.isUserLoggedIn ? `${window.userName}'s` : "Community";

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

  ui.innerHTML = `
    <!-- Close Button -->
    <button class="btnX" id="cueCloseBtn" title="Close" 
      style="position:fixed; top:10px; right:10px; z-index:4000;">✕</button>

    <!-- Header -->
    <div id="remoteHeader"
      style="
        position:fixed; top:0; left:0; width:100%;
        background:#111; padding:20px; padding-bottom:12px;
        box-sizing:border-box; z-index:3001;
      "
    >
      <!-- LINE 1: Title -->
      <div style="font-size:24px; font-weight:bold; color:magenta; margin-bottom:6px;">
        ${headerTitle}
      </div>

      <!-- LINE 2: Songbook + Connection -->
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:12px; flex:1;">
          <span style="font-size:14px; color:gray;">Songbook</span>
          <span id="connectionIndicator"
                style="font-size:14px; color:#00ff88; display:flex; align-items:center; gap:10px;">
          </span>
        </div>
      </div>

      <!-- LINE 3: Search + Disconnect -->
      <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
        <input id="remoteSearch"
          placeholder="Search songs..."
          class="ui-input"
          data-theme="magenta"
          data-icon="search"
          style="flex:1; box-sizing:border-box;"
        >
      <button id="disconnectBtn"
        class="ui-btn"
        data-theme="red"
        style="display:none; white-space:nowrap;"
      >
        Disconnect
      </button>
      </div>
    </div>

    <!-- Songs List -->
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

  // 🔹 Restore connected state
  const indicator = ui.querySelector("#connectionIndicator");
  const searchEl = ui.querySelector("#remoteSearch");
  const listEl = ui.querySelector("#remoteSongList");
  
  // AFTER appending the UI and selecting disconnectBtn
  const disconnectBtn = ui.querySelector("#disconnectBtn");

  // ✅ Ensure theme + hover + ripple even when hidden initially
  function styleDynamicBtn(btn, themeName = "cyan") {
    btn.classList.add("ui-btn");

    const namedColors = { cyan: "#0ff", magenta: "#ff00ff", yellow: "#ff0", green: "#0f0", red: "#f00" };
    const themeColor = namedColors[themeName] || themeName;

    btn.style.border = `2px solid ${themeColor}`;
    btn.style.boxShadow = `0 0 10px ${themeColor}, inset 0 0 5px ${themeColor}`;
    btn.style.color = "white";
    btn.style.transition = "transform 0.1s, box-shadow 0.1s, border 0.1s, color 0.1s"; // match generic timing

    // Ripple effect and hover
    if (!btn.classList.contains("ripple-ready")) {
      btn.classList.add("ripple-ready");

      btn.addEventListener("pointerdown", e => {
        createRipple(e, btn, themeColor);
        btn.classList.add("tap-animate");
        btn.style.boxShadow = `0 0 25px ${themeColor}, inset 0 0 12px ${themeColor}`;
        btn.style.color = themeColor;
      });

      const reset = () => {
        btn.classList.remove("tap-animate");
        btn.style.boxShadow = `0 0 10px ${themeColor}, inset 0 0 5px ${themeColor}`;
        btn.style.color = "white";
      };

      btn.addEventListener("pointerup", reset);
      btn.addEventListener("pointercancel", reset);
      btn.addEventListener("pointerleave", reset);

      // Hover only on non-touch devices
      if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
        btn.addEventListener("mouseenter", () => {
          btn.style.boxShadow = `0 0 25px ${themeColor}, inset 0 0 12px ${themeColor}`;
          btn.style.color = themeColor;
        });
        btn.addEventListener("mouseleave", reset);
      }
    }
  }

  // Apply styling
  styleDynamicBtn(disconnectBtn, "red");
  
  if (connectedCueId) {
    indicator.innerHTML = `<span style="color:gray;">▶</span> ${connectedProfileName}`;
    disconnectBtn.style.display = "inline-block";
    setupInputsC(); // <-- call here so the button gets styled
  } else {
    indicator.innerHTML = "";
    disconnectBtn.style.display = "none";
  }

  // Adjust songs list height
  const header = ui.querySelector("#remoteHeader");
  const HEADER_HEIGHT = header.offsetHeight;
  listEl.style.top = HEADER_HEIGHT + "px";
  listEl.style.height = `calc(100% - ${HEADER_HEIGHT}px)`;

  // Render song list
  renderSongs(songbook, listEl);

  // Search filter
  searchEl.addEventListener("input", () => {
    const key = searchEl.value.toLowerCase();
    const filtered = songbook.filter(s => s.title.toLowerCase().includes(key));
    renderSongs(filtered, listEl);
  });

  // Close & Disconnect
  ui.querySelector("#cueCloseBtn").onclick = () => ui.remove();
  disconnectBtn.onclick = () => {
    connectedCueId = null;
    connectedProfileName = null;
    indicator.innerHTML = "";
    disconnectBtn.style.display = "none";
    setTimeout(() => {
      showPopup("Disconnected", 2000, "cyan");
    }, 1500);
  };
}

// New helper: handles song row clicks
function handleSongClick(song) {
  if (!connectedCueId) {
    // No connection yet → force Connect Modal
    openConnectModal(song);
  } else {
    // Already connected → open Send Modal
    renderSendModalFixed(song);
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

// Initial Send modal
function renderSendModal(song) {
  // Only used if connectedCueId suddenly becomes null
  openConnectModal(song);
}

// Connect modal
function openConnectModal(songToSend = null) {
  askConfirm({
    title: "Connect",
    message: `
      <input id="connectCueInput" class="ui-input" data-theme="white"
        placeholder="Input Cue ID / Profile name"
        style="width:100%; box-sizing:border-box;">
    `,
    theme: "cyan",
    onYes: async () => {
      const cueInput = document.getElementById("connectCueInput");
      const targetCueId = cueInput?.value.trim();

      if (!targetCueId) {
        showPopup("Input Cue ID / Profile name first! ❌", 2000, "red");
        return false;
      }

      const ok = await connectToUser(targetCueId);
      if (!ok) return false;

      // After successful connect → send the song immediately
      if (songToSend) renderSendModalFixed(songToSend);

      return true;
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
    connectedProfileName = targetUserDoc.data().profile?.name || connectedCueId;
    setTimeout(() => {
    showPopup(
      `Connected to ${targetUserDoc.data().profile?.name || connectedCueId} ✅`,
      2000,
      "green"
      );
    }, 1500);
    
    // Show disconnect button
    const disconnectBtn = document.getElementById("disconnectBtn");
    if (disconnectBtn) disconnectBtn.style.display = "inline-block";
    
    // Update the indicator
    const indicator = document.getElementById("connectionIndicator");
    if (indicator) {
      indicator.innerHTML = `<span style="color:gray;">▶</span> ${connectedProfileName}`;
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
  // Connection gone? → Force Connect Modal again
  if (!connectedCueId) {
    return openConnectModal(song);
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
