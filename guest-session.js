let guestUser = null;

function generateGuestId() {
  return "guest_" + Math.random().toString(36).substring(2, 10);
}

export function initGuestIfNeeded(isLoggedIn) {
  if (isLoggedIn) {
    clearGuest();
    return null;
  }

  const stored = sessionStorage.getItem("guestUser");

  if (stored) {
    guestUser = JSON.parse(stored);
    return guestUser;
  }

  guestUser = {
    id: generateGuestId(),
    username: "Guest",
    isGuest: true
  };

  sessionStorage.setItem("guestUser", JSON.stringify(guestUser));

  console.log("👤 Guest created:", guestUser);

  return guestUser;
}

export function getGuestUser() {
  if (guestUser) return guestUser;

  const stored = sessionStorage.getItem("guestUser");
  if (stored) return JSON.parse(stored);

  return null;
}

export function clearGuest() {
  guestUser = null;
  sessionStorage.removeItem("guestUser");
  console.log("🗑 Guest cleared");
}