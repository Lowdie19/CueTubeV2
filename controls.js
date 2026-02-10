// Simple YouTube play/pause controls for testing

let player;

// YouTube API will auto-call this function
function onYouTubeIframeAPIReady() {
  player = new YT.Player("ytPlayer", {
    height: "100%",
    width: "100%",
    videoId: "dQw4w9WgXcQ" // test only
  });
}

function playVideo() {
  if (player) player.playVideo();
}

function pauseVideo() {
  if (player) player.pauseVideo();
}
