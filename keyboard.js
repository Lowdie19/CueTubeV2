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
  const rightContent = document.querySelector("#rightContent");
  rightContent.style.position = "relative"; // ensure absolute children work
  rightContent.appendChild(kb);

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
    ["7","8","9","CLEAR"],
    ["4","5","6","BACK"],
    ["1","2","3","PASTE"],
    ["0","ENTER"]
  ];

  let currentLayout = alphaUpper;
  let isShift = false;
  let shiftLock = false;
  let lastShiftTime = 0;
  let activeInput = null;
  let baseHeight = null;

  const eyeIcons = document.querySelectorAll(".auth-eye-icon");

  // ----------------------------------------------------
  // CARET CENTERING HELPER
  // ----------------------------------------------------
  function centerCaret(input) {
    const inputWidth = input.clientWidth;
    const span = document.createElement("span");
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = "pre";
    span.style.font = window.getComputedStyle(input).font;
    span.textContent = input.value.slice(0, input.selectionEnd);
    document.body.appendChild(span);
    const textWidth = span.offsetWidth;
    document.body.removeChild(span);
    input.scrollLeft = Math.max(0, textWidth - inputWidth / 2);
  }

  // ----------------------------------------------------
  // BUILD KEYS
  // ----------------------------------------------------
  function buildKeyboard(layout) {
    kb.innerHTML = "";
    Object.assign(kb.style, {
      display: "none",
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0)", // fully transparent
      border: "none",
      borderRadius: "12px",
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      boxShadow: "0 0 40px 20px rgba(0,0,0,0.35)",
      zIndex: "9999",
      padding: "6px",
      boxSizing: "border-box",
      flexDirection: "column",
      userSelect: "none",
      touchAction: "none",
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
  if (!activeInput) return;

  // reset scale for full area
  kb.style.transform = "none";
}

  window.addEventListener("resize", () => {
  if (kb.style.display === "flex") {
    // hide keyboard on rotation / resize
    kb.style.display = "none";
    isShift = false;
    shiftLock = false;
    activeInput = null;
  }
  // optionally recalc layout next time input opens
  baseHeight = null;
});

  // ----------------------------------------------------
  // OPEN FOR INPUT
  // ----------------------------------------------------
  function openKeyboardForInput(input) {
    activeInput = input;

    const id = input.id.toLowerCase();
    const isNumeric = input.type === "number" || id.includes("pin") || id === "songinput";

    currentLayout = isNumeric ? numLayout : (isShift ? alphaUpper : alphaLower);

    buildKeyboard(currentLayout);
    kb.dataset.numeric = isNumeric ? "1" : "0";
    baseHeight = isNumeric ? 320 : null;

    kb.style.display = "flex";
    updateKeyboardPosition();

    const len = activeInput.value.length;
    activeInput.setSelectionRange(len, len);
    activeInput.focus();

    // center caret initially
    centerCaret(activeInput);
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

    if (!["SHIFT","PASTE"].includes(key)) {
      e.target.style.transform = "scale(0.92)";
      setTimeout(() => e.target.style.transform = "scale(1)", 80);
    }

    if (key === "BACK") activeInput.value = activeInput.value.slice(0, -1);
    else if (key === "CLEAR") activeInput.value = "";
    else if (key === "SPACE") activeInput.value += " ";
else if (key === "ENTER") {
  const enterBtn = e.target; // the ENTER button itself
  playSound("clickA");

  // create a loading spinner inside the button
  enterBtn.innerHTML = "";
  const spinner = document.createElement("div");
  Object.assign(spinner.style, {
    border: "2px solid #fff",
    borderTop: "2px solid transparent",
    borderRadius: "50%",
    width: "16px",
    height: "16px",
    margin: "0 auto",
    animation: "spin 1s linear infinite",
  });
  enterBtn.appendChild(spinner);
  enterBtn.disabled = true;

  // dispatch Enter key events
  activeInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  activeInput.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));

  // wait 1 second, then close keyboard and restore ENTER
  setTimeout(() => {
    enterBtn.textContent = "▶"; // restore original icon
    enterBtn.disabled = false;
    kb.style.display = "none";
    isShift = false;
    shiftLock = false;
    activeInput = null;
  }, 1000);
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

    // center caret after every key
    centerCaret(activeInput);
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
