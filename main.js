import { refreshSuggestions } from './floating-suggestions.js';
import { renderSongbook, activateSongbookTab } from './songbook.js';
import { loadProfile } from "./modules/profile.js";
import "./modules/auth.js";
import * as Events from "./modules/eventBus.js";

export const state = {
  ytPlayer: null,
  queue: [],
  songbook: [],
  currentSong: null,
  isPlayingQueue: false,
  playerReady: false
};

export function setPlayer(player){
  state.ytPlayer=player;
  state.playerReady=true;
  Events.emit('player:ready');
  console.log("YT Player registered");
}

export const emit=Events.emit;
export const on=Events.on;
export const off=Events.off;
window.emit=emit; window.on=on; window.off=off;

on("player:ready",()=>console.log("EventBus → player:ready received"));
on("player:playing",()=>console.log("EventBus → player:playing"));
on("player:paused",()=>console.log("EventBus → player:paused"));
on("player:ended",()=>console.log("EventBus → player:ended"));

// React to auth events
on("auth:login",user=>{
  console.log("EventBus → auth:login:",user.username);
  refreshSuggestions(true);
});
on("auth:logout",()=>{
  console.log("EventBus → auth:logout");
  refreshSuggestions(true);
});

document.addEventListener("DOMContentLoaded",()=>{
  renderSongbook();
  activateSongbookTab();
  refreshSuggestions(true);
  console.log("App initialized. Waiting for user login...");
});