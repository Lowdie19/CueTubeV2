export function initCustomKeyboard() {
  const isMobile =
    /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(navigator.userAgent) ||
    window.matchMedia("(max-width: 1024px)").matches;

  if (!isMobile) return console.log("Custom keyboard disabled — desktop mode");

  console.log("Custom keyboard enabled — mobile detected");

  // ----------------------------------------------------
  // FORCE LEFTDRAWER TO 40% WIDTH ON MOBILE
  // ----------------------------------------------------
  const leftDrawer = document.querySelector("#leftDrawer");
  if (leftDrawer) {
    leftDrawer.style.width = "40vw";
    leftDrawer.style.minWidth = "40vw";
    leftDrawer.style.maxWidth = "40vw";
  }

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

  let kbKeyActive = false;
  let activeInput = null;
  let currentLayout = null;
  let isShift = false;
  let shiftLock = false;
  let lastShiftTime = 0;
  let baseHeight = null;

  const eyeIcons = document.querySelectorAll(".auth-eye-icon");

  // ----------------------------------------------------
  // KEY LAYOUTS
  // ----------------------------------------------------
  const alphaUpper = [
    ["Q","W","E","R","T","Y","U","I","O","P"],
    ["A","S","D","F","G","H","J","K","L","CLEAR"],
    ["SHIFT","Z","X","C","V","B","N","M","BACK"],
    ["SWITCH",".","/","SPACE","ENTER"]
  ];

  const alphaLower = alphaUpper.map(row =>
    row.map(k => ["SHIFT","BACK","SPACE","CLEAR","ENTER","SWITCH",".","/"].includes(k) ? k : k.toLowerCase())
  );

  const numLayout = [
    ["7","8","9","CLEAR"],
    ["4","5","6","BACK"],
    ["1","2","3","PASTE"],
    ["SWITCH","0","ENTER"]
  ];

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
      display: "flex",
      position: "fixed",
      background: "rgba(30,30,30,0.25)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "10px",
      zIndex: "99999",
      padding: "6px",
      boxSizing: "border-box",
      flexDirection: "column",
      userSelect: "none",
      touchAction: "none",
    });

    layout.forEach(rowKeys => {
      const row = document.createElement("div");
      Object.assign(row.style, { display: "flex", justifyContent: "center", width: "100%", marginBottom: "5px", gap: "4px" });

      rowKeys.forEach(key => {
        const btn = document.createElement("button");
        btn.dataset.key = key;

        btn.textContent =
          key === "BACK" ? "⌫" :
          key === "SPACE" ? "␣" :
          key === "ENTER" ? "▶" :
          key === "SWITCH" ? (layout === numLayout ? "[Aa]" : "[123]") :
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
    const leftDrawer = document.querySelector("#leftDrawer");
    const bottomBar = document.querySelector("#bottomBar");
    if (!leftDrawer || !bottomBar) return;

    if (!baseHeight) {
      buildKeyboard(currentLayout);
      baseHeight = calculateBaseHeight();
    }

    const drawerRect = leftDrawer.getBoundingClientRect();
    const bottomRect = bottomBar.getBoundingClientRect();
    const availableHeight = bottomRect.top - 12;
    const finalHeight = Math.min(baseHeight, availableHeight);
    const availableWidth = window.innerWidth - drawerRect.right - 10;

    kb.style.width = `${availableWidth}px`;
    kb.style.height = `${finalHeight}px`;
    kb.style.transform = "scale(1)";
    kb.style.transformOrigin = "bottom left";
    kb.style.left = `${drawerRect.right}px`;
    kb.style.bottom = `${window.innerHeight - bottomRect.top}px`;
  }

  window.addEventListener("resize", () => {
    if (kb.style.display === "flex") {
      kb.style.display = "none";
      isShift = false;
      shiftLock = false;
      activeInput = null;
    }
    baseHeight = null;
  });

  // ----------------------------------------------------
  // OPEN FOR INPUT
  // ----------------------------------------------------
  function openKeyboardForInput(input) {
    activeInput = input;
    const id = input.id.toLowerCase();
    const isNumeric = input.type === "number" || id.includes("pin") || id === "songinput";

    kb.dataset.numeric = isNumeric ? "1" : "0";
    currentLayout = isNumeric ? numLayout : (isShift ? alphaUpper : alphaLower);
    buildKeyboard(currentLayout);
    baseHeight = isNumeric ? 320 : null;

    kb.style.display = "flex";
    updateKeyboardPosition();

    activeInput.focus();
    const len = activeInput.value.length;
    activeInput.setSelectionRange(len, len);
    centerCaret(activeInput);
    
    activeInput.style.caretColor = "auto";
  }

  // ----------------------------------------------------
  // INPUT OVERRIDE
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
    kbKeyActive = true;

    const key = e.target.dataset.key;
    const btn = e.target;

    btn.classList.add("pressed");
    btn.style.borderColor = "#0ff";
    setTimeout(() => {
      btn.classList.remove("pressed");
      btn.style.borderColor = (key === "SHIFT" && isShift) ? "#0ff" : "#555";
    }, 80);

    if (key === "BACK") activeInput.value = activeInput.value.slice(0, -1);
    else if (key === "CLEAR") activeInput.value = "";
    else if (key === "SPACE") activeInput.value += " ";
    else if (key === "ENTER") {
      const enterBtn = e.target;
      playSound("clickA");
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

      activeInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      activeInput.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));

      setTimeout(() => {
        enterBtn.textContent = "▶";
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

      btn.classList.add("pressed");
      btn.style.borderColor = "#0ff";
      setTimeout(() => btn.classList.remove("pressed"), 80);

      setTimeout(() => {
          if (kb.dataset.numeric !== "1") {
              currentLayout = isShift ? alphaUpper : alphaLower;
              buildKeyboard(currentLayout);
              updateKeyboardPosition();

              const newShift = kb.querySelector('button[data-key="SHIFT"]');
              if (newShift) {
                  newShift.style.background = isShift ? "#777" : "#333";
                  newShift.style.borderColor = isShift ? "#0ff" : "#555";
              }

              // ✅ Keep caret visible after rebuild
              if (activeInput) {
                  activeInput.focus();
                  const len = activeInput.value.length;
                  activeInput.setSelectionRange(len, len);
                  centerCaret(activeInput);
              }
          }
      }, 200);
    }
    else if (key === "PASTE") {
      const txt = await navigator.clipboard.readText().catch(() => "");
      if (txt) activeInput.value += txt;
      activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      centerCaret(activeInput);
      return;
    }
    else if (key === "SWITCH") {
      isShift = false;
      shiftLock = false;

      const switchingToNumeric = currentLayout !== numLayout;
      currentLayout = switchingToNumeric ? numLayout : alphaLower;
      kb.dataset.numeric = switchingToNumeric ? "1" : "0";

      buildKeyboard(currentLayout);
      updateKeyboardPosition();

      // ✅ Keep caret visible after rebuild
      if (activeInput) {
          activeInput.focus();
          const len = activeInput.value.length;
          activeInput.setSelectionRange(len, len);
          centerCaret(activeInput);
      }

      return;
    }
    else {
      activeInput.value += key;
      const specialKeys = ["BACK","CLEAR","SPACE","ENTER","PASTE"];
      if (!shiftLock && kb.dataset.numeric !== "1" && isShift && !specialKeys.includes(key)) {
        isShift = false;
        currentLayout = alphaLower;
        buildKeyboard(currentLayout);
        updateKeyboardPosition();
      }
    }

      activeInput.dispatchEvent(new Event("input", { bubbles: true }));
      // Keep caret visible at all times
      if (activeInput) {
          const len = activeInput.value.length;
          activeInput.focus();
          activeInput.setSelectionRange(len, len);
          centerCaret(activeInput);
      }
  });

  // ----------------------------------------------------
  // CLICK OUTSIDE CLOSES KEYBOARD + DROPDOWN HANDLING
  // ----------------------------------------------------
  document.addEventListener("pointerdown", e => {
    if (!kb) return;

    const actionBtn = document.getElementById("actionBtn");
    const actionDropdown = document.getElementById("actionDropdown");
    const nextSongBtn = document.getElementById("nextSongBtn");
    const nextDropdown = document.getElementById("nextConfirmDropup");

    const clickedInsideKeyboard = kb.contains(e.target);
    const clickedInsideInput = [...document.querySelectorAll("input")].some(i => i.contains(e.target));
    const isEye = [...eyeIcons].includes(e.target);
    const isActionButton = actionBtn && actionBtn.contains(e.target);
    const isActionDropdownItem = actionDropdown && actionDropdown.contains(e.target);
    const isNextButton = nextSongBtn && nextSongBtn.contains(e.target);
    const isNextDropdownItem = nextDropdown && nextDropdown.contains(e.target);

    // 🔹 Only hide keyboard if clicked outside everything
    if (!clickedInsideKeyboard && !clickedInsideInput && !isEye) {
      kb.style.display = "none";
      isShift = false;
      shiftLock = false;
      activeInput = null;
    }

    // 🔹 Hide dropdowns if clicked outside their buttons
    if (!isActionButton && !isActionDropdownItem && actionDropdown) {
      actionDropdown.style.display = "none";
    }
    if (!isNextButton && !isNextDropdownItem && nextDropdown) {
      nextDropdown.style.display = "none";
    }
  });
}
