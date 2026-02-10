/* =============================
   UNIVERSAL INPUT SYSTEM — VERSION C (HYBRID NEON + FROST)
   + Hover & Focus Sound (Anti-Overlap Lock)
============================= */
import { playUISoundSafe } from "../sounds.js";

const inputCSS_C = `
.ui-input {
  text-align: center;
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border-radius: 12px;
  border: 2px solid rgba(255,255,255,0.25);
  background: rgba(0,0,0,0.35);
  backdrop-filter: blur(6px);
  color: white;
  outline: none;
  transition: border 0.25s, box-shadow 0.25s, background 0.25s, color 0.25s;
  box-shadow: inset 0 0 6px rgba(0,0,0,0.4);
}

/* Hover (desktop) */
.ui-input:not(.touch-device):hover {
  border-color: var(--theme-color);
  box-shadow: 0 0 10px var(--theme-color), inset 0 0 8px rgba(var(--rgb-theme), 0.5);
  color: var(--theme-color);
}

/* Focus */
.ui-input:focus {
  border-color: var(--theme-color);
  box-shadow: 0 0 18px var(--theme-color), inset 0 0 10px rgba(var(--rgb-theme), 0.7);
  background: rgba(0,0,0,0.45);
  color: var(--theme-color);
}

.ui-input:-webkit-autofill {
  -webkit-text-fill-color: var(--theme-color) !important;
  color: var(--theme-color) !important;
  background-color: rgba(0,0,0,0.35) !important;
  caret-color: var(--theme-color);
  transition: color 5000s ease-in-out 0s, background-color 5000s ease-in-out 0s;
}

.ui-input::placeholder {
  color: #bbb;
}

.ui-input.textarea {
  min-height: 90px;
  resize: vertical;
}

/* Search icon for inputs with data-icon="search" */
.ui-input[data-icon="search"] {
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' fill='%23bbb'><path d='M500.3 443.7l-119.7-119.7c28.4-34.9 45.4-79 45.4-127.7 0-114.9-93.1-208-208-208S9.999 81.399 9.999 196.3s93.1 208 208 208c48.7 0 92.8-17 127.7-45.4l119.7 119.7c4.5 4.5 10.4 6.4 16.3 6.4s11.8-1.9 16.3-6.4C509.2 467.3 509.2 452.7 500.3 443.7zM55.999 196.3c0-89.6 73.4-163 163-163s163 73.4 163 163-73.4 163-163 163S55.999 285.9 55.999 196.3z'/></svg>");
  background-size: 16px;
  background-repeat: no-repeat;
  background-position: 12px center;
  padding-left: 40px !important;
  text-align: center;
  cursor: pointer;
}


/* Horizontal layout */
.input-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

/* Make both inputs equal width */
.input-row > input,
.pin-wrapper {
  flex: 1;
  min-width: 0;
}

/* PIN wrapper */
.pin-wrapper {
  position: relative;
  display: inline-block;
}

/* PIN input — keep neon style but add space for icon */
.pin-wrapper input {
  width: 100%;
  padding-right: 36px !important;
  box-sizing: border-box;
  text-align: center;
}

/* Eye icon inside the input */
.auth-eye-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 16px;
  color: #808080;
  transition: color 0.2s ease;
  z-index: 5; /* ensures over blur/frost layers */
}

.auth-eye-icon:hover {
  color: white;
}

.pin-wrapper .auth-eye-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  font-size: 16px;
  color: #ccc;
  user-select: none; /* prevents text selection on click */
  z-index: 2; /* ensures it's above the input */
}
`;

const styleC = document.createElement("style");
styleC.textContent = inputCSS_C;
document.head.appendChild(styleC);

/* ---------------------------
   Setup Inputs
--------------------------- */
export function setupInputsC() {
  const isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  document.querySelectorAll("input, textarea").forEach(input => {
    input.classList.add("ui-input");
    if (isTouch) input.classList.add("touch-device");

    const themeAttr = input.dataset.theme || "cyan";
    const namedColors = {
      cyan: "#00ffff",
      magenta: "#ff00ff",
      yellow: "#ffff00",
      green: "#00ff00",
      red: "#ff0000",
      blue: "#0099ff",
      white: "#ffffff"
    };
    const themeColor = namedColors[themeAttr] || themeAttr;

    // Convert hex to rgb
    const r = parseInt(themeColor.substr(1,2),16);
    const g = parseInt(themeColor.substr(3,2),16);
    const b = parseInt(themeColor.substr(5,2),16);

    input.style.setProperty("--theme-color", themeColor);
    input.style.setProperty("--rgb-theme", `${r},${g},${b}`);

    if (input.tagName === "TEXTAREA") input.classList.add("textarea");

    /* 🔊 Hover Sound (desktop only) */
    if (!isTouch) input.addEventListener("mouseenter", () => playUISoundSafe("hover"));

    /* 🔊 Focus/Click Sound */
    input.addEventListener("focus", () => playUISoundSafe("clickA"));

    /* -----------------------
       Search icon or Enter triggers input
       Clears input after search
    ----------------------- */
    if (input.dataset.icon === "search") {
      input.addEventListener("click", () => {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.value = "";
        playUISoundSafe("clickA");
      });
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.value = "";
        playUISoundSafe("clickA");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", setupInputsC);

document.addEventListener('DOMContentLoaded', () => {
  [loginEye, registerEye].forEach(icon => {
    icon.addEventListener("click", () => {
      const input = document.getElementById(icon.dataset.target);
      if (!input) return;

      if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    });
  });
});
