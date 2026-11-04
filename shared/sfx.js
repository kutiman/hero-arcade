// Synth sound effects, background music and vibration, shared by every minigame.
window.Sfx = (() => {
  const KEY = 'hero-arcade.muted';
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const BEAT = 60 / 132 / 2;
  const CHORDS = [
    { root: 110, notes: [220, 261.63, 329.63, 440] },
    { root: 87.31, notes: [174.61, 220, 261.63, 349.23] },
    { root: 130.81, notes: [261.63, 329.63, 392, 523.25] },
    { root: 98, notes: [196, 246.94, 293.66, 392] },
  ];
  const ARPEGGIO = [0, 1, 2, 3, 2, 1, 2, 3];
  const BASS_STEPS = [0, 3, 6];

  let audio = null;
  let master = null;
  let musicBus = null;
  let noise = null;
  let musicTimer = 0;
  let nextNote = 0;
  let step = 0;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

  function wake() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    if (!audio) {
      audio = new Ctx();
      master = audio.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(audio.destination);
      musicBus = audio.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(master);
      noise = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    if (audio.state === 'suspended') audio.resume();
    return true;
  }

  function tone(freq, start, length, type = 'triangle', volume = .18, out = master, slideTo = 0) {
    const t = audio.currentTime + start;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + length);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + length);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + length);
  }

  function hiss(start, length, from, to, volume, out = master) {
    const t = audio.currentTime + start;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + length);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + length);
    source.connect(filter).connect(gain).connect(out);
    source.start(t);
    source.stop(t + length);
  }

  const semitone = (base, steps) => base * Math.pow(2, steps / 12);

  const sounds = {
    pick() { tone(420, 0, .07, 'sine', .12, master, 720); },
    drop() { tone(260, 0, .1, 'sine', .12, master, 150); },
    near() { tone(1250, 0, .04, 'sine', .05); },
    tap() { tone(520, 0, .06, 'square', .05, master, 780); },
    snap(combo = 1) {
      const note = semitone(523.25, SCALE[Math.min(combo - 1, SCALE.length - 1)]);
      tone(150, 0, .09, 'sine', .22, master, 60);
      hiss(0, .05, 3200, 1400, .12);
      tone(note, .01, .12, 'triangle', .2);
      tone(note * 1.5, .06, .2, 'triangle', .14);
    },
    whoosh() {
      hiss(0, .55, 400, 3800, .3);
      tone(90, 0, .3, 'sine', .3, master, 45);
    },
    go() { tone(523.25, 0, .1, 'square', .08); tone(783.99, .09, .22, 'square', .08); },
    pop() { hiss(0, .22, 2600, 500, .14); tone(180, 0, .12, 'sine', .1, master, 70); },
    star(index = 0) {
      const note = semitone(659.25, SCALE[index * 2]);
      tone(note, 0, .3, 'triangle', .2);
      tone(note * 2, .03, .24, 'sine', .08);
    },
    count() { tone(1046, 0, .03, 'square', .025); },
    note(freq = 440) { tone(freq, 0, .38, 'triangle', .22); tone(freq * 2, 0, .22, 'sine', .06); },
    jump() { tone(300, 0, .16, 'square', .06, master, 760); },
    bump() { tone(140, 0, .16, 'sawtooth', .1, master, 70); },
    badge() { [783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * .07, .22, 'triangle', .14)); },
    win() {
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => {
        tone(f, i * .11, .32, 'square', .08);
        tone(f / 2, i * .11, .28, 'triangle', .1);
      });
    },
  };

  function scheduleBar(at) {
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    const beat = step % 8;
    const offset = at - audio.currentTime;
    tone(chord.notes[ARPEGGIO[beat]], offset, BEAT * 1.4, 'triangle', .05, musicBus);
    if (BASS_STEPS.includes(beat)) tone(chord.root, offset, BEAT * 1.8, 'sawtooth', .06, musicBus);
    if (beat % 4 === 0) tone(120, offset, .12, 'sine', .22, musicBus, 45);
    if (beat % 4 === 2) hiss(offset, .09, 2400, 1600, .08, musicBus);
    if (beat % 2 === 1) hiss(offset, .03, 7000, 6000, .035, musicBus);
    step++;
  }

  function startMusic() {
    if (musicTimer || !wake()) return;
    step = 0;
    nextNote = audio.currentTime + .08;
    musicBus.gain.cancelScheduledValues(audio.currentTime);
    musicBus.gain.setTargetAtTime(.8, audio.currentTime, .4);
    musicTimer = setInterval(() => {
      while (nextNote < audio.currentTime + .25) {
        scheduleBar(nextNote);
        nextNote += BEAT;
      }
    }, 80);
  }

  function stopMusic() {
    if (!musicTimer) return;
    clearInterval(musicTimer);
    musicTimer = 0;
    musicBus.gain.cancelScheduledValues(audio.currentTime);
    musicBus.gain.setTargetAtTime(0, audio.currentTime, .15);
  }

  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) audio.suspend();
    else audio.resume();
  });

  return {
    play(name, value) {
      if (!muted && wake()) sounds[name](value);
    },
    music(on) { if (on) startMusic(); else stopMusic(); },
    buzz(pattern) {
      if (!muted && navigator.vibrate) navigator.vibrate(pattern);
    },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 1;
      return muted;
    },
  };
})();
