// queue.js — manages the queue display and modifications

import { state } from "../main.js";  // fix path based on folder structure
import { checkQueueStart } from "../player.js"; // adjust path to player.js

/* =========================
   ADD TO QUEUE
========================= */
export function addToQueue(song) {
  state.queue.push(song);
  renderQueue();

  // Auto-start queue if nothing is playing
  checkQueueStart();
}

/* =========================
   REMOVE FROM QUEUE
========================= */
export function removeFromQueue(index) {
  state.queue.splice(index, 1);
  renderQueue();
}

/* =========================
   RENDER QUEUE LIST
========================= */
export function renderQueue() {
  const container = document.getElementById("queueList");
  container.innerHTML = "";

  state.queue.forEach((song, index) => {
    const div = document.createElement("div");
    div.classList.add("queue-item");
    div.innerHTML = `
      ${song.title}
      <i class="fa-solid fa-trash-can queue-trash" data-index="${index}"></i>
    `;
    container.appendChild(div);
  });

  updateUpNextBox();
  attachQueueTrashEvents();
}

/* =========================
   "UP NEXT" LABEL
========================= */
function updateUpNextBox() {
  const box = document.getElementById("upNextBox");
  const title = document.getElementById("upNextTitle");

  if (state.queue.length > 0) {
    box.style.display = "block";
    title.textContent = state.queue[0].title;
  } else {
    box.style.display = "none";
    title.textContent = "(none)";
  }
}

/* =========================
   DELETE ICON LOGIC
========================= */
function attachQueueTrashEvents() {
  document.querySelectorAll(".queue-trash").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      removeFromQueue(idx);
    });
  });
}
