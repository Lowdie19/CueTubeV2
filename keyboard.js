export function initCustomKeyboard() {
  const isMobile =
    /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(navigator.userAgent) ||
    window.matchMedia("(max-width: 1024px)").matches;

  if (!isMobile) return console.log("Custom keyboard disabled — desktop mode");

  console.log("Custom keyboard enabled — mobile detected");

  const kb = document.createElement('div');
  kb.id = 'customKeyboard';
  Object.assign(kb.style, {
    display: 'none',
    position: 'fixed',
    background: '#222',
    border: '2px solid #555',
    borderRadius: '10px',
    zIndex: '99999',
    padding: '5px',
    boxSizing: 'border-box',
    flexDirection: 'column',
    userSelect: 'none',
    touchAction: 'none',
  });
  document.body.appendChild(kb);

  // --------------------------
  // NEW KEYBOARD LAYOUTS
  // --------------------------
  const alphaLayoutUpper = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M','BACK','CLEAR'],
    ['SHIFT','SPACE','ENTER']
  ];

  const alphaLayoutLower = alphaLayoutUpper.map(row =>
    row.map(key => ['SHIFT','BACK','SPACE','CLEAR','ENTER'].includes(key) ? key : key.toLowerCase())
  );

  const numLayout = [
    ['CLEAR','BACK'],
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['PASTE','0','ENTER']
  ];

  let currentLayout = alphaLayoutUpper;
  let isShift = false;
  let shiftLock = false;
  let lastShiftTime = 0;
  let activeInput = null;

  function buildKeyboard(layout) {
    kb.innerHTML = '';
    layout.forEach(rowKeys => {
      const row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', justifyContent: 'center', marginBottom: '5px', width: '100%', gap: '4px' });

      rowKeys.forEach(key => {
        const btn = document.createElement('button');
        btn.dataset.key = key;
        btn.textContent = key === 'BACK' ? '⌫' : key === 'SPACE' ? '␣' : key === 'ENTER' ? '▶' : key;

        Object.assign(btn.style, {
          flex: (key === 'SPACE') ? '5' : '1',
          height: '40px',
          borderRadius: '5px',
          border: '1px solid #555',
          background: (key === 'SHIFT' && isShift) ? '#777' : '#333',
          color: '#fff',
          fontSize: '16px',
          userSelect: 'none'
        });
        row.appendChild(btn);
      });

      kb.appendChild(row);
    });
  }

function updateKeyboardPosition() {
  const leftDrawer = document.querySelector('#leftDrawer');
  const bottomBar = document.querySelector('#bottomBar');
  if (!leftDrawer || !bottomBar) return;

  const drawerRect = leftDrawer.getBoundingClientRect();
  const bottomRect = bottomBar.getBoundingClientRect();

  // Base heights
  let naturalHeight = kb.dataset.numeric === "1" ? 380 : 270;

  // Dynamically adjust if screen is too small
  const availableHeight = bottomRect.top - 10;
  if (kb.dataset.numeric === "1" && availableHeight < naturalHeight) {
    // Shrink numeric keyboard slightly to fit small screens
    naturalHeight = availableHeight;
  }

  const finalHeight = Math.min(naturalHeight, availableHeight);

  kb.style.left = `${drawerRect.right}px`;
  kb.style.bottom = `${window.innerHeight - bottomRect.top}px`;
  kb.style.height = `${finalHeight}px`;

  const availableWidth = window.innerWidth - drawerRect.right - 10;
  kb.style.width = `${availableWidth}px`;

  const scale = finalHeight / (kb.dataset.numeric === "1" ? 380 : 270); // base scale
  kb.style.transform = `scale(${scale})`;
  kb.style.transformOrigin = "bottom left";
}

  window.addEventListener('resize', updateKeyboardPosition);

  function openKeyboardForInput(input) {
    activeInput = input;
    kb.dataset.numeric = "0";

    const id = activeInput.id.toLowerCase();
    const isNumeric = activeInput.type === 'number' || id.includes('pin') || id === 'songinput';
    currentLayout = isNumeric ? numLayout : (isShift ? alphaLayoutUpper : alphaLayoutLower);
    kb.dataset.numeric = isNumeric ? "1" : "0";

    buildKeyboard(currentLayout);
    kb.style.display = 'flex';
    updateKeyboardPosition();

    const len = activeInput.value.length;
    activeInput.setSelectionRange(len, len);
    activeInput.focus();
  }

  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('pointerdown', e => {
      e.preventDefault();
      openKeyboardForInput(input);
    });
  });

kb.addEventListener('click', async e => {
    if (!e.target.dataset.key || !activeInput) return;

    const key = e.target.dataset.key;

    // 🔹 Animate key press for all keys except SHIFT and PASTE
    if (!['SHIFT','PASTE'].includes(key)) {
        e.target.classList.add('key-pressed');
        setTimeout(() => e.target.classList.remove('key-pressed'), 80);
    }

    // --- key actions ---
    if (key === 'BACK') activeInput.value = activeInput.value.slice(0, -1);
    else if (key === 'CLEAR') activeInput.value = '';
    else if (key === 'SPACE') activeInput.value += ' ';
    else if (key === 'ENTER') {
        activeInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        activeInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    }
    else if (key === 'SHIFT') {
        const now = Date.now();
        if (now - lastShiftTime < 400) shiftLock = !shiftLock;
        isShift = shiftLock ? true : !isShift;
        lastShiftTime = now;

        // only rebuild if layout actually changes (Shift pressed)
        if (kb.dataset.numeric !== "1") {
            currentLayout = isShift ? alphaLayoutUpper : alphaLayoutLower;
            buildKeyboard(currentLayout);
            updateKeyboardPosition();
        }
        return; // exit early so no other actions
    }
    else if (key === 'PASTE') {
        try { 
            const txt = await navigator.clipboard.readText(); 
            if (txt) activeInput.value += txt; 
        } catch { 
            console.warn('Clipboard blocked'); 
        }
        return;
    }
    else activeInput.value += key;

    // ✅ DO NOT rebuild keyboard for normal letter keys
    // only reset shift if not locked
    if (!shiftLock && kb.dataset.numeric !== "1" && isShift) {
        isShift = false;
        currentLayout = alphaLayoutLower;
        buildKeyboard(currentLayout); // only rebuild once after shift reset
        updateKeyboardPosition();
    }

    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
});

  document.addEventListener('pointerdown', e => {
    const insideKB = kb.contains(e.target);
    const insideInput = [...document.querySelectorAll('input')].some(i => i.contains(e.target));
    const isEyeClick = [...document.querySelectorAll('.auth-eye-icon')].some(icon => icon.contains(e.target));

    if (!insideKB && !insideInput && !isEyeClick) {
      kb.style.display = 'none';
      isShift = false;
      shiftLock = false;
      activeInput = null;
    }
  });
}
