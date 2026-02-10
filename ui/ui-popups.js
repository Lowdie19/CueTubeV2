/* =============================
   Universal Popup Notifications
   Usage: showPopup("New song added! ✅", 3000, "cyan");
    3000 = time
    cyan = color
============================= */

const popupCSS = `
.popup-notify {
  --frost-color: rgba(255,255,255,0.25);

  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  min-width: 200px;
  max-width: 80%;
  color: white;
  font-weight: bold;
  font-size: 1rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.25);
  box-shadow: inset 0 0 10px var(--frost-color), 0 8px 16px rgba(0,0,0,0.5);
  opacity: 0;
  z-index: 5000;
  text-align: center;
  transition: all 0.35s ease-out;
}
.popup-notify.show {
  bottom: 120px;
  opacity: 1;
  pointer-events: none;
}
`;

const styleTag = document.createElement("style");
styleTag.textContent = popupCSS;
document.head.appendChild(styleTag);

const activePopups = [];

/* --------------------------
   Convert hex color + alpha to rgba()
--------------------------- */
function hexToRGBA(hex, alpha = 1) {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map(h => h+h).join("");
  }
  const r = parseInt(hex.substring(0,2),16);
  const g = parseInt(hex.substring(2,4),16);
  const b = parseInt(hex.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* --------------------------
   Show popup
   message: text
   duration: milliseconds
   theme: color string or named color
   alpha: background opacity (0–1)
--------------------------- */
function updatePopupPositions() {
  // Start stacking from bottom
  let bottomOffset = 120;

  // Older popups are above the new one
  for (let i = activePopups.length - 1; i >= 0; i--) {
    const popup = activePopups[i];
    popup.style.transition = "bottom 0.25s ease-out";
    popup.style.bottom = `${bottomOffset}px`;
    bottomOffset += popup.offsetHeight + 10;
  }
}

export function showPopup(message, duration = 3000, theme = "cyan", alpha = 0.25) {
  const namedColors = {
    cyan: "#00ffff",
    magenta: "#ff00ff",
    yellow: "#ffff00",
    green: "#00ff00",
    red: "#ff0000",
    blue: "#0099ff",
    white: "#ffffff"
  };
  const themeColor = namedColors[theme] || theme;

  const popup = document.createElement("div");
  popup.className = "popup-notify";
  popup.innerHTML = message;

  // Apply glass-style color
  popup.style.background = hexToRGBA(themeColor, 0.15);
  popup.style.borderColor = hexToRGBA(themeColor, alpha);
  popup.style.boxShadow = `inset 0 0 2px ${hexToRGBA(themeColor, alpha)}, 0 8px 16px rgba(0,0,0,0.5)`;

  // Start slightly off to the right and invisible
popup.style.transform = "translateX(-50%) translateY(100%)";
popup.style.opacity = "0";

  document.body.appendChild(popup);
  activePopups.push(popup);

  // First, move older popups up
  updatePopupPositions();

  // Animate the new popup sliding in from right
  requestAnimationFrame(() => {
  popup.style.transition = "bottom 0.25s ease-out, transform 0.25s ease-out, opacity 0.35s ease-out";
  popup.style.transform = "translateX(-50%) translateY(0)";
  popup.style.opacity = "1";
});

  // Play notification sound (respects global volume)
  window.playSound("notificationA");

  // Auto-hide
  setTimeout(() => {
    popup.style.transition = "bottom 0.25s ease-out, transform 0.25s ease-out, opacity 0.35s ease-out";
    popup.style.opacity = "0";

    setTimeout(() => {
      const index = activePopups.indexOf(popup);
      if (index !== -1) activePopups.splice(index, 1);
      popup.remove();
      updatePopupPositions();
    }, 400);
  }, duration);
}