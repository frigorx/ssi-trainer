/**
 * Audio SSI — Web Audio API (sans fichiers externes)
 * inerWeb Édu — F. Henninot
 */

class SSIAudio {
  constructor() {
    this.ctx = null;
    this.oscillators = {};
    this.gains = {};
    this.intervals = {};
    this.masterGain = null;
    this.muted = false;
  }

  _init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
  }

  resume() {
    this._init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // Alarme type 1 : 3 bips lents 520Hz (veille restreinte)
  alarmeRestreinte() {
    this.stop('alarme');
    this._init();
    let count = 0;
    const bip = () => {
      this._beep(520, 400, 'alarme');
      count++;
      if (count >= 3) count = 0;
    };
    bip();
    this.intervals.alarme = setInterval(bip, 1500);
  }

  // Alarme type 2 : bips rapides 800Hz (évacuation générale)
  evacuation() {
    this.stop('evacuation');
    this._init();
    const bip = () => this._beep(800, 200, 'evacuation');
    bip();
    this.intervals.evacuation = setInterval(bip, 400);
  }

  // Dérangement : bip 400Hz toutes les 30s
  derangement() {
    this.stop('derangement');
    this._init();
    const bip = () => this._beep(400, 300, 'derangement');
    bip();
    this.intervals.derangement = setInterval(bip, 30000);
  }

  // Click touche
  click() {
    this._init();
    this._beep(1000, 50, 'click');
  }

  // Beep générique
  _beep(freq, duration, id) {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration / 1000 + 0.05);
  }

  stop(id) {
    if (id) {
      if (this.intervals[id]) {
        clearInterval(this.intervals[id]);
        delete this.intervals[id];
      }
    } else {
      Object.keys(this.intervals).forEach(k => {
        clearInterval(this.intervals[k]);
        delete this.intervals[k];
      });
    }
  }

  stopAll() {
    this.stop();
  }

  mute() {
    this.muted = true;
    this.stopAll();
  }

  unmute() {
    this.muted = false;
  }

  toggle() {
    this.muted = !this.muted;
    if (this.muted) this.stopAll();
  }
}

if (typeof module !== 'undefined') module.exports = { SSIAudio };
