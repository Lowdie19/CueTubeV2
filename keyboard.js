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
    transformOrigin: 'center center', // <-- center of keyboard
    touchAction: 'none',
  });

  document.body.appendChild(kb);

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

  function buildKeyboard(layout) {
    kb.querySelectorAll('div').forEach(div => div.remove());
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
        btn.textContent = key === 'BACK' ? '⌫' : key === 'SPACE' ? '␣' : key;
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

      kb.appendChild(row);
    });
  }

  buildKeyboard(currentLayout);

  function openKeyboardForInput(input) {
    activeInput = input;
    activeInput.setAttribute('inputmode', 'none');
    activeInput.removeAttribute('readonly');

    const id = activeInput.id.toLowerCase();
    const isNumeric = activeInput.type === 'number' || id.includes('pin') || id === 'songinput';
    currentLayout = isNumeric ? numLayout : (isShift ? alphaLayoutUpper : alphaLayoutLower);

    kb.style.width = isNumeric ? '300px' : '460px';
    kb.style.height = isNumeric ? '310px' : '270px';

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

  kb.addEventListener('click', async e => {
    if (!e.target.dataset.key || !activeInput) return;
    const key = e.target.dataset.key;
    if (key === 'BACK') activeInput.value = activeInput.value.slice(0, -1);
    else if (key === 'CLEAR') activeInput.value = '';
    else if (key === 'SPACE') activeInput.value += ' ';
    else if (key === 'SHIFT') {
      const now = Date.now();
      if (now - lastShiftTime < 400) { shiftLock = !shiftLock; isShift = shiftLock; }
      else { isShift = !isShift; if (shiftLock) isShift = true; }
      lastShiftTime = now;
      if (activeInput.type !== 'number' && !activeInput.id.toLowerCase().includes('pin') && activeInput.id !== 'songInput') {
        currentLayout = isShift ? alphaLayoutUpper : alphaLayoutLower;
        buildKeyboard(currentLayout);
      }
      return;
    } else if (key === 'PASTE') {
      try { const text = await navigator.clipboard.readText(); if (text) activeInput.value += text; }
      catch (err) { console.warn("Clipboard read blocked:", err); }
      return;
    } else activeInput.value += key;

    if (!shiftLock && activeInput.type !== 'number' && !activeInput.id.toLowerCase().includes('pin') && activeInput.id !== 'songInput') {
      isShift = false;
      currentLayout = alphaLayoutLower;
      buildKeyboard(currentLayout);
    }

    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // ------------------- Drag + Center Pinch-to-Zoom -------------------
  let isDragging = false;
  let dragOffsetX = 0, dragOffsetY = 0;
  let pointers = {};
  let initialDistance = 0;
  let initialScale = 1;
  let center = { x: 0, y: 0 };

  kb.addEventListener('pointerdown', e => {
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };

    if (Object.keys(pointers).length === 1) {
      // Drag
      isDragging = true;
      const rect = kb.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
    } else if (Object.keys(pointers).length === 2) {
      // Pinch
      isDragging = false;
      const keys = Object.keys(pointers);
      const p1 = pointers[keys[0]];
      const p2 = pointers[keys[1]];
      initialDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const rect = kb.getBoundingClientRect();
      center = { x: rect.width / 2, y: rect.height / 2 };
      const transform = kb.style.transform.match(/scale\(([\d.]+)\)/);
      initialScale = transform ? parseFloat(transform[1]) : 1;
    }

    kb.setPointerCapture(e.pointerId);
  });

  kb.addEventListener('pointermove', e => {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };

    if (Object.keys(pointers).length === 1 && isDragging) {
      kb.style.left = `${e.clientX - dragOffsetX}px`;
      kb.style.top = `${e.clientY - dragOffsetY}px`;
      kb.style.right = 'auto';
      kb.style.bottom = 'auto';
    } else if (Object.keys(pointers).length === 2) {
      const keys = Object.keys(pointers);
      const p1 = pointers[keys[0]];
      const p2 = pointers[keys[1]];
      const currentDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const scale = initialScale * (currentDistance / initialDistance);
      kb.style.transformOrigin = 'center center'; // ensure scaling from center
      kb.style.transform = `scale(${Math.max(0.5, Math.min(scale, 3))})`;
    }
  });

  kb.addEventListener('pointerup', e => { delete pointers[e.pointerId]; isDragging = false; });
  kb.addEventListener('pointercancel', e => { delete pointers[e.pointerId]; isDragging = false; });

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
