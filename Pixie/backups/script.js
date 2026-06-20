/* ============================================
   Pixie — Vintage Online Photobooth
   Main Application Script
   ============================================ */

'use strict';

/* -----------------------------------------
   State
   ----------------------------------------- */
let webcamStream    = null;
let capturedFrames  = [];
let captureInProgress = false;

const TOTAL_SHOTS       = 4;
const COUNTDOWN_SECS    = 3;
const PAUSE_BETWEEN_MS  = 1400;

/* -----------------------------------------
   DOM shortcut
   ----------------------------------------- */
const $ = (id) => document.getElementById(id);

/* -----------------------------------------
   Boot
   ----------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  console.log('♡ Pixie loaded');

  initSparkles();
  initPetals();
  initHearts();
  initFadeUpAnimations();
  initHeroButton();
  initNavLinks();
  initBoothControls();
  initResultsControls();
});

/* ============================================
   Screen Management
   ============================================ */
function showScreen(name) {
  const screens = {
    hero:    $('hero-screen'),
    booth:   $('booth-screen'),
    results: $('results-screen'),
  };
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle('screen--active', key === name);
  });
}

/* ============================================
   Sparkle Particles (warm pastel tones)
   ============================================ */
function initSparkles() {
  const container = $('sparkles');
  if (!container) return;

  const COUNT  = 22;
  const colors = ['#F4C9D3', '#BFD7E8', '#E0578B', '#d4a5b3', '#c9dbe8', '#e8c4d0'];

  for (let i = 0; i < COUNT; i++) {
    const s = document.createElement('div');
    s.classList.add('sparkle');
    s.style.left = Math.random() * 100 + '%';
    s.style.top  = Math.random() * 100 + '%';
    s.style.setProperty('--dur',   (3 + Math.random() * 5) + 's');
    s.style.setProperty('--delay', (Math.random() * 6) + 's');
    const sz = 3 + Math.random() * 5;
    s.style.width      = sz + 'px';
    s.style.height     = sz + 'px';
    s.style.background = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(s);
  }
}

/* ============================================
   Falling Cherry Blossom Petals
   ============================================ */
function initPetals() {
  const container = $('petals');
  if (!container) return;

  const COUNT  = 18;
  const colors = ['#F4C9D3', '#FADCE4', '#f0b8c8', '#e8aebf', '#f7d5de'];

  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('div');
    p.classList.add('petal');

    const size = 8 + Math.random() * 14;
    p.style.width  = size + 'px';
    p.style.height = (size * 1.3) + 'px';
    p.style.left   = Math.random() * 100 + '%';
    p.style.top    = '-20px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];

    p.style.setProperty('--dur',   (10 + Math.random() * 14) + 's');
    p.style.setProperty('--delay', (Math.random() * 18) + 's');
    p.style.setProperty('--drift', (-80 + Math.random() * 160) + 'px');
    p.style.setProperty('--spin',  (180 + Math.random() * 540) + 'deg');
    p.style.setProperty('--peak',  (0.2 + Math.random() * 0.3).toFixed(2));

    container.appendChild(p);
  }
}

/* ============================================
   Floating Hearts
   ============================================ */
function initHearts() {
  const container = $('hearts');
  if (!container) return;

  const COUNT = 10;
  const chars  = ['♡', '♥'];
  const colors = ['#F4C9D3', '#E0578B', '#d4a5b3', '#e8aebf', '#8C2F45'];

  for (let i = 0; i < COUNT; i++) {
    const h = document.createElement('div');
    h.classList.add('float-heart');
    h.textContent = chars[Math.floor(Math.random() * chars.length)];

    const size = 10 + Math.random() * 18;
    h.style.left     = (5 + Math.random() * 90) + '%';
    h.style.fontSize = size + 'px';
    h.style.color    = colors[Math.floor(Math.random() * colors.length)];

    h.style.setProperty('--dur',   (14 + Math.random() * 16) + 's');
    h.style.setProperty('--delay', (Math.random() * 22) + 's');
    h.style.setProperty('--sway',  (-25 + Math.random() * 50) + 'px');
    h.style.setProperty('--tilt',  (-15 + Math.random() * 30) + 'deg');
    h.style.setProperty('--peak',  (0.15 + Math.random() * 0.2).toFixed(2));

    container.appendChild(h);
  }
}

/* ============================================
   Fade-Up Animations
   ============================================ */
function initFadeUpAnimations() {
  const els = document.querySelectorAll('.fade-up');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    els.forEach((el) => obs.observe(el));
  } else {
    els.forEach((el) => el.classList.add('visible'));
  }
}

/* ============================================
   Hero CTA
   ============================================ */
function initHeroButton() {
  const btn = $('start-booth-btn');
  if (!btn) return;
  btn.addEventListener('click', () => openBooth());
}

/* ============================================
   Nav
   ============================================ */
function initNavLinks() {
  const home = $('nav-home');
  if (home) {
    home.addEventListener('click', (e) => {
      e.preventDefault();
      closeBooth();
      showScreen('hero');
    });
  }
  [$('nav-memory-wall'), $('nav-boomerang')].forEach((btn) => {
    if (btn) btn.addEventListener('click', () => console.log('Coming soon ♡'));
  });
}

/* ============================================
   Booth Controls
   ============================================ */
function initBoothControls() {
  const captureBtn = $('capture-btn');
  const backBtn    = $('booth-back-btn');
  const retryBtn   = $('retry-camera-btn');

  if (captureBtn) captureBtn.addEventListener('click', startCaptureSequence);
  if (backBtn)    backBtn.addEventListener('click', () => { closeBooth(); showScreen('hero'); });
  if (retryBtn)   retryBtn.addEventListener('click', () => requestCamera());
}

/* ============================================
   Results Controls
   ============================================ */
function initResultsControls() {
  const retakeBtn = $('retake-btn');
  const homeBtn   = $('home-btn');

  if (retakeBtn) retakeBtn.addEventListener('click', () => { resetBoothState(); openBooth(); });
  if (homeBtn)   homeBtn.addEventListener('click', () => { closeBooth(); showScreen('hero'); });
}

/* ============================================
   Camera
   ============================================ */
async function openBooth() {
  resetBoothState();
  showScreen('booth');
  await requestCamera();
}

async function requestCamera() {
  const errorEl = $('booth-error');
  const video   = $('webcam-video');

  try {
    errorEl.classList.remove('active');
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = webcamStream;
    await video.play();
    console.log('📷 Camera active');
  } catch (err) {
    console.warn('Camera denied:', err);
    errorEl.classList.add('active');
  }
}

function closeBooth() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((t) => t.stop());
    webcamStream = null;
  }
  const video = $('webcam-video');
  if (video) video.srcObject = null;
}

function resetBoothState() {
  capturedFrames = [];
  captureInProgress = false;
  document.querySelectorAll('.booth__dot').forEach((d) => d.classList.remove('active', 'done'));
  setStatus('Press capture when you\'re ready!');
  const btn = $('capture-btn');
  if (btn) btn.disabled = false;
}

/* ============================================
   Capture Sequence
   ============================================ */
async function startCaptureSequence() {
  if (captureInProgress) return;
  captureInProgress = true;

  const captureBtn = $('capture-btn');
  captureBtn.disabled = true;
  capturedFrames = [];

  for (let i = 0; i < TOTAL_SHOTS; i++) {
    updateProgress(i, 'active');
    setStatus(`Get ready… <span class="accent">Shot ${i + 1} of ${TOTAL_SHOTS}</span>`);

    await runCountdown();

    triggerFlash();
    captureFrame();

    updateProgress(i, 'done');
    setStatus(`Shot ${i + 1} captured! ♡`);

    if (i < TOTAL_SHOTS - 1) await delay(PAUSE_BETWEEN_MS);
  }

  setStatus('Developing your strip…');
  await delay(400);

  await buildPhotoStrip();
  closeBooth();
  showScreen('results');
  captureInProgress = false;
}

/* ============================================
   Countdown
   ============================================ */
async function runCountdown() {
  const overlay  = $('countdown-overlay');
  const numberEl = $('countdown-number');

  overlay.classList.add('active');

  for (let n = COUNTDOWN_SECS; n >= 1; n--) {
    numberEl.textContent = n;
    numberEl.classList.remove('pop');
    void numberEl.offsetWidth;
    numberEl.classList.add('pop');
    await delay(1000);
  }

  numberEl.classList.remove('pop');
  overlay.classList.remove('active');
}

/* ============================================
   Flash
   ============================================ */
function triggerFlash() {
  const flash = $('flash-overlay');
  flash.classList.remove('active');
  void flash.offsetWidth;
  flash.classList.add('active');
  flash.addEventListener('animationend', () => flash.classList.remove('active'), { once: true });
}

/* ============================================
   Frame Capture
   ============================================ */
function captureFrame() {
  const video  = $('webcam-video');
  const canvas = $('capture-canvas');
  const ctx    = canvas.getContext('2d');

  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  capturedFrames.push(canvas.toDataURL('image/jpeg', 0.92));
  console.log(`📸 Frame ${capturedFrames.length} captured`);
}

/* ============================================
   Photo-Strip Compositing
   ============================================ */
function buildPhotoStrip() {
  return new Promise((resolve) => {
    const stripCanvas = $('strip-canvas');
    const ctx = stripCanvas.getContext('2d');

    let loaded = 0;
    const images = [];

    capturedFrames.forEach((dataUrl, i) => {
      const img = new Image();
      img.onload = () => {
        images[i] = img;
        loaded++;
        if (loaded === TOTAL_SHOTS) compositeStrip(ctx, stripCanvas, images, resolve);
      };
      img.src = dataUrl;
    });
  });
}

function compositeStrip(ctx, canvas, images, done) {
  const FRAME_W = 400;
  const BORDER  = 16;
  const GAP     = 10;
  const BRAND_H = 38;
  const OUTER_R = 12;
  const INNER_R = 6;

  const aspect  = images[0].height / images[0].width;
  const FRAME_H = Math.round(FRAME_W * aspect);

  const stripW = FRAME_W + BORDER * 2;
  const stripH = BORDER + (FRAME_H + GAP) * TOTAL_SHOTS - GAP + BORDER + BRAND_H;

  canvas.width  = stripW;
  canvas.height = stripH;

  // Cream-white background
  ctx.fillStyle = '#FFFDF8';
  roundedRect(ctx, 0, 0, stripW, stripH, OUTER_R);
  ctx.fill();

  // Frames
  for (let i = 0; i < TOTAL_SHOTS; i++) {
    const x = BORDER;
    const y = BORDER + i * (FRAME_H + GAP);
    ctx.save();
    roundedRect(ctx, x, y, FRAME_W, FRAME_H, INNER_R);
    ctx.clip();
    ctx.drawImage(images[i], x, y, FRAME_W, FRAME_H);
    ctx.restore();
  }

  // Branding
  ctx.fillStyle = '#C9A0AD';
  ctx.font = '14px "Quicksand", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('♡  Pixie  ♡', stripW / 2, stripH - 12);

  console.log('🖼️ Photo strip composited');
  done();
}

/* ============================================
   Progress Dots
   ============================================ */
function updateProgress(shotIndex, state) {
  const dots = document.querySelectorAll('.booth__dot');
  dots.forEach((d, i) => {
    if (i < shotIndex) {
      d.classList.remove('active');
      d.classList.add('done');
    } else if (i === shotIndex) {
      d.classList.remove('done');
      if (state === 'active') d.classList.add('active');
      if (state === 'done')   { d.classList.remove('active'); d.classList.add('done'); }
    }
  });
}

/* ============================================
   Status Text
   ============================================ */
function setStatus(html) {
  const el = $('booth-status');
  if (el) el.innerHTML = html;
}

/* ============================================
   Helpers
   ============================================ */
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
