// ======================================================
// player.js — YouTube player control (safe ES-module version)
// ======================================================

// Import ONLY what does NOT create circular import
import { setPlayer, state } from "./main.js";            // OK
import { emit, on } from "./modules/eventBus.js";        // FIXED — no more circular import


/* =========================
   INIT YOUTUBE PLAYER
========================= */

export function initYouTubePlayer() {
  if (!window.YT || !YT.Player) {
    console.warn("YT API not ready yet");
    return;
  }

  console.log("Initializing YouTube Player…");

  const player = new YT.Player("ytPlayer", {
    height: "390",
    width: "640",
    videoId: "",
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });

  setPlayer(player);
}


/* =========================
   YT CALLBACKS
========================= */

function onPlayerReady() {
  console.log("YT Player ready");
  emit("player:ready");
}

function onPlayerStateChange(event) {
  switch (event.data) {
    case YT.PlayerState.ENDED:
      emit("player:ended");
      break;

    case YT.PlayerState.PLAYING:
      emit("player:playing");
      break;

    case YT.PlayerState.PAUSED:
      emit("player:paused");
      break;
  }
}


/* =========================
   SONG PLAYBACK
========================= */

export function playSong(song) {
  if (!state.ytPlayer) {
    console.warn("Player not ready");
    return;
  }

  state.currentSong = song;
  state.ytPlayer.loadVideoById(song.videoId);

  console.log("Playing:", song.title || "[no title]");
}


/* =========================
   AUTO-PLAY MANAGER
========================= */

function playNextFromQueueInternal() {
  if (!state.queue.length) {
    console.log("Queue empty → stopping auto-play");
    state.currentSong = null;
    state.isPlayingQueue = false;
    return;
  }

  const next = state.queue.shift();
  state.currentSong = next;

  console.log("▶ Auto-playing next:", next.title);

  if (state.ytPlayer) {
    state.ytPlayer.loadVideoById(next.videoId);
  }

  emit("queue:updated", state.queue);
  emit("song:changed", next);
}


// EventBus listener
on("player:ended", () => {
  if (!state.isPlayingQueue) {
    console.log("Video ended → NOT in queue mode");
    return;
  }

  console.log("Queue mode active → playing next…");
  playNextFromQueueInternal();
});