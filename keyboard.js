export function initCustomKeyboard() {

  // ----------------------------------
  // MOBILE CHECK (phones/tablets only)
  // ----------------------------------
  const isMobile =
    /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(navigator.userAgent) ||
    window.matchMedia("(max-width: 1024px)").matches;

  if (!isMobile) {
    console.log("Custom keyboard disabled — desktop mode");
    return;
  }

  console.log("Custom keyboard enabled — mobile detected");

  // ------------------- Create keyboard container -------------------
  const kb = document.createElement('div');
  kb.id = 'customKeyboard';
  Object.assign(kb.style, {
    display: 'none',
    position: 'fixed',
    bottom: '140px',
    right: '0',
    background: '#222',
    border: '2px solid #555',
    borderRadius: '10px',
    zIndex: '99999',
    padding: '5px',
    boxSizing: 'border-box',
    flexDirection: 'column',
    userSelect: 'none',
    transformOrigin: 'bottom right',
    touchAction: 'none'
  });

  // ------------------- Resize Handle -------------------
  const resizeHandle = document.createElement('div');
  Object.assign(resizeHandle.style, {
    height: '15px',
    width: '15px',
    cursor: 'nwse-resize',
    background: '#555',
    borderRadius: '3px',
    alignSelf: 'flex-end',
    marginTop: 'auto'
  });
  kb.appendChild(resizeHandle);

  document.body.appendChild(kb);

  // ------------------- Keyboard Layouts -------------------
  const alphaLayoutUpper = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M','BACK'],
    ['SHIFT','SPACE','CLEAR']
  ];

  const alphaLayoutLower = alphaLayoutUpper.map(row =>
    row.map(key =>
      (key === 'SHIFT' || key === 'BACK' || key === 'SPACE' || key === 'CLEAR') ? key : key.toLowerCase()
    )
  );

  const numLayout = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['CLEAR','0','BACK'],
    ['PASTE']
  ];

  let currentLayout = alphaLayoutUpper;
  let isShift = false;
  let shiftLock = false;
  let lastShiftTime = 0;
  let activeInput = null;

  // ------------------- Build Keyboard -------------------
  function buildKeyboard(layout) {
    kb.querySelectorAll('div').forEach(div => {
      if (div !== resizeHandle) div.remove();
    });

    layout.forEach(rowKeys => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '5px',
        flexWrap: 'nowrap',
        width: '100%',
        boxSizing: 'border-box'
      });

      rowKeys.forEach(key => {
        const btn = document.createElement('button');
        btn.dataset.key = key;
        btn.textContent = key === 'BACK' ? '⌫' :
                          key === 'SPACE' ? '␣' : key;

        Object.assign(btn.style, {
          flex: (key === 'SPACE') ? '5' : '1',
          margin: '2px',
          height: '40px',
          minWidth: '0',
          borderRadius: '5px',
          border: '1px solid #555',
          background: key === 'SHIFT' && isShift ? '#777' : '#333',
          color: '#fff',
          fontSize: '16px',
          cursor: 'pointer',
          userSelect: 'none',
          boxSizing: 'border-box'
        });

        row.appendChild(btn);
      });

      kb.insertBefore(row, resizeHandle);
    });
  }

  buildKeyboard(currentLayout);

  // ------------------- OPEN keyboard on input focus -------------------
  function openKeyboardForInput(input) {
    activeInput = input;

    activeInput.setAttribute('inputmode', 'none');
    activeInput.removeAttribute('readonly');

    const id = activeInput.id.toLowerCase();
    const isNumeric = activeInput.type === 'number' || id.includes('pin') || id === 'songinput';

    // Set layout
    currentLayout = isNumeric ? numLayout : (isShift ? alphaLayoutUpper : alphaLayoutLower);

    // Adjust keyboard container size based on layout
    if (isNumeric) {
      kb.style.width = '300px';   // narrower numeric keyboard
      kb.style.height = '310px';  // shorter numeric keyboard
    } else {
      kb.style.width = '460px';   // default alphabet width
      kb.style.height = '270px';  // default alphabet height
    }

    buildKeyboard(currentLayout);
    kb.style.display = 'flex';

    const length = activeInput.value.length;
    activeInput.setSelectionRange(length, length);
    activeInput.focus();
  }

  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('pointerdown', e => {
      e.preventDefault();
      openKeyboardForInput(input);
    });
  });

  // ------------------- Key Press Handler -------------------
  kb.addEventListener('click', async e => {
    if (!e.target.dataset.key || !activeInput) return;

    const key = e.target.dataset.key;

    if (key === 'BACK') {
      activeInput.value = activeInput.value.slice(0, -1);

    } else if (key === 'CLEAR') {
      activeInput.value = '';

    } else if (key === 'SPACE') {
      activeInput.value += ' ';

    } else if (key === 'SHIFT') {
      const now = Date.now();

      // Double tap shift -> LOCK
      if (now - lastShiftTime < 400) {
        shiftLock = !shiftLock;
        isShift = shiftLock;
      } else {
        isShift = !isShift;
        if (shiftLock) isShift = true;
      }
      lastShiftTime = now;

      if (activeInput.type !== 'number' &&
          !activeInput.id.toLowerCase().includes('pin') &&
          activeInput.id !== 'songInput') {
        currentLayout = isShift ? alphaLayoutUpper : alphaLayoutLower;
        buildKeyboard(currentLayout);
      }
      return;

      } else if (key === 'PASTE') {
        try {
          const text = await navigator.clipboard.readText();
          if (text) activeInput.value += text;
        } catch (err) {
          console.warn("Clipboard read blocked:", err);
        }
        return;

    } else {
      activeInput.value += key;

      if (!shiftLock &&
          activeInput.type !== 'number' &&
          !activeInput.id.toLowerCase().includes('pin') &&
          activeInput.id !== 'songInput') {
        isShift = false;
        currentLayout = alphaLayoutLower;
        buildKeyboard(currentLayout);
      }
    }

    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // ------------------- Drag Keyboard -------------------
  let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;

  kb.addEventListener('pointerdown', e => {
    if (e.target.tagName === 'BUTTON' || e.target === resizeHandle) return;

    isDragging = true;
    dragOffsetX = e.clientX - kb.getBoundingClientRect().left;
    dragOffsetY = e.clientY - kb.getBoundingClientRect().top;
    kb.setPointerCapture(e.pointerId);
  });

  kb.addEventListener('pointermove', e => {
    if (!isDragging) return;

    kb.style.left = `${e.clientX - dragOffsetX}px`;
    kb.style.top = `${e.clientY - dragOffsetY}px`;
    kb.style.right = 'auto';
    kb.style.bottom = 'auto';
  });

  kb.addEventListener('pointerup', e => {
    isDragging = false;
    kb.releasePointerCapture(e.pointerId);
  });

  // ------------------- Resize Keyboard -------------------
  let isResizing = false, startX = 0, startY = 0, startWidth = 0, startHeight = 0;

  resizeHandle.addEventListener('pointerdown', e => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = kb.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;
    resizeHandle.setPointerCapture(e.pointerId);
  });

  resizeHandle.addEventListener('pointermove', e => {
    if (!isResizing) return;

    const scaleX = (startWidth + (e.clientX - startX)) / startWidth;
    const scaleY = (startHeight + (startY - e.clientY)) / startHeight;
    const scale = Math.max(scaleX, scaleY);

    kb.style.transform = `scale(${scale})`;
  });

  resizeHandle.addEventListener('pointerup', e => {
    isResizing = false;
    resizeHandle.releasePointerCapture(e.pointerId);
  });

  // ------------------- Hide Keyboard Outside -------------------
  document.addEventListener('pointerdown', e => {
    const inputs = [...document.querySelectorAll('input')];
    const isClickInsideKeyboard = kb.contains(e.target);
    const isClickInsideInput = inputs.some(i => i.contains(e.target));

    if (!isClickInsideKeyboard && !isClickInsideInput) {
      kb.style.display = 'none';
      isShift = false;
      shiftLock = false;
      kb.style.transform = 'scale(1)';
      if (activeInput) activeInput.removeAttribute('inputmode');
      activeInput = null;
    }
  });
}
