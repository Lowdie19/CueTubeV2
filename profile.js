import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-init.js';
import { showProfilePicker } from './profile-picker.js';
import { showPopup } from "./ui/ui-popups.js";
import { playSound } from './sounds.js';

/* -----------------------------
   BLINK & GLOW EFFECTS
----------------------------- */
const blinkStyle = document.createElement("style");
blinkStyle.textContent = `
@keyframes textBlink { 0% { opacity: 1; } 50% { opacity: 0.35; } 100% { opacity: 1; } }
.blink-editing { animation: textBlink 1.4s ease-in-out infinite; }

.icon-pop { transform: scale(1.3); }

.save-glow, .cancel-glow { animation: glowPulse 0.5s ease; }
@keyframes glowPulse { 0% { filter: drop-shadow(0 0 0px currentColor); } 50% { filter: drop-shadow(0 0 6px currentColor); } 100% { filter: drop-shadow(0 0 0px currentColor); } }

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.cancel-press { transform: scale(1.3); color: red; }

/* SPINNING CYAN ICON */
.spin-cyan {
  animation: spin 1s linear infinite;
  color: cyan !important;
}

/* CHECK ICON */
.check-cyan {
  color: cyan !important;
}
`;
document.head.appendChild(blinkStyle);

export async function loadProfile(username, container) {
    if (!container) return;

    // Load Firestore data
    const userRef = doc(db, "users", username);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return showPopup("Profile data not found ❌", 3000, "red");
    const data = userSnap.data();
    const profile = data.profile || {};
    const cueId = data.cueId || "";

    const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // MAIN WRAPPER
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px";
    wrapper.style.padding = "12px 0px";
    wrapper.style.color = "white";
    wrapper.style.fontFamily = "Arial, sans-serif";
    wrapper.style.minWidth = "200px";
    wrapper.style.position = "relative";
    wrapper.style.zIndex = "0";

    // PROFILE ICON
    const profileIcon = document.createElement("div");
    profileIcon.style.width = "48px";
    profileIcon.style.height = "48px";
    profileIcon.style.borderRadius = "50%";
    profileIcon.style.display = "flex";
    profileIcon.style.alignItems = "center";
    profileIcon.style.justifyContent = "center";
    profileIcon.style.cursor = "default";
    profileIcon.style.flexShrink = "0";
    profileIcon.style.flexGrow = "0";
    profileIcon.style.flexBasis = "48px";
    profileIcon.style.background = profile.color || "#00ffff";
    const iconClass = `fa-solid ${profile.icon || "fa-music"}`;
    profileIcon.innerHTML =
      `<i class="${iconClass}" style="color:white; font-size:24px;"></i>`;
    profileIcon.style.pointerEvents = "none";

    // TEXT CONTAINER
    const textContainer = document.createElement("div");
    textContainer.style.display = "flex";
    textContainer.style.flexDirection = "column";
    textContainer.style.gap = "2px";
    textContainer.style.alignItems = "flex-start";

    // NAME ROW
    const nameRow = document.createElement("div");
    nameRow.style.display = "flex";
    nameRow.style.alignItems = "center";
    nameRow.style.gap = "20px";

    const nameText = document.createElement("span");
    nameText.textContent = profile.name || username;
    nameText.style.fontWeight = "bold";
    nameText.style.userSelect = "none";
    nameText.style.border = "none";
    nameText.style.caretColor = "white";
    nameText.style.maxWidth = "250px";
    nameText.style.whiteSpace = "normal";
    nameText.style.wordBreak = "break-word";
    let oldName = nameText.textContent;

    // EDIT PENCIL
    const editPencil = document.createElement("i");
    editPencil.className = "fa-solid fa-pencil";
    editPencil.style.fontSize = "15px";
    editPencil.style.cursor = "pointer";
    editPencil.style.color = "#aaa";
    editPencil.style.transition = "opacity 0.35s ease , transform 0.2s ease";
    editPencil.style.opacity = isMobile ? "1" : "0";

    // CANCEL X
    const cancelX = document.createElement("i");
    cancelX.className = "fa-solid fa-xmark";
    cancelX.style.fontSize = "17px";
    cancelX.style.cursor = "pointer";
    cancelX.style.color = "#aaa";
    cancelX.style.opacity = "0";
    cancelX.style.transition = "opacity 0.35s ease, transform 0.2s ease, color 0.2s ease";
    cancelX.style.marginLeft = "-12px";
    cancelX.style.pointerEvents = "none";

    // DESKTOP HOVER
    if (!isMobile) {
        nameRow.addEventListener("mouseenter", () => { if (!nameText.isContentEditable) editPencil.style.opacity = "1"; });
        nameRow.addEventListener("mouseleave", () => { if (!nameText.isContentEditable) editPencil.style.opacity = "0"; });
    }

    // PROFILE PICKER STATE
    let pickerOpen = false;
    let savedSelection = {
        icon: profileIcon.innerHTML,
        background: profileIcon.style.background,
        textColor: nameText.style.color || 'white'
    };
    let lastSelection = { ...savedSelection };

    const togglePicker = () => {
        if (!nameText.isContentEditable) return;
        pickerOpen = !pickerOpen;
        const drawer = document.getElementById("profilePickerDrawer");
        if (pickerOpen) {
            playSound("clickB");
            showProfilePicker(profileIcon, nameText, (changes) => {
                if (changes.icon) profileIcon.innerHTML = changes.icon;
                if (changes.color) {
                    profileIcon.style.background = changes.color;
                    nameText.style.color = changes.color;
                    lastSelection.icon = profileIcon.innerHTML;
                    lastSelection.background = profileIcon.style.background;
                    lastSelection.textColor = nameText.style.color;
                }
            });
        } else if (drawer) drawer.remove();
    };
    profileIcon.addEventListener("click", togglePicker);

    // CUE ID
    const cueIdRow = document.createElement("div");
    cueIdRow.style.display = "flex";
    cueIdRow.style.alignItems = "center";
    cueIdRow.style.gap = "4px";

    const cueIdLabel = document.createElement("span");
    cueIdLabel.textContent = "Cue ID:";
    cueIdLabel.style.fontSize = "12px";
    cueIdLabel.style.opacity = "0.6";
    cueIdLabel.style.userSelect = "none";

    const cueIdValue = document.createElement("span");
    cueIdValue.textContent = cueId;
    cueIdValue.style.fontSize = "12px";
    cueIdValue.style.opacity = "0.6";
    cueIdValue.style.userSelect = "none";

    cueIdRow.appendChild(cueIdLabel);
    cueIdRow.appendChild(cueIdValue);

    // BUILD COMPONENT
    nameRow.appendChild(nameText);
    nameRow.appendChild(editPencil);
    nameRow.appendChild(cancelX);
    textContainer.appendChild(nameRow);
    textContainer.appendChild(cueIdRow);
    wrapper.appendChild(profileIcon);
    wrapper.appendChild(textContainer);
    container.appendChild(wrapper);

    wrapper.setCueID = (newID) => { cueIdValue.textContent = newID; };

    /* --------------------------
       ICON HOVER EFFECTS
    -------------------------- */
    editPencil.addEventListener("mouseenter", () => {
        if (nameText.isContentEditable) editPencil.style.color = "cyan";
    });
    editPencil.addEventListener("mouseleave", () => {
        if (nameText.isContentEditable) editPencil.style.color = "white";
    });

    cancelX.addEventListener("mouseenter", () => {
        if (nameText.isContentEditable) cancelX.style.color = "red";
    });
    cancelX.addEventListener("mouseleave", () => {
        if (nameText.isContentEditable) cancelX.style.color = "#aaa";
    });

    // CLICK → EDIT / SAVE
    editPencil.addEventListener("click", async () => {
        const newName = nameText.textContent.trim();

        // --- CLOSE PROFILE PICKER IF OPEN ---
        if (pickerOpen) {
            const drawer = document.getElementById("profilePickerDrawer");
            if (drawer) {
                drawer.style.opacity = "0";
                drawer.style.transform = "translateY(-10px)";
                setTimeout(() => drawer.remove(), 250);
            }
            pickerOpen = false;
        }

        // ENTER EDIT MODE
        if (!nameText.isContentEditable) {
            playSound("clickB");
            oldName = nameText.textContent;
            lastSelection = { ...savedSelection };
            nameText.contentEditable = "true";
            nameText.focus();
            nameText.style.userSelect = "text";
            nameText.style.outline = "none";
            nameText.classList.add("blink-editing");
            profileIcon.classList.add("blink-editing");
            profileIcon.style.cursor = "pointer";
            profileIcon.style.pointerEvents = "auto";
            wrapper.style.zIndex = "1001";
            cancelX.style.opacity = "1";
            cancelX.style.pointerEvents = "auto";

            editPencil.style.transform = "scale(0.8)";
            setTimeout(() => editPencil.style.transform = "scale(1)", 120);
            setTimeout(() => {
                editPencil.className = "fa-solid fa-floppy-disk";
                editPencil.classList.add("icon-pop");
                setTimeout(() => editPencil.classList.remove("icon-pop"), 250);
            }, 120);
            
            return;
        }


        // ERROR: blank/whitespace
        if (!newName) {
            cancelX.click();
            setTimeout(() => showPopup("Name cannot be empty! ❌", 2500, "red"), 300);
            return;
        }

        // NO CHANGES → show popup, then exit edit mode like usual
        if (
            newName === oldName &&
            profileIcon.innerHTML === savedSelection.icon &&
            profileIcon.style.background === savedSelection.background
        ) {
            setTimeout(() => showPopup("No changes to save!", 2500, "cyan"), 300);

            // EXIT EDIT MODE
            nameText.contentEditable = "false";
            nameText.classList.remove("blink-editing");
            profileIcon.classList.remove("blink-editing");
            nameText.style.userSelect = "none";
            profileIcon.style.cursor = "default";
            profileIcon.style.pointerEvents = "none";
            wrapper.style.zIndex = "0";
            cancelX.style.opacity = "0";
            cancelX.style.pointerEvents = "none";
            editPencil.className = "fa-solid fa-pencil";
            editPencil.style.color = "#aaa";
            editPencil.style.opacity = isMobile ? "1" : "0";

            return;
        }

        // --- START SAVE: spinning cyan circle ---
        editPencil.className = "fa-solid fa-circle-notch spin-cyan";

        // DISABLE CANCEL ICON WHILE SAVING
        cancelX.style.pointerEvents = "none";
        cancelX.style.display = "none";

        // APPLY LOCAL SAVE
        savedSelection.icon = profileIcon.innerHTML;
        savedSelection.background = profileIcon.style.background;
        savedSelection.textColor = nameText.style.color;
        oldName = newName;

        // SAVE TO FIRESTORE
        try {
            const iconClass = lastSelection.icon.match(/class="([^"]+)"/)[1];
            await setDoc(doc(db, "users", username), {
                profile: {
                    name: nameText.textContent,
                    icon: iconClass,
                    color: profileIcon.style.background
                }
            }, { merge: true });
        } catch (err) {
            console.error(err);
            showPopup("Failed to save profile ❌", 2500, "red");
            editPencil.className = "fa-solid fa-floppy-disk";
            editPencil.style.color = "#aaa";
            return;
        }

        // --- FINISH SAVE ---
        editPencil.className = "fa-solid fa-check check-cyan";
        setTimeout(() => {
            editPencil.className = "fa-solid fa-pencil";
            editPencil.style.color = "#aaa";
            editPencil.style.opacity = isMobile ? "1" : "0";

            cancelX.style.pointerEvents = "none";
            cancelX.style.display = "block";
        }, 800);

        showPopup("User profile updated! ✅", 3000, "green");

        // CLEANUP EDIT MODE
        nameText.contentEditable = "false";
        nameText.classList.remove("blink-editing");
        profileIcon.classList.remove("blink-editing");
        nameText.style.userSelect = "none";
        profileIcon.style.cursor = "default";
        profileIcon.style.pointerEvents = "none";
        wrapper.style.zIndex = "0";
        cancelX.style.opacity = "0";
        cancelX.style.pointerEvents = "none";
    });

    // CANCEL / AUTO-CLOSE
    cancelX.addEventListener("click", () => {
        if (!nameText.isContentEditable) return;
        playSound("hover");

        cancelX.classList.add("cancel-press");
        setTimeout(() => cancelX.classList.remove("cancel-press"), 300);

        nameText.textContent = oldName;
        profileIcon.innerHTML = savedSelection.icon;
        profileIcon.style.background = savedSelection.background;
        nameText.style.color = savedSelection.textColor;

        nameText.contentEditable = "false";
        nameText.classList.remove("blink-editing");
        profileIcon.classList.remove("blink-editing");
        nameText.style.userSelect = "none";
        profileIcon.style.cursor = "default";
        profileIcon.style.pointerEvents = "none";

        cancelX.style.opacity = "0";
        cancelX.style.pointerEvents = "none";

        editPencil.className = "fa-solid fa-pencil";
        editPencil.style.color = "#aaa";
        editPencil.style.opacity = isMobile ? "1" : "0";

        wrapper.style.zIndex = "0";
        pickerOpen = false;

        const drawer = document.getElementById("profilePickerDrawer");
        if (drawer) drawer.remove();

        lastSelection = { ...savedSelection };
    });

    // DOCUMENT CLICK TO AUTO-CLOSE PICKER / CANCEL EDIT
    document.addEventListener("click", (e) => {
        const wrapperClick = wrapper.contains(e.target);
        const picker = document.getElementById("profilePickerDrawer");
        const pickerClick = picker && picker.contains(e.target);
        if (!wrapperClick && !pickerClick) {
            if (pickerOpen && picker) {
                picker.style.opacity = "0";
                picker.style.transform = "translateY(-10px)";
                setTimeout(() => picker.remove(), 250);
                pickerOpen = false;
            } else if (nameText.isContentEditable) {
                cancelX.click();
            }
        }
    });
}

