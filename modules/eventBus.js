// ======================================================
// eventBus.js — Simple publish/subscribe event system
// ======================================================

const listeners = new Map();

/**
 * Subscribe to an event
 */
export function on(eventName, callback) {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, []);
  }
  listeners.get(eventName).push(callback);
}

/**
 * Publish an event
 */
export function emit(eventName, data = null) {
  if (!listeners.has(eventName)) return;

  for (const callback of listeners.get(eventName)) {
    try {
      callback(data);
    } catch (err) {
      console.error(`EventBus error in event "${eventName}":`, err);
    }
  }
}

/**
 * Remove a subscriber (optional, rarely needed)
 */
export function off(eventName, callback) {
  if (!listeners.has(eventName)) return;

  const arr = listeners.get(eventName).filter(fn => fn !== callback);
  listeners.set(eventName, arr);
}
