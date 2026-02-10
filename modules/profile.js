/* ============================================
   PROFILE CORE SYSTEM (ES Module)
   Loads + Saves user profile safely
   ============================================ */

console.log("Profile Module — Loaded");

// --------------------------------------------
// Default profile template
// --------------------------------------------
const DEFAULT_PROFILE = {
  name: "Guest User",
  color: "#ffffff",
  avatar: "default",   // future-use
  uid: null
};

// --------------------------------------------
// Internal state
// --------------------------------------------
let profile = null;

// --------------------------------------------
// Load profile from localStorage
// --------------------------------------------
export function loadProfile() {
  try {
    const saved = localStorage.getItem("cuetube_profile");

    if (!saved) {
      console.log("Profile: No saved profile, creating new.");
      profile = structuredClone(DEFAULT_PROFILE);

      // Generate UID once for lifetime
      profile.uid = "UID-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      saveProfile();
    } else {
      profile = JSON.parse(saved);
      console.log("Profile loaded:", profile);
    }

    return profile;

  } catch (e) {
    console.error("Profile load error:", e);
    profile = structuredClone(DEFAULT_PROFILE);
    return profile;
  }
}

// --------------------------------------------
// Save to localStorage
// --------------------------------------------
export function saveProfile() {
  try {
    localStorage.setItem("cuetube_profile", JSON.stringify(profile));
    console.log("Profile saved.");
  } catch (e) {
    console.error("Profile save error:", e);
  }
}

// --------------------------------------------
// Get profile (read-only)
// --------------------------------------------
export function getProfile() {
  return profile;
}

// --------------------------------------------
// Update specific fields
// --------------------------------------------
export function updateProfile(data = {}) {
  profile = {
    ...profile,
    ...data
  };
  saveProfile();
}
