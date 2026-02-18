export function initCustomKeyboard() {
  const isMobile =
    /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(navigator.userAgent) ||
    window.matchMedia("(max-width: 1024px)").matches;

  if (!isMobile) return console.log("Custom keyboard disabled — desktop mode");

  console.log("Custom keyboard enabled — mobile detected");

  // ----------------------------------------------------
  // KEYBOARD CONTAINER
  // ----------------------------------------------------
  const kb = document.createElement("div");
  kb.id = "customKeyboard";
  Object.assign(kb.style, {
    display: "none",
    position: "fixed",
    background: "#222",
    border: "2px solid #555",
    borderRadius: "10px",
    zIndex: "99999",
    padding: "6px",
    boxSizing: "border-box",
    flexDirection: "column",
    userSelect: "none",
    touchAction: "none",
  });
  document.body.appendChild(kb);

  // ----------------------------------------------------
  // KEY LAYOUTS
  // ----------------------------------------------------
  const alphaUpper = [
    ["Q","W","E","R","T","Y","U","I","O","P"],
    ["A","S","D","F","G","H","J","K","L"],
    ["Z","X","C","V","B","N","M","BACK","CLEAR"],
    ["SHIFT","SPACE","ENTER"]
  ];

  const alphaLower = alphaUpper.map(row =>
    row.map(k => ["SHIFT","BACK","SPACE","CLEAR","ENTER"].includes(k) ? k : k.toLowerCase())
  );

  const numLayout = [
    ["CLEAR","BACK"],
    ["1","2","3"],
    ["4","5","6"],
    ["7","8","9"],
    ["PASTE","0","ENTER"]
  ];

  let currentLayout = alphaUpper;
  let isShift = false;
  let shiftLock = false;
  let lastShiftTime = 0;
  let activeInput = null;
  let baseHeight = null;

  // Eye icons (prevent keyboard close)
  const eyeIcons = document.querySelectorAll(".auth-eye-icon");

  // ----------------------------------------------------
  // BUILD KEYS
  // ----------------------------------------------------
function buildKeyboard(layout) {
  kb.innerHTML = "";

  // Make keyboard a vertical flex container with centered content
  Object.assign(kb.style, {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center", // <-- vertical center the keys block
    alignItems: "stretch",    // stretch rows horizontally
  });

  layout.forEach(rowKeys => {
    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      justifyContent: "center",
      width: "100%",
      marginBottom: "5px",
      gap: "4px",
    });

    rowKeys.forEach(key => {
      const btn = document.createElement("button");
      btn.dataset.key = key;

      btn.textContent =
        key === "BACK" ? "⌫" :
        key === "SPACE" ? "␣" :
        key === "ENTER" ? "▶" :
        key;

      Object.assign(btn.style, {
        flex: key === "SPACE" ? "5" : "1",
        height: "42px",
        borderRadius: "5px",
        border: "1px solid #555",
        background: (key === "SHIFT" && isShift) ? "#777" : "#333",
        color: "#fff",
        fontSize: "16px",
        userSelect: "none",
        transition: "transform 0.08s ease, background 0.08s ease",
      });

      row.appendChild(btn);
    });

    kb.appendChild(row);
  });
}

  // ----------------------------------------------------
  // CALCULATE BASE HEIGHT
  // ----------------------------------------------------
  function calculateBaseHeight() {
    kb.style.visibility = "hidden";
    kb.style.display = "flex";

    const height = kb.scrollHeight;

    kb.style.visibility = "visible";
    return height;
  }

  // ----------------------------------------------------
  // POSITION + SCALE
  // ----------------------------------------------------
  function updateKeyboardPosition() {
    const leftDrawer = document.querySelector("#leftDrawer");
    const bottomBar  = document.querySelector("#bottomBar");
    if (!leftDrawer || !bottomBar) return;

    const drawerRect = leftDrawer.getBoundingClientRect();
    const bottomRect = bottomBar.getBoundingClientRect();

    if (!baseHeight) {
      baseHeight = Number(kb.dataset.numeric) ? 320 : calculateBaseHeight();
    }

    const availableHeight = bottomRect.top - 12;
    const finalHeight = Math.min(baseHeight, availableHeight);

    kb.style.left   = `${drawerRect.right}px`;
    kb.style.bottom = `${window.innerHeight - bottomRect.top}px`;
    kb.style.height = `${finalHeight}px`;

    const availableWidth = window.innerWidth - drawerRect.right - 10;
    kb.style.width = `${availableWidth}px`;

    const scale = finalHeight / baseHeight;
    kb.style.transform = `scale(${scale})`;
    kb.style.transformOrigin = "bottom left";
  }

  window.addEventListener("resize", updateKeyboardPosition);

  // ----------------------------------------------------
  // OPEN FOR INPUT
  // ----------------------------------------------------
  function openKeyboardForInput(input) {
    activeInput = input;

    const id = input.id.toLowerCase();
    const isNumeric = input.type === "number" || id.includes("pin") || id === "songinput";

    currentLayout = isNumeric ? numLayout :
      (isShift ? alphaUpper : alphaLower);

    buildKeyboard(currentLayout);

    kb.dataset.numeric = isNumeric ? "1" : "0";
    baseHeight = isNumeric ? 320 : null; // numeric fixed

    kb.style.display = "flex";
    updateKeyboardPosition();

    const len = activeInput.value.length;
    activeInput.setSelectionRange(len, len);
    activeInput.focus();
  }

  // ----------------------------------------------------
  // INPUT OVERRIDE (disable native keyboard)
  // ----------------------------------------------------
  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("pointerdown", e => {
      e.preventDefault();
      input.setAttribute("inputmode", "none");
      input.removeAttribute("readonly");
      openKeyboardForInput(input);
    });
  });

  // ----------------------------------------------------
  // KEY PRESS HANDLER
  // ----------------------------------------------------
  kb.addEventListener("click", async e => {
    if (!e.target.dataset.key || !activeInput) return;

    const key = e.target.dataset.key;

    // animation (except shift/paste)
    if (!["SHIFT","PASTE"].includes(key)) {
      e.target.style.transform = "scale(0.92)";
      setTimeout(() => e.target.style.transform = "scale(1)", 80);
    }

    if (key === "BACK") activeInput.value = activeInput.value.slice(0, -1);
    else if (key === "CLEAR") activeInput.value = "";
    else if (key === "SPACE") activeInput.value += " ";
    else if (key === "ENTER") {
      activeInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      activeInput.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
    }
    else if (key === "SHIFT") {
      const now = Date.now();
      if (now - lastShiftTime < 400) shiftLock = !shiftLock;
      isShift = shiftLock ? true : !isShift;
      lastShiftTime = now;

      if (kb.dataset.numeric !== "1") {
        currentLayout = isShift ? alphaUpper : alphaLower;
        buildKeyboard(currentLayout);
        updateKeyboardPosition();
      }
      return;
    }
    else if (key === "PASTE") {
      try {
        const txt = await navigator.clipboard.readText();
        if (txt) activeInput.value += txt;
      } catch {}
      return;
    }
    else activeInput.value += key;

    // auto-unshift
    if (!shiftLock && kb.dataset.numeric !== "1" && isShift) {
      isShift = false;
      currentLayout = alphaLower;
      buildKeyboard(currentLayout);
      updateKeyboardPosition();
    }

    activeInput.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // ----------------------------------------------------
  // CLICK OUTSIDE CLOSES KEYBOARD (but NOT eye icons)
  // ----------------------------------------------------
  document.addEventListener("pointerdown", e => {
    const insideKB = kb.contains(e.target);
    const insideInput = [...document.querySelectorAll("input")].some(i => i.contains(e.target));
    const isEye = [...eyeIcons].includes(e.target);

    if (!insideKB && !insideInput && !isEye) {
      kb.style.display = "none";
      isShift = false;
      shiftLock = false;
      activeInput = null;
    }
  });


}
