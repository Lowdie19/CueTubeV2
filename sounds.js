/* ============================================
   SOUND MANAGER (Universal)
   Usage:

   ➤ Click sound:
      <button data-sound="click">Save</button>

   ➤ Custom event:
      <div data-sound="notification" data-event="mouseenter">

   ➤ Hover sound:
      <div data-sound-hover="hover">

   ➤ Manual:
      playSound("error");

   Volume control:
      setVolume(0.5);  // 0 to 1
      muteSounds(true);

   Placing Volume Icon:
      <div id="myVolumeDiv"></div>
   ============================================ */
/* ============================================
   SOUND MANAGER (Universal)
============================================ */
export const sounds = {
  clickA: new Audio("assets/audio/click_A.wav"),
  clickB: new Audio("assets/audio/click_B.wav"),
  error: new Audio("assets/audio/error.wav"),
  hover: new Audio("assets/audio/hover_A.wav"),
  trash: new Audio("assets/audio/trash.wav"),
  notificationA: new Audio("assets/audio/notif_A.wav"),
  notificationB: new Audio("assets/audio/notif_B.wav"),
  
};

let volume = 1;

export function playSound(name) {
  const s = sounds[name];
  if (s) {
    s.volume = volume;
    s.currentTime = 0;
    s.play().catch(() => {});
  }
}

window.playSound = playSound;

/* ============================================
   AUTO SOUND BINDING
============================================ */
function attachAutoSounds() {
  document.querySelectorAll("[data-sound]").forEach(el => {
    const soundName = el.dataset.sound;
    const eventName = el.dataset.event || "click";
    el.addEventListener(eventName, () => playSound(soundName));
  });

  document.querySelectorAll("[data-sound-hover]").forEach(el => {
    el.addEventListener("mouseenter", () => playSound(el.dataset.soundHover));
  });
}

window.addEventListener("DOMContentLoaded", attachAutoSounds);

/* ============================================
   VOLUME ICON (Click to Cycle with Hover Glow & Sound)
============================================ */
export function createVolumeIcon(container) {
  if (!container) return;

  // Wrapper for icon + text
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column"; // stack vertically
  wrapper.style.alignItems = "center";    // center horizontally
  wrapper.style.gap = "4px";              // space between icon and text
  wrapper.style.cursor = "pointer";
  wrapper.style.userSelect = "none";

  // Icon itself
  const icon = document.createElement("div");
  icon.style.fontSize = "22px";
  icon.style.transition = "color .25s, transform .1s, text-shadow .25s";
  icon.style.color = "gray";

  // Text below icon
  const label = document.createElement("div");
  label.textContent = "Notif.";
  label.style.fontSize = "12px";
  label.style.color = "gray";
  label.style.userSelect = "none";

  wrapper.appendChild(icon);
  wrapper.appendChild(label);

  // Volume levels
  const levels = [
    { vol: 0, icon: "fa-volume-xmark", color: "red" },
    { vol: 0.3, icon: "fa-volume-off", color: "cyan" },
    { vol: 0.7, icon: "fa-volume-down", color: "cyan" },
    { vol: 1, icon: "fa-volume-high", color: "cyan" }
  ];

  let currentLevel = levels.length - 1;

  function updateIcon() {
    const lvl = levels[currentLevel];
    window.volume = lvl.vol;
    icon.innerHTML = `<i class="fa-solid ${lvl.icon}"></i>`;
    icon.style.color = "gray";
    icon.style.textShadow = "";
  }

  icon.addEventListener("click", () => {
    currentLevel = (currentLevel + 1) % levels.length;
    updateIcon();
    icon.style.transform = "scale(1.3)";
    setTimeout(() => icon.style.transform = "scale(1)", 100);

    const clickSound = new Audio("assets/audio/click_A.wav");
    clickSound.volume = 0.5;
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  });

  // Hover effect
  icon.addEventListener("mouseenter", () => {
    const lvl = levels[currentLevel];
    icon.style.color = lvl.color;
    icon.style.textShadow = `0 0 8px ${lvl.color}`;
  });
  icon.addEventListener("mouseleave", () => {
    icon.style.color = "gray";
    icon.style.textShadow = "";
  });

  updateIcon();

  // Append wrapper to container
  container.appendChild(wrapper);
}


// Global UI sound lock
export let uiHoverSoundLock = false;
export let uiHoverSoundTimer = null;

export function playUISoundSafe(name = "hover") {
  if (uiHoverSoundLock) return;
  uiHoverSoundLock = true;
  playSound(name); // your existing playSound
  clearTimeout(uiHoverSoundTimer);
  uiHoverSoundTimer = setTimeout(() => uiHoverSoundLock = false, 150); // 150ms lock
}