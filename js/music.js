// Shuffled playlist of the lo-fi tracks listed in audio/tracks.json.

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function save(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
}

export class Music {
  constructor() {
    this.tracks = [];
    this.queue = [];
    this.current = null;
    this.on = load("rb.music", true);
    this.volume = load("rb.musicVol", 0.5);
    this.audio = new Audio();
    this.audio.preload = "metadata"; // long mixes stream as they play
    this.audio.volume = this.volume;
    this.audio.addEventListener("ended", () => this.next());
    this.audio.addEventListener("error", () => {
      // Skip unplayable files instead of stopping the playlist.
      if (this.tracks.length > 1) setTimeout(() => this.next(), 300);
    });
    this.onchange = () => {};
    this.started = false;
  }

  async init() {
    try {
      const res = await fetch("audio/tracks.json", { cache: "no-cache" });
      if (!res.ok) return;
      const data = await res.json();
      this.tracks = (data.tracks || []).filter((t) => t && t.file);
    } catch {
      this.tracks = [];
    }
    this.onchange();
  }

  get available() {
    return this.tracks.length > 0;
  }

  // Call from a user gesture (browsers block autoplay before one).
  start() {
    this.started = true;
    if (this.on && this.available && this.audio.paused) {
      if (!this.current) this.next();
      else this.audio.play().catch(() => {});
    }
  }

  next() {
    if (!this.available) return;
    if (!this.queue.length) {
      this.queue = this.tracks.slice().sort(() => Math.random() - 0.5);
      // avoid repeating the track that just ended
      if (this.queue.length > 1 && this.queue[this.queue.length - 1] === this.current) this.queue.reverse();
    }
    this.current = this.queue.pop();
    this.audio.src = `audio/${encodeURIComponent(this.current.file)}`;
    if (this.on && this.started) this.audio.play().catch(() => {});
    this.onchange();
  }

  toggle() {
    this.on = !this.on;
    save("rb.music", this.on);
    if (this.on) this.start();
    else this.audio.pause();
    this.onchange();
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    this.audio.volume = this.volume;
    save("rb.musicVol", this.volume);
  }

  // Quieter music while menus are open, like a lo-fi radio.
  duck(on) {
    this.audio.volume = on ? this.volume * 0.5 : this.volume;
  }
}
