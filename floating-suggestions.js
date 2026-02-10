// floating-suggestions.js
import { addToQueue } from './queue.js';
import { songbook } from './songbook.js';
import { showPopup } from './ui/ui-popups.js';

// DOM container
let container = null;
let ticker = null;

// Drag state
let isDragging = false;
let startX = 0;
let scrollLeft = 0;
let animationFrame = null;

// Scroll state
let scrollPos = 0;
let speed = 0.5; // pixels per frame

// ------------------------
// INIT CONTAINER
// ------------------------
function initContainer() {
  if (container) return;

  container = document.createElement('div');
  container.id = 'floatingSuggestions';
  container.style.position = 'absolute';
  container.style.top = '50%';
  container.style.left = '50%';
  container.style.transform = 'translate(-50%, -50%)';
  container.style.pointerEvents = 'none';
  container.style.zIndex = 9999;
  container.style.textAlign = 'center';
  container.style.width = '100%';
  container.style.color = 'white';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontWeight = 'bold';
  container.style.textShadow = '0 0 8px rgba(0,0,0,0.8)';
  container.style.userSelect = 'none';

  // Main text
  const mainText = document.createElement('div');
  mainText.id = 'floatingMainText';
  mainText.textContent = 'Please add new song';
  mainText.style.fontSize = '32px';
  mainText.style.marginBottom = '12px';
  container.appendChild(mainText);

  // Ticker container
  ticker = document.createElement('div');
  ticker.id = 'floatingTicker';
  ticker.style.position = 'relative';
  ticker.style.zIndex = '10000';
  ticker.style.width = '100%';
  ticker.style.overflow = 'hidden';
  ticker.style.whiteSpace = 'nowrap';
  ticker.style.fontSize = '20px';
  ticker.style.cursor = 'grab';
  ticker.style.pointerEvents = 'auto';
  container.appendChild(ticker);

  // Append to YouTube player wrapper
  const playerWrapper = document.getElementById('playerWrapper');
  playerWrapper.style.position = 'relative'; // ensure parent is positioned
  playerWrapper.appendChild(container);

  // ------------------------
  // DRAG EVENTS
  // ------------------------
  ticker.addEventListener('mousedown', dragStart);
  ticker.addEventListener('mousemove', dragMove);
  ticker.addEventListener('mouseup', dragEnd);
  ticker.addEventListener('mouseleave', dragEnd);

  // Touch support
  ticker.addEventListener('touchstart', dragStart, { passive: true });
  ticker.addEventListener('touchmove', dragMove, { passive: true });
  ticker.addEventListener('touchend', dragEnd);

  // ------------------------
  // RESIZE OBSERVER
  // ------------------------
  const verticalOffset = -50; // adjust this number: positive = lower, negative = higher

  const resizeObserver = new ResizeObserver(() => {
    // Center horizontally and adjust vertically
    container.style.top = `calc(50% + ${verticalOffset}px)`;
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
  });
  resizeObserver.observe(playerWrapper);
}

// ------------------------
// UPDATE SUGGESTIONS
// ------------------------
export function updateFloatingSuggestions(idleMode) {
  if (!container) initContainer();
  container.style.display = idleMode ? 'block' : 'none';
  if (idleMode) refreshSuggestions();
}

// ------------------------
// REFRESH CONTENT
// ------------------------
export function refreshSuggestions() {
  if (!ticker) return;

  // Hide ticker if there are no saved songs
  if (!songbook || songbook.length === 0) {
    ticker.style.display = 'none';
    return;
  } else {
    ticker.style.display = 'block';
  }

  ticker.innerHTML = '';
  ticker.style.pointerEvents = 'auto';

  // Get up to 7 songs randomly
  const maxSongs = Math.min(7, songbook.length);
  const shuffled = shuffleArray(songbook).slice(0, maxSongs);

  // Duplicate for infinite loop
  const looping = [...shuffled, ...shuffled];

looping.forEach(song => {
  const span = document.createElement('span');
  span.textContent = song.title + ' — ';
  span.style.display = 'inline-block';
  span.style.paddingRight = '50px';
  span.style.cursor = 'pointer';

  // Click to reserve/play WITHOUT switching tabs
  span.addEventListener('click', () => {
    const videoID = extractVideoID(song.url);
    if (!videoID) return showPopup("Cannot add song without a valid video ID ❌", 2000, 'red');

    addToQueue({ id: videoID, title: song.title });
    
    tabQueue.click();
    tabQueue.classList.add("active");
    tabQueue.classList.remove("inactive");
    tabSongbook.classList.remove("active");
    tabSongbook.classList.add("inactive");
  });

  // Highlight on hover
  span.addEventListener('mouseenter', () => {
    span.style.textShadow = '0 0 10px cyan, 0 0 20px cyan';
  });
  span.addEventListener('mouseleave', () => {
    span.style.textShadow = '';
  });

  ticker.appendChild(span);
});

  scrollPos = 0; // reset scroll
  startAutoScroll();
}

// ------------------------
// AUTO SCROLL
// ------------------------
function startAutoScroll() {
  cancelAnimationFrame(animationFrame);

  function step() {
    if (!isDragging && ticker.scrollWidth > 0) {
      scrollPos += speed;

      // Seamless looping
      if (scrollPos >= ticker.scrollWidth / 2) scrollPos = 0;
      ticker.scrollLeft = scrollPos;
    }
    animationFrame = requestAnimationFrame(step);
  }

  step();
}

// ------------------------
// DRAG HANDLERS
// ------------------------
function dragStart(e) {
  isDragging = true;
  ticker.style.cursor = 'grabbing';
  startX = e.pageX || e.touches?.[0]?.pageX;
  scrollLeft = scrollPos;

  // Prevent text selection while dragging
  e.preventDefault();
}

function dragMove(e) {
  if (!isDragging) return;
  const x = e.pageX || e.touches?.[0]?.pageX;
  const walk = x - startX;
  scrollPos = scrollLeft - walk;

  // Wrap around
  if (scrollPos < 0) scrollPos += ticker.scrollWidth / 2;
  if (scrollPos >= ticker.scrollWidth / 2) scrollPos -= ticker.scrollWidth / 2;

  ticker.scrollLeft = scrollPos;
}

function dragEnd() {
  if (!isDragging) return;
  isDragging = false;
  ticker.style.cursor = 'grab';
}

// ------------------------
// VIDEO ID EXTRACTOR
// ------------------------
function extractVideoID(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.substring(1);
    return u.searchParams.get('v');
  } catch {
    return null;
  }
}

// ------------------------
// SHUFFLE ARRAY
// ------------------------
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
