/* =============================
   Karaoke Score Modal - Neon 3-Layer Card - Tap Outside to Skip
============================= */

import { playSound } from "../sounds.js";

/* --- Button CSS (internal use only) --- */
const btnCSS = `
.ui-btn {
  background: black;
  border: 2px solid #333333;
  padding: 12px 20px;
  font-size: 16px;
  color: white;
  border-radius: 12px;
  cursor: pointer;
  font-weight: bold;
  transition: transform 0.2s, box-shadow 0.2s, border 0.2s, color 0.2s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 10px #333333, inset 0 0 5px #333333;
}
.ui-btn:active { transform: scale(0.97); }
`;

const styleTag = document.createElement("style");
styleTag.textContent = btnCSS;
document.head.appendChild(styleTag);

const isTouch = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
if (isTouch) document.body.classList.add('touch-device');


/* ============================
   Score Modal CSS
============================ */
const scoreCSS = `
.score-modal {
  display: none;
  position: fixed;
  inset: 0;
  background: transparent;
  backdrop-filter: blur(10px);
  justify-content: center;
  align-items: center;
  z-index: 3000;
  user-select: none;
  cursor: default;
}

.score-box {
  position: relative;
  width: 230px;
  height: 230px;
  padding: 30px;
  border-radius: 32px;
  color: white;
  background: rgba(20,20,20,0.95);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1px;
  transform: translateY(10px) scale(0.96);
  opacity: 0;
  transition: 0.25s ease-out;
  z-index: 10;
}

.score-modal.modal-open .score-box {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.score-modal.modal-closing .score-box {
  pointer-events: none;
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}

.score-layer-wrapper { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: -1; }
.score-layer { position: absolute; inset: 0; border-radius: 32px; }
.score-bottom-layer { background: #000; transform: scale(1.04); filter: blur(2px); }

.score-neon-layer {
  position: absolute;
  width: 150px;
  height: 600px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 32px;
  transform-origin: center;
  background: conic-gradient(
    from 0deg,
    rgba(255,0,168,1),
    rgba(0,255,247,1),
    rgba(255,0,168,1)
  );
  animation: score-neon-spin 2s linear infinite;
  filter: blur(20px) brightness(1.3);
}

@keyframes score-neon-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}

.score-top-layer { background: #0f0f12; border-radius: 28px; inset: 5px; position: absolute; }

.score-label { font-size: 1.3rem; color: #ccc; letter-spacing: 1px; margin-top: 10px; text-align: center; }
.score-number { font-size: 7rem; font-weight: bold; color: white; text-shadow: 0 0 20px gray,0 0 40px gray; animation: pulse 1s infinite ease-in-out; text-align: center; }
@keyframes pulse { 0%,100%{ transform: scale(1);} 50%{ transform: scale(1.08);} }

.score-message {
  font-size: 1.8rem;
  color: #ffd700;
  opacity: 0;
  transform: scale(0.6);
  filter: blur(8px);
  transition:
    opacity 0.5s ease-out,
    transform 0.5s cubic-bezier(0.25, 1.5, 0.5, 1),
    filter 0.6s ease-out;
  text-align: center;
  pointer-events: none;
}

.score-message.show {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
  text-shadow: 
    0 0 10px #ffdd44,
    0 0 25px #ffdd44,
    0 0 45px #ffaa00;
}

.score-canvas { 
  position: fixed; top: 0; left: 0; 
  pointer-events: none; 
  z-index: 5000;
}

/* Pop Effect */
.score-number.final {
  animation: popScore 0.45s ease-out forwards;
}

@keyframes popScore {
  0% { transform: scale(1); }
  60% { transform: scale(1.25); }
  80% { transform: scale(0.92); }
  100% { transform: scale(1); }
}

/* Shake Effect */
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-3px); }
}

.score-number.shake {
  animation: shake 0.4s ease;
}

/* Floating crown sparkle */
.crown-sparkle {
  position: absolute;
  left: 50%;
  top: 65px;
  transform: translateX(-50%);
  font-size: 50px;       /* bigger */
  pointer-events: none;
  animation: crownFloat 5.5s ease-out forwards;
  text-shadow: 0 0 20px gold, 0 0 40px yellow, 0 0 60px orange;
}

@keyframes crownFloat {
  0%   { transform: translate(-50%, 0px) scale(0); opacity: 0; }
  15%  { transform: translate(-50%, -30px) scale(1.3); opacity: 1; } /* pop up */
  25%  { transform: translate(-50%, -60px) scale(1); opacity: 1; }   /* settle */
  75%  { transform: translate(-50%, -60px) scale(1); opacity: 1; }   /* stay visible */
  100% { transform: translate(-50%, -120px) scale(0.6); opacity: 0; } /* fade out */
}
`;

const scoreStyleTag = document.createElement("style");
scoreStyleTag.textContent = scoreCSS;
document.head.appendChild(scoreStyleTag);


/* ============================
   Create Modal
============================ */
export function createScoreModal(id="scoreModal") {
  const modal = document.createElement("div");
  modal.id = id;
  modal.className = "score-modal";

  const canvas = document.createElement("canvas");
  canvas.className = "score-canvas";
  modal.appendChild(canvas);

  const box = document.createElement("div");
  box.className = "score-box";

  box.innerHTML = `
    <div class="score-layer-wrapper">
      <div class="score-layer score-bottom-layer"></div>
      <div class="score-layer score-neon-layer"></div>
      <div class="score-layer score-top-layer"></div>
    </div>
    <div class="score-label">Your Score</div>
    <div class="score-number" id="${id}-value">0</div>
    <div class="score-message" id="${id}-message">Hmmmm...</div>
  `;

  modal.appendChild(box);

  modal.addEventListener("click", (e) => {
    if (!box.contains(e.target)) {
      modal._stopped = true;
    }
  });

  document.body.appendChild(modal);
  return modal;
}


/* ============================
   Show Score Modal
============================ */
export function showScore(id="scoreModal", duration=3000) {
  const modal = document.getElementById(id) || createScoreModal(id);
  const scoreEl = modal.querySelector(`#${id}-value`);
  const messageEl = modal.querySelector(`#${id}-message`);
  const canvas = modal.querySelector("canvas");

  let current = 0;
  modal._stopped = false;


  /** ------------------------------
   * Formula B — realistic karaoke curve
   ------------------------------ */
  function generateKaraokeScore() {
    let base = Math.random();
    base = Math.pow(base, 0.55) * 0.85 + Math.random() * 0.15;
    let score = Math.floor(base * 100);
    if (score > 97) score = 97 + Math.floor(Math.random() * 3);
    return Math.min(100, score);
  }

    // Generate real karaoke score (0–100)
    let realScore = generateKaraokeScore();

    // Scale 0–100 → 60–100 (realistic karaoke style)
    //let finalScore = 80; //(for testing 100 score)
    let finalScore = Math.round(60 + realScore * 0.4);

    // Always cap at 100
    finalScore = Math.min(100, finalScore);


  modal.style.display = "flex";
  modal.classList.add("modal-open");
  modal.classList.remove("modal-closing");

  messageEl.classList.remove("show");

  // 🎵 DRUMROLL
  const drumroll = new Audio("assets/audio/drumroll.wav");
  drumroll.loop = true;
  drumroll.play();


  /** ------------------------------
   * MAIN COUNT-UP LOOP
   ------------------------------ */
  modal._interval = setInterval(() => {

// ✔ SKIP or ✔ FINISH
if (modal._stopped || current >= finalScore) {

  clearInterval(modal._interval);

  drumroll.pause();
  drumroll.currentTime = 0;

  scoreEl.textContent = finalScore;
  updateScoreGlow(scoreEl, finalScore); // ensure final glow

  showFinalMessage(finalScore, messageEl);


// Play drumroll end + cheer depending on score
let drumrollEnd, cheer, trumpet = null;

if (finalScore < 70) {
  // FAIL / LOW SCORE
  drumrollEnd = new Audio("assets/audio/drumroll_end_B.wav");
  cheer = new Audio("assets/audio/cheer_B.wav");
  trumpet = new Audio("assets/audio/trumpet_B.wav");   // sad trumpet always plays
} else {
  // PASS SCORE (70–100)
  drumrollEnd = new Audio("assets/audio/drumroll_end_A.wav");
  cheer = new Audio("assets/audio/cheer_A.wav");

  if (finalScore === 100) {
    trumpet = new Audio("assets/audio/trumpet_A.wav"); // happy trumpet ONLY on perfect 100
  }
}

drumrollEnd.play();
cheer.play();

// play trumpet only if it exists
if (trumpet) {
  setTimeout(() => trumpet.play(), 300);
}

  launchConfetti(canvas);

// 👑 Crown Sparkle for PERFECT 100
if (finalScore === 100) {
  const box = scoreEl.closest('.score-box');

  // Add extra padding-top to make room for crown
  box.style.paddingTop = "50px";

  const crown = document.createElement("div");
  crown.className = "crown-sparkle";
  crown.textContent = "👑";
  box.appendChild(crown);

  // Remove crown and reset padding after animation
  setTimeout(() => {
    crown.remove();
    box.style.paddingTop = ""; // reset to original
  }, 5000);
}

  setTimeout(() => closeScore(modal), 4000);
  return;
}

    // Update glow based on current score
    scoreEl.textContent = finalScore;
    //updateScoreGlow(scoreEl, current);

    // Continue counting
    current++;
    scoreEl.textContent = current;



  }, 20);


  /** ------------------------------
   * Final message
   ------------------------------ */
function showFinalMessage(score, messageEl) {
  let message = "";

  if(score < 60) message = "😵 Practice pa.";
  else if(score < 70) message = "🙂 Pwede na!";
  else if(score < 80) message = "😎 Ayos!";
  else if(score < 90) message = "😍 Wow!";
  else if(score < 95) message = "🤩 Singer yarn?";
  else if(score < 98) message = "🔥 Grabe!";
  else if(score < 100) message = "✨ Almost PERFECT!";
  else if(score === 100) message = "PERFECT!";

  messageEl.textContent = message;
  setTimeout(() => messageEl.classList.add("show"), 100);

  // Match color/glow to final score
  const glow = getScoreGlowStyle(score); 
  messageEl.style.color = glow.color;
  messageEl.style.textShadow = glow.textShadow;

  // Shake if below 70
  if (score < 70) {
    scoreEl.classList.add("shake");
    setTimeout(() => scoreEl.classList.remove("shake"), 500);
  } else {
    scoreEl.classList.add("final");
    setTimeout(() => scoreEl.classList.remove("final"), 600);
  }
}
}


/* ============================
   Confetti
============================ */
function launchConfetti(canvas) {
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const confetti = [];
  for (let i = 0; i < 150; i++) {
    confetti.push({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height - canvas.height,
      r: Math.random()*6+4,
      d: Math.random()*5+2,
      color: `hsl(${Math.random()*360},100%,60%)`,
      tilt: Math.random()*10-10,
      tiltAngleIncrement: Math.random()*0.07+0.05,
      tiltAngle: 0
    });
  }

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    confetti.forEach(c=>{
      ctx.beginPath();
      ctx.lineWidth = c.r;
      ctx.strokeStyle = c.color;
      ctx.moveTo(c.x+c.tilt+c.r/2, c.y);
      ctx.lineTo(c.x+c.tilt, c.y+c.tilt+c.r/2);
      ctx.stroke();
    });
    update();
  }

  function update(){
    confetti.forEach(c=>{
      c.y += Math.cos(c.d)+2;
      c.tiltAngle += c.tiltAngleIncrement;
      c.tilt = Math.sin(c.tiltAngle)*15;
      if(c.y>canvas.height){
        c.y=-20;
        c.x=Math.random()*canvas.width;
      }
    });
  }

  function loop(){ draw(); requestAnimationFrame(loop); }
  loop();

  setTimeout(()=>{ canvas.style.display="none"; }, 4000);
}


/* ============================
   Close Modal (same as ui-modals.js)
============================ */
function closeScore(modal){
  modal.classList.add("modal-closing");
  modal.classList.remove("modal-open");

  // Reset the score text glow to default gray
  const scoreEl = modal.querySelector('.score-number');
  if(scoreEl){
    scoreEl.style.textShadow = "0 0 20px gray, 0 0 40px gray";
  }

  setTimeout(()=>{
    modal.style.display = "none";
    modal.classList.remove("modal-closing");
  }, 250);
}

// ----------------------------
// Update score glow based on percentage
// ----------------------------
function updateScoreGlow(scoreEl, score) {
  if(score < 60) {
    scoreEl.style.textShadow = "0 0 10px #333333, 0 0 20px #6f6f6f"; // gray
  }
  else if(score < 70) {
    scoreEl.style.textShadow = "0 0 10px #ff0000, 0 0 20px #ff4444"; // Red
  }
  else if(score < 80) {
    scoreEl.style.textShadow = "0 0 25px #ff00ff, 0 0 50px #ff77ff"; // Pink/Magenta
  }
  else if(score < 90) {
    scoreEl.style.textShadow = "0 0 10px #ff8800, 0 0 25px #ffaa00"; // Orange
  }
  else if(score < 95) {
    scoreEl.style.textShadow = "0 0 15px #00ffff, 0 0 30px #7fffff"; // cyan
  }
  else if(score < 100) {
    scoreEl.style.textShadow = "0 0 20px #00ff00, 0 0 40px #7cff7c"; // green
  }
  else if(score === 100) {
    scoreEl.style.textShadow = "0 0 30px gold, 0 0 60px yellow"; // Golden for PERFECT
  }
}

function getScoreGlowStyle(score) {
  if(score < 60) 
    return { color: "#aaa", textShadow: "0 0 10px #333333, 0 0 20px #6f6f6f" }; // gray
  else if(score < 70) 
    return { color: "#ff4444", textShadow: "0 0 10px #ff0000, 0 0 20px #ff4444" }; // Red
  else if(score < 80) 
    return { color: "#ff77ff", textShadow: "0 0 25px #ff00ff, 0 0 50px #ff77ff" }; // Pink/Magenta
  else if(score < 90) 
    return { color: "#ffaa00", textShadow: "0 0 10px #ff8800, 0 0 25px #ffaa00" }; // Orange
  else if(score < 95) 
    return { color: "#7fffff", textShadow: "0 0 15px #00ffff, 0 0 30px #7fffff" }; // Cyan
  else if(score < 100) 
    return { color: "#7cff7c", textShadow: "0 0 20px #00ff00, 0 0 40px #7cff7c" }; // Green
  else // score === 100
    return { color: "gold", textShadow: "0 0 30px gold, 0 0 60px yellow" }; // Golden
}