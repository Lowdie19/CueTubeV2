export function initCustomKeyboard() {

  // ----------------------------------
  // MOBILE CHECK (only phones/tablets)
  // ----------------------------------
  const isMobile =
    /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(navigator.userAgent) ||
    window.matchMedia("(max-width: 1024px)").matches;

  if (!isMobile) {
    console.log("Custom keyboard disabled — desktop mode");
    return;
  }

  console.log("Custom keyboard enabled — mobile detected");

  // ------------------- Create keyboard -------------------
  const kb = document.createElement('div');
  kb.id = 'customKeyboard';
  kb.style.display = 'none';
  kb.style.position = 'fixed';
  kb.style.bottom = '0';
  kb.style.right = '0';
  kb.style.width = '350px';
  kb.style.height = '270px';
  kb.style.background = '#222';
  kb.style.border = '2px solid #555';
  kb.style.borderRadius = '10px';
  kb.style.zIndex = '99999';
  kb.style.padding = '5px';
  kb.style.boxSizing = 'border-box';
  kb.style.display = 'flex';
  kb.style.flexDirection = 'column';
  kb.style.userSelect = 'none';
  kb.style.transformOrigin = 'bottom right';
  kb.style.touchAction = 'none'; // allow drag on mobile

  // ------------------- Resize handle -------------------
  const resizeHandle = document.createElement('div');
  resizeHandle.id = 'customKeyboardResizeHandle';
  resizeHandle.style.height = '15px';
  resizeHandle.style.width = '15px';
  resizeHandle.style.cursor = 'nwse-resize';
  resizeHandle.style.background = '#555';
  resizeHandle.style.borderRadius = '3px';
  resizeHandle.style.alignSelf = 'flex-end';
  resizeHandle.style.marginTop = 'auto';
  kb.appendChild(resizeHandle);

  document.body.appendChild(kb);

  // ------------------- Keyboard layouts -------------------
  const alphaLayoutUpper = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['Z','X','C','V','B','N','M','BACK'],
    ['SHIFT','SPACE']
  ];

  const alphaLayoutLower = alphaLayoutUpper.map(row =>
    row.map(key => (key === 'SHIFT' || key === 'BACK' || key === 'SPACE') ? key : key.toLowerCase())
  );

  const numLayout = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['0','BACK']
  ];

  let currentLayout = alphaLayoutUpper;
  let isShift = false;
  let shiftLock = false;
  let lastShiftTime = 0;
  let activeInput = null;

  // ------------------- Build keyboard -------------------
  function buildKeyboard(layout) {
    kb.querySelectorAll('div').forEach(div => {
      if (div !== resizeHandle) div.remove();
    });

    layout.forEach(rowKeys => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'center';
      row.style.marginBottom = '5px';
      row.style.flexWrap = 'nowrap';
      row.style.width = '100%';
      row.style.boxSizing = 'border-box';

      rowKeys.forEach(key => {
        const btn = document.createElement('button');
        btn.dataset.key = key;
        btn.textContent = key === 'BACK' ? '⌫' : key === 'SPACE' ? '␣' : key;
        btn.style.flex = (key === 'SPACE') ? '5' : '1';
        btn.style.margin = '2px';
        btn.style.height = '40px';
        btn.style.minWidth = '0';
        btn.style.borderRadius = '5px';
        btn.style.border = '1px solid #555';
        btn.style.background = '#333';
        btn.style.color = '#fff';
        btn.style.fontSize = '16px';
        btn.style.cursor = 'pointer';
        btn.style.userSelect = 'none';
        btn.style.boxSizing = 'border-box';

        if (key === 'SHIFT') btn.style.background = isShift ? '#777' : '#333';

        row.appendChild(btn);
      });

      kb.insertBefore(row, resizeHandle);
    });
  }

  buildKeyboard(currentLayout);

  // ------------------- Show keyboard -------------------
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('pointerdown', e => {
      e.preventDefault();
      activeInput = e.target;

      activeInput.setAttribute('inputmode', 'none');
      activeInput.removeAttribute('readonly');

      if (activeInput.type === 'number' || activeInput.id.toLowerCase().includes('pin')) {
        currentLayout = numLayout;
      } else {
        currentLayout = isShift ? alphaLayoutUpper : alphaLayoutLower;
      }

      buildKeyboard(currentLayout);
      kb.style.display = 'flex';

      const length = activeInput.value.length;
      activeInput.setSelectionRange(length, length);
      activeInput.focus();
    });
  });


// ------------------- Handle key clicks -------------------
kb.addEventListener('click', e => {
  e.stopPropagation();
  if (!e.target.dataset.key || !activeInput) return;

  const key = e.target.dataset.key;

  if (key === 'BACK') {
    activeInput.value = activeInput.value.slice(0, -1);
  } else if (key === 'SPACE') {
    activeInput.value += ' ';
  } else if (key === 'SHIFT') {
    const now = Date.now();
    if (now - lastShiftTime < 400) {
      shiftLock = !shiftLock;
      isShift = shiftLock;
    } else {
      isShift = !isShift;
      if (shiftLock) isShift = true;
    }
    lastShiftTime = now;

    // rebuild only for non-numeric / non-pin / non-songInput
    if (activeInput.type !== 'number' && !activeInput.id.toLowerCase().includes('pin') && activeInput.id !== 'songInput') {
      currentLayout = (isShift || shiftLock) ? alphaLayoutUpper : alphaLayoutLower;
      buildKeyboard(currentLayout);
    }
  } else {
    activeInput.value += key;

    // only reset shift for non-numeric / non-pin / non-songInput
    if (!shiftLock && activeInput.type !== 'number' && !activeInput.id.toLowerCase().includes('pin') && activeInput.id !== 'songInput') {
      isShift = false;
      currentLayout = alphaLayoutLower;
      buildKeyboard(currentLayout);
    }
  }

  activeInput.dispatchEvent(new Event('input', { bubbles: true }));
});

  // ------------------- Drag keyboard -------------------
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

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

  // ------------------- Resize keyboard -------------------
  let isResizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

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

// 1️⃣ Show keyboard when tapping an input
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('pointerdown', e => {
    // only show keyboard, don’t stop event propagation
    activeInput = e.target;

    activeInput.setAttribute('inputmode', 'none');
    activeInput.removeAttribute('readonly');

    // NUMERIC CONDITION
    if (
      activeInput.type === 'number' ||
      activeInput.id.toLowerCase().includes('pin') ||
      activeInput.id === 'songInput'
    ) {
      currentLayout = numLayout;
    } else {
      currentLayout = isShift ? alphaLayoutUpper : alphaLayoutLower;
    }

    buildKeyboard(currentLayout);
    kb.style.display = 'flex';

    const length = activeInput.value.length;
    activeInput.setSelectionRange(length, length);
    activeInput.focus();
  });
});

// 2️⃣ Hide keyboard when clicking outside
document.addEventListener('pointerdown', e => {
  const inputs = document.querySelectorAll('input');
  const isClickInsideKeyboard = kb.contains(e.target);
  const isClickInsideInput = [...inputs].some(i => i.contains(e.target));

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
