/* =============================
   Glass-style Modal System (theme-colored frost + fade close)
============================= */

const modalCSS = `
.modal {
  display: none;
  position: fixed;
  top:0; left:0; right:0; bottom:0;
  background: transparent;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content h3, .modal-content p {
  margin:0; text-align:center;
}

.modal-buttons {
  display:flex;
  gap:15px;
  margin-top:5px;
}

.modal-content {
  --frost-color: rgba(255,255,255,0.25);
  background: rgba(0,0,0,0.25);
  backdrop-filter: blur(10px);
  color: white;
  padding: 25px 30px;
  border: 1px solid var(--frost-color);
  border-radius: 24px 0 24px 0;
  min-width: 200px;
  max-width: 300px;
  width: 90%;
  box-shadow: inset 0 0 50px var(--frost-color), 0 8px 16px rgba(0,0,0,0.5);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  transform: scale(0.95);
  opacity:0;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out, opacity 0.25s ease-out;
}

.modal.modal-open .modal-content {
  transform: scale(1);
  opacity: 1;
}

.modal.modal-closing .modal-content {
  pointer-events: none;
  opacity:0;
  transform: scale(0.95);
}

.btnX {
  position: absolute;
  top:10px; right:10px;
  width:32px; height:32px;
  border:none; background:transparent;
  color:#e5e5e5; font-size:22px; font-weight:bold;
  cursor:pointer; display:flex; justify-content:center; align-items:center;
  transition: transform 0.1s, color 0.1s;
}
.btnX:hover { color:red; }
.btnX:active { transform: scale(0.85); color:red; }
`;

const styleTag = document.createElement("style");
styleTag.textContent = modalCSS;
document.head.appendChild(styleTag);

// Modal logic
export function setupModals() {
  const modals = document.querySelectorAll(".modal");

  modals.forEach(modal => {
    const content = modal.querySelector(".modal-content");
    const closeBtn = modal.querySelector(".btnX");

    const themeAttr = modal.dataset.theme || "cyan";
    const namedColors = { cyan:"#00ffff", magenta:"#ff00ff", yellow:"#ffff00", green:"#00ff00", red:"#ff0000", blue:"#0099ff", white:"#ffffff" };
    const themeColor = namedColors[themeAttr] || themeAttr;
    content.style.setProperty("--frost-color", themeColor+"44");

    if(closeBtn) closeBtn.onclick = () => closeModal(modal);

    modal.onclick = e => {
      if(!content.contains(e.target)) closeModal(modal);
    };
  });
}

export function openModal(modal) {
  modal.style.display = "flex";
  modal.classList.add("modal-open");
  modal.classList.remove("modal-closing");
}

export function closeModal(modal) {
  modal.classList.add("modal-closing");
  modal.classList.remove("modal-open");
  setTimeout(() => {
    modal.style.display = "none";
    modal.classList.remove("modal-closing");
  }, 250);
}

// Ask confirm using the HTML modal (do not create dynamic one)
export function askConfirm({ title, message, theme = "cyan", onYes }) {
  const confirmModal = document.getElementById("confirmModal");
  const confirmTitle = document.getElementById("confirmModalTitle");
  const confirmMessage = document.getElementById("confirmModalMessage");
  const btnYes = document.getElementById("confirmModalYes");
  const btnNo = document.getElementById("confirmModalNo");
  const btnClose = confirmModal.querySelector(".btnX");

  confirmTitle.textContent = title;
  confirmMessage.innerHTML = message;
  confirmModal.dataset.theme = theme;

  // Remove old listeners
  btnYes.onclick = btnNo.onclick = btnClose.onclick = null;

  btnYes.onclick = () => {
    closeModal(confirmModal);
    if(onYes) onYes();
  };
  btnNo.onclick = () => closeModal(confirmModal);
  btnClose.onclick = () => closeModal(confirmModal);

  openModal(confirmModal);
}

document.addEventListener("DOMContentLoaded", setupModals);
