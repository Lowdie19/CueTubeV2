/* =============================
   Universal Button System
   Any <button> or .btn element gets auto-styled.
   Usage: <button class="btn full-width" data-theme="red">Upload</button>
     btn full-width = 100% button width
        fixed-width = 120px button width
        data-theme  = "red" = color of button

   Note: you can ignore the design of button by adding the name of title to:
      const buttons = document.querySelectorAll("button:not(.sendBtn), .btn:not(.sendBtn)")
============================= */
import { playUISoundSafe } from "../sounds.js";

/* 🔊 Global hover sound lock */
let hoverSoundLock = false;
let hoverSoundTimer = null;

function safeHoverSound() {
  if (hoverSoundLock) return; // ignore if still locked

  hoverSoundLock = true;
  playSound("hover");

  // unlock after sound finishes (approx 150ms)
  clearTimeout(hoverSoundTimer);
  hoverSoundTimer = setTimeout(() => {
    hoverSoundLock = false;
  }, 150);
}

const btnCSS = `
/* Base universal button */
.ui-btn {
  background: black;
  border: 2px solid #333333;
  padding: 12px 20px;
  font-size: 16px;
  color: white;
  border-radius: 12px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.2s, box-shadow 0.2s, border 0.2s, color 0.2s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 10px #333333, inset 0 0 5px #333333;
}
.ui-btn:active { transform: scale(0.97); }

/* Ripple effect */
.ripple {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  animation: ripple-effect 0.6s linear;
  pointer-events: none;
}
@keyframes ripple-effect { to { transform: scale(4); opacity: 0; } }

/* Text glow on hover */
.ui-btn:hover:not(.btnX) {
  text-shadow: 0 0 8px currentColor, 0 0 14px currentColor;
}

/* Width helpers */
.ui-btn.fixed-width { min-width: 120px; max-width: 240px; }
.ui-btn.full-width { width: 100%; display: block; }

/* Mobile tap animation */
body.touch-device .ui-btn { transition: none !important; transform: scale(1) !important; }
body.touch-device .ui-btn.tap-animate { transform: scale(0.92) !important; transition: transform 0.1s; }

/* btnX (close button) */
.btnX.ui-btn {
  position: absolute !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: #e5e5e5 !important;
  font-size: 22px !important;
  width: 32px !important;
  height: 32px !important;
  border-radius: 6px !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 0 !important;
  transition: transform 0.1s, color 0.1s;
}
.btnX.ui-btn:hover { color: red !important; }
.btnX.ui-btn:active { transform: scale(0.85) !important; color: red !important; }
`;

const styleTag = document.createElement("style");
styleTag.textContent = btnCSS;
document.head.appendChild(styleTag);

// Detect touch devices
const isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
if (isTouch) document.body.classList.add('touch-device');

document.addEventListener("DOMContentLoaded", () => {

/* Ignored entirely. add name of buttons here */
  const buttons = document.querySelectorAll("button:not(.sendBtn), .btn:not(.sendBtn)");

  buttons.forEach(btn => {
    btn.classList.add("ui-btn");

    const isBtnX = btn.classList.contains("btnX");

    // Read theme color
    const themeAttr = btn.dataset.theme || "#0ff";
    const namedColors = { cyan: "#0ff", magenta: "#ff00ff", yellow: "#ff0", green: "#0f0", red: "#f00" };
    const themeColor = namedColors[themeAttr] || themeAttr;

    if (!isBtnX) {
      btn.style.border = `2px solid ${themeColor}`;
      btn.style.boxShadow = `0 0 10px ${themeColor}, inset 0 0 5px ${themeColor}`;
    }

    if (!btn.classList.contains("ripple-ready")) {
      btn.classList.add("ripple-ready");

      btn.addEventListener("pointerdown", e => {
        if (!isBtnX) createRipple(e, btn, themeColor);
        playSound("clickA"); // click sound

        if (!isBtnX) {
          btn.classList.add('tap-animate');
          btn.style.boxShadow = `0 0 25px ${themeColor}, inset 0 0 12px ${themeColor}`;
          btn.style.color = themeColor;
        }
      });

      const reset = () => {
        if (!isBtnX) {
          btn.classList.remove('tap-animate');
          btn.style.boxShadow = `0 0 10px ${themeColor}, inset 0 0 5px ${themeColor}`;
          btn.style.color = 'white';
        }
      };

      btn.addEventListener("pointerup", reset);
      btn.addEventListener("pointercancel", reset);
      btn.addEventListener("pointerleave", reset);

      /* 🔊 FIXED HOVER SOUND — NO OVERLAP */
      if (!isTouch && !isBtnX) {
        btn.addEventListener("mouseenter", () => {
          playUISoundSafe("hover");
          btn.style.boxShadow = `0 0 25px ${themeColor}, inset 0 0 12px ${themeColor}`;
          btn.style.color = themeColor;
        });

        btn.addEventListener("mouseleave", () => {
          btn.style.boxShadow = `0 0 10px ${themeColor}, inset 0 0 5px ${themeColor}`;
          btn.style.color = "white";
        });
      }
    }
  });
});

function createRipple(e, btn, color) {
  const ripple = document.createElement("span");
  ripple.classList.add("ripple");
  ripple.style.background = color + "66";

  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + "px";
  ripple.style.left = e.clientX - rect.left - size / 2 + "px";
  ripple.style.top = e.clientY - rect.top - size / 2 + "px";

  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}