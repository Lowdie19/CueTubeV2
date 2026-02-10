/* ============================================
   UNIVERSAL ACTION BUTTON
   Supports: hover dim, click animations, icon change, pop effect
   Can be used for action buttons (pencil/save/check) or cancel (red X)
============================================ */
export function createActionButton({ 
    iconClass = "fa-solid fa-pencil", 
    type = "action",         // "action" or "cancel"
    onClick = null, 
    parent = document.body, 
    isMobile = false 
}) {
    // Create icon element
    const button = document.createElement("i");
    button.className = iconClass;
    button.style.fontSize = type === "cancel" ? "17px" : "15px";
    button.style.cursor = "pointer";
    button.style.color = type === "cancel" ? "#aaa" : "#aaa";
    button.style.transition = "opacity 0.35s ease, transform 0.2s ease, color 0.2s ease";
    button.style.opacity = isMobile ? "1" : (type === "cancel" ? "0" : "0"); // cancel hidden by default on desktop

    // Hover effect
    if (!isMobile) {
        button.addEventListener("mouseenter", () => {
            button.style.opacity = "1";
            if (type === "cancel") button.style.color = "red";
        });
        button.addEventListener("mouseleave", () => {
            button.style.opacity = type === "cancel" ? "0" : "0";
            if (type === "cancel") button.style.color = "#aaa";
        });
    }

    // Click animation helper
    const clickAnimate = (newIconClass = null, duration = 250, colorFlash = null) => {
        // scale pop
        button.style.transform = "scale(1.3)";
        setTimeout(() => button.style.transform = "scale(1)", 120);

        // icon-pop class
        button.classList.add("icon-pop");
        setTimeout(() => button.classList.remove("icon-pop"), duration);

        // change icon if specified
        if (newIconClass) button.className = newIconClass;

        // flash color (for cancel red)
        if (colorFlash) {
            const oldColor = button.style.color;
            button.style.color = colorFlash;
            setTimeout(() => button.style.color = oldColor, duration);
        }
    };

    // Attach click event
    button.addEventListener("click", (e) => {
        if (onClick) onClick(e, button, clickAnimate);
    });

    // Append to parent
    parent.appendChild(button);

    return button;
}
