/* ============================================
   PROFILE ICON & COLOR PICKER DRAWER
============================================ */
export function showProfilePicker(mainProfileIcon, nameText, onChangeCallback) {
  // Remove existing drawer if any
  const existing = document.getElementById('profilePickerDrawer');
  if (existing) existing.remove();

  // Create drawer container
  const drawer = document.createElement('div');
  drawer.id = 'profilePickerDrawer';
  drawer.style.position = 'absolute';
  drawer.style.width = 'auto';
  drawer.style.minWidth = '200px';
  drawer.style.maxWidth = '90%';
  drawer.style.background = '#222';
  drawer.style.padding = '15px';
  drawer.style.borderRadius = '12px';
  drawer.style.boxShadow = '0 4px 20px rgba(0,0,0,0.6)';
  drawer.style.display = 'flex';
  drawer.style.flexDirection = 'column';
  drawer.style.alignItems = 'flex-start';
  drawer.style.gap = '12px';
  drawer.style.opacity = '0';
  drawer.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  drawer.style.transform = 'translateY(-10px)';
  drawer.style.zIndex = '9999';

  // Position drawer below profile icon
  const iconRect = mainProfileIcon.getBoundingClientRect();
  drawer.style.top = iconRect.bottom + window.scrollY + 8 + 'px';
  drawer.style.left = iconRect.left + window.scrollX + 'px';

  document.body.appendChild(drawer);

  // Animate in
  setTimeout(() => {
    drawer.style.opacity = '1';
    drawer.style.transform = 'translateY(0)';
  }, 10);

  // -----------------------------
  // TITLE
  // -----------------------------
  const title = document.createElement('div');
  title.textContent = 'Choose profile';
  title.style.color = 'cyan';
  title.style.fontWeight = 'bold';
  drawer.appendChild(title);

  // -----------------------------
  // COLOR PICKER
  // -----------------------------
  const colorRow = document.createElement('div');
  colorRow.style.display = 'flex';
  colorRow.style.alignItems = 'center';
  colorRow.style.gap = '10px';
  drawer.appendChild(colorRow);

  const colorLabel = document.createElement('div');
  colorLabel.textContent = 'Color:';
  colorLabel.style.color = 'white';
  colorRow.appendChild(colorLabel);

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#555555';
  colorInput.style.width = '32px';
  colorInput.style.height = '32px';
  colorInput.style.border = 'none';
  colorInput.style.cursor = 'pointer';
  colorRow.appendChild(colorInput);

  colorInput.addEventListener('input', () => {
    mainProfileIcon.style.background = colorInput.value;
    nameText.style.color = colorInput.value;
    if (typeof onChangeCallback === 'function') {
      onChangeCallback({ color: colorInput.value });
    }
  });

  // -----------------------------
  // ICON PICKER
  // -----------------------------
  const iconTitle = document.createElement('div');
  iconTitle.textContent = 'Icon:';
  iconTitle.style.color = 'white';
  iconTitle.style.marginTop = '8px';
  drawer.appendChild(iconTitle);

  const icons = [
    'fa-cannabis','fa-cross','fa-hamsa','fa-star-and-crescent','fa-star-of-david','fa-yin-yang',
    'fa-ribbon','fa-heart','fa-bolt','fa-radiation','fa-ghost','fa-skull','fa-poop',
    'fa-worm','fa-spider','fa-dog','fa-shrimp','fa-cat','fa-paw',
    'fa-crow','fa-dove','fa-hippo','fa-horse','fa-fish','fa-dragon',
    'fa-apple-whole','fa-carrot','fa-pizza-slice','fa-beer-mug-empty','fa-martini-glass',
    'fa-robot','fa-jedi','fa-circle-nodes','fa-user-astronaut',
    'fa-masks-theater','fa-music','fa-headphones','fa-bomb','fa-fire-flame-curved',
    'fa-meteor','fa-snowflake','fa-sun','fa-moon','fa-cloud-showers-heavy',
    'fa-cloud-bolt'
  ];

  const iconContainer = document.createElement('div');
  iconContainer.style.display = 'grid';
  iconContainer.style.gridTemplateColumns = 'repeat(auto-fit, 32px)';
  iconContainer.style.gap = '8px';
  iconContainer.style.width = '100%';
  drawer.appendChild(iconContainer);

  let selectedIcon = null;

  icons.forEach(ic => {
    const iEl = document.createElement('i');
    iEl.className = `fa-solid ${ic}`;
    iEl.style.color = 'white';
    iEl.style.fontSize = '20px';
    iEl.style.cursor = 'pointer';
    iEl.style.transition = 'all 0.2s ease';

    // Hover animation
    iEl.addEventListener('mouseenter', () => {
      iEl.style.transform = 'scale(1.3)';
      iEl.style.color = 'cyan';
      iEl.style.textShadow = '0 0 8px cyan';
    });
    iEl.addEventListener('mouseleave', () => {
      iEl.style.transform = 'scale(1)';
      iEl.style.color = (selectedIcon === ic) ? 'cyan' : 'white';
      iEl.style.textShadow = (selectedIcon === ic) ? '0 0 8px cyan' : 'none';
    });

    // Click selection
    iEl.addEventListener('click', () => {
      selectedIcon = ic;
      mainProfileIcon.innerHTML = `<i class="fa-solid ${ic}" style="color:white; font-size:24px;"></i>`;
      iconContainer.querySelectorAll('i').forEach(el => {
        el.style.color = 'white';
        el.style.textShadow = 'none';
      });
      iEl.style.color = 'cyan';
      iEl.style.textShadow = '0 0 8px cyan';

      if (typeof onChangeCallback === 'function') {
        onChangeCallback({ icon: mainProfileIcon.innerHTML });
      }
    });

    iconContainer.appendChild(iEl);
  });
}
