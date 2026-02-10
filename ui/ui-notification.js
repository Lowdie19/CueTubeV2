/* =============================
   UI Notification System (Netflix-style)
   Usage: <div id="notif-container"></div>
   note: make sure the parent position: relative;
============================= */

/* Inject CSS */
const notifCSS = `
#ui-notification {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0,0,0,0.72);
  padding: 18px 20px;
  border-left: none;
  border-radius: 8px;
  color: white;
  font-family: Arial, sans-serif;
  font-weight: bold;
  font-size: 14px;
  max-width: 260px;
  opacity: 0;
  transform: translateX(-40px);
  pointer-events: auto;
  z-index: 99999;
  backdrop-filter: blur(4px);
  box-shadow: 0 0 12px rgba(0,0,0,0.6);
  transition: opacity .4s ease, transform .4s ease;
  cursor: pointer;
}

#ui-notification.show {
  opacity: 1;
  transform: translateX(0);
}

#ui-notification .notif-inner {
  display: flex;
  align-items: flex-start;
}

.notif-line {
  width: 3px;
  height: 0;
  background: #ff0033;
  border-radius: 0px;
  margin-right: 14px;
  flex-shrink: 0;
  opacity: 0;
  transform-origin: top;
  transition: height 1s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 1s ease;
}

.notif-texts {
  opacity: 0;
  transition: opacity .35s ease-out;
}

.notif-texts.showText {
  opacity: 1;
}

.notif-label {
  text-transform: uppercase;
  font-size: 11px;
  opacity: 0.7;
  margin-bottom: 4px;
  letter-spacing: 1px;
}

.notif-title {
  font-size: 15px;
  line-height: 1.3;
  letter-spacing: 0.2px;
}
`;

const notifStyle = document.createElement("style");
notifStyle.textContent = notifCSS;
document.head.appendChild(notifStyle);

/* Create DOM */
const notifBox = document.createElement("div");
notifBox.id = "ui-notification";
notifBox.innerHTML = `
  <div class="notif-inner">
    <div class="notif-line"></div>
    <div class="notif-texts">
      <div class="notif-label">UP NEXT</div>
      <div class="notif-title">Sample Title</div>
    </div>
  </div>
`;

const target = document.querySelector("#notif-container") || document.body;
target.appendChild(notifBox);

// Detect Windows OS
const isWindows = navigator.userAgent.includes("Windows");
if (isWindows) {
  notifBox.style.maxWidth = "600px";
}

/* Sound */
let soundUnlocked = false;

// Silent sound unlock (no actual sound played)
document.addEventListener(
  "click",
  () => {
    if (!soundUnlocked) {
      // Just "touch" the audio system without making noise
      try {
        const s = window.sounds?.notification;
        if (s) {
          s.volume = 0;
          s.play().catch(()=>{});
          setTimeout(() => {
            s.pause();
            s.currentTime = 0;
            s.volume = volume; // restore
          }, 50);
        }
      } catch (e) {}

      soundUnlocked = true;
    }
  },
  { once: true }
);

/* Queue management */
const notifQueue = [];
let isShowing = false;
let notifTimeout = null;

export function showNotification(labelText = "NOTICE", titleText = "Unknown Title") {
  // 🔹 If idleMode, skip adding notifications
  if (window.idleMode) return;

  notifQueue.push({ label: labelText, title: titleText });
  if (isShowing) return;

  function nextNotification() {
    if (notifQueue.length === 0) {
      isShowing = false;
      return;
    }

    isShowing = true;

    const textsEl = notifBox.querySelector(".notif-texts");
    const lineEl = notifBox.querySelector(".notif-line");

    const { label, title } = notifQueue.shift();

    const labelEl = notifBox.querySelector(".notif-label");
    const titleEl = notifBox.querySelector(".notif-title");

    labelEl.textContent = label;
    titleEl.innerHTML = title; 

    const boxHeight = textsEl.offsetHeight;

    // reset animations
    lineEl.style.height = "0px";
    lineEl.style.opacity = "0";
    textsEl.classList.remove("showText");

    // sound
    if (soundUnlocked) {
      window.playSound("notificationB");
    }

    // show box
    notifBox.classList.add("show");

    setTimeout(() => {
      lineEl.style.height = boxHeight + "px";
      lineEl.style.opacity = "1";
    }, 50);

    setTimeout(() => {
      textsEl.classList.add("showText");
    }, 1050);

    // auto hide after 4s
    clearTimeout(notifTimeout);
    notifTimeout = setTimeout(hideCurrent, 4000);

    // user tap to close
    function hideCurrent() {
      clearTimeout(notifTimeout);
      textsEl.classList.remove("showText");
      lineEl.style.height = "0px";
      lineEl.style.opacity = "0";

      setTimeout(() => {
        notifBox.classList.remove("show");
        nextNotification();
      }, 400);
    }

    notifBox.onclick = hideCurrent;
  }

  nextNotification();
}


export function clearAllNotifications() {
  notifQueue.length = 0;
  isShowing = false;
  clearTimeout(notifTimeout);
  notifTimeout = null;
  notifBox.classList.remove("show");

  // also remove text animations immediately
  const textsEl = notifBox.querySelector(".notif-texts");
  const lineEl = notifBox.querySelector(".notif-line");
  textsEl.classList.remove("showText");
  lineEl.style.height = "0px";
  lineEl.style.opacity = "0";
}