/* ============================================
   Pixie — Vintage Online Photobooth
   Main Application Script
   ============================================ */

'use strict';

/* -----------------------------------------
   State
   ----------------------------------------- */
let webcamStream      = null;
let capturedFrames    = [];
let captureInProgress   = false;
let currentFilter     = 'none';
let boothMode         = 'strip'; // 'strip' or 'boomerang'
let activeMemoryId    = null;

let TOTAL_SHOTS           = 4;
let currentFrameStyle     = 'white';
let currentLoadedImages   = [];
const COUNTDOWN_SECS      = 3;
const PAUSE_BETWEEN_MS    = 1400;

// Boomerang capture settings
const BOOMERANG_FRAMES    = 12;
const BOOMERANG_FPS_MS    = 120; // Time between frames

// Aura Reading Arrays
const AURA_NAMES = [
  "Cosmic Indigo", "Feral Lime", "Soft Static Pink", "Golden Sunshine", "Lavender Dream",
  "Matcha Milk", "Starlight Silver", "Cherry Spark", "Velvet Orchid", "Dusk Marigold",
  "Buttercream Mint", "Slushie Coral", "Cloud Nine Blue", "Doll Pink", "Vintage Lilac",
  "Sage Gingham", "Boba Brown", "Ocean Breeze", "Neon Peppermint", "Charnel Rose"
];

const AURA_VERDICTS = [
  "certified delulu but thriving",
  "npc energy: dangerously low",
  "unprocessed rizz detected",
  "manifesting, gatekeeping, girlbossing",
  "no thoughts, just vibes",
  "living rent-free in everyone's minds",
  "certified silly goose",
  "perfectly chaotic energy",
  "slaying in a very cozy way",
  "100% chance of emotional decisions",
  "too retro for this century",
  "head in the clouds, boots on the boardwalk",
  "extremely online but somehow cozy",
  "10/10 would take a polaroid with",
  "main character syndrome level 99",
  "needs iced coffee immediately",
  "overthinking but make it fashion",
  "unapologetically aesthetic",
  "high key a sweetheart",
  "certified vintage cutie"
];

const AURA_GRADIENTS = [
  "linear-gradient(135deg, #a1c4fd, #c2e9fb)",
  "linear-gradient(135deg, #fbc2eb, #a6c1ee)",
  "linear-gradient(135deg, #fdcbf1, #e6dee9)",
  "linear-gradient(135deg, #ff9a9e, #fecfef)",
  "linear-gradient(135deg, #d4fc79, #96e6a1)",
  "linear-gradient(135deg, #84fab0, #8fd3f4)",
  "linear-gradient(135deg, #cfd9df, #e2ebf0)",
  "linear-gradient(135deg, #f6d365, #fda085)",
  "linear-gradient(135deg, #ffecd2, #fcb69f)",
  "linear-gradient(135deg, #a18cd1, #fbc2eb)",
  "linear-gradient(135deg, #e0c3fc, #8ec5fc)",
  "linear-gradient(135deg, #fddb92, #d1f2a5)",
  "linear-gradient(135deg, #f093fb, #f5576c)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #ff0844, #ffb199)",
  "linear-gradient(135deg, #b1f2ff, #ffd4ec)",
  "linear-gradient(135deg, #f3e7e9, #e3eeff)",
  "linear-gradient(135deg, #fad0c4, #ffd1ff)",
  "linear-gradient(135deg, #bfd7e8, #f4c9d3)",
  "linear-gradient(135deg, #e8aebf, #c9dbe8)"
];

// Decoration State variables
let activeStickers     = [];
let stickerIdCounter   = 0;
let activeStickerNode  = null;

let isDrawing          = false;
let doodleMode         = false;
let doodleHistory      = [];
let penColor           = '#8C2F45';
let lastX              = 0;
let lastY              = 0;

/* -----------------------------------------
   DOM shortcut
   ----------------------------------------- */
const $ = (id) => document.getElementById(id);

/* -----------------------------------------
   Boot
   ----------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  console.log('♡ Pixie loaded successfully');

  // Initialize scrapbook decorative background effects
  initSparkles();
  initPetals();
  initHearts();

  // Bind controls
  initActionButtons();
  initBoothControls();
  initResultsControls();
  initFilters();
  initDecorateToolbar();
  initDoodles();

  // Initialize progress dots count to default (4)
  updateProgressDotsCount(TOTAL_SHOTS);

  // Initialize frame style swatches
  const swatches = document.querySelectorAll('.frame-swatch');
  swatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      const styleName = swatch.getAttribute('data-style');
      updateFrameStyle(styleName);
    });
  });

  // Check if page was opened via a shared strip QR code
  checkForSharedStrip();
});

/* ============================================
   Screen Management
   ============================================ */
function showScreen(name) {
  const screens = {
    hero:    $('hero-screen'),
    booth:   $('booth-screen'),
    results: $('results-screen'),
    wall:    $('wall-screen'),
    about:   $('about-screen'),
  };
  Object.entries(screens).forEach(([key, el]) => {
    if (el) {
      el.classList.toggle('screen--active', key === name);
    }
  });
}

/* ============================================
   Action Buttons Wiring
   ============================================ */
function initActionButtons() {
  const startBtn = $('start-booth-btn');
  const navStartBtn = $('nav-start-btn');
  const navBoomerang = $('nav-boomerang');

  // Start Photo Strip Mode
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      setBoothMode('strip');
      openBooth();
    });
  }
  if (navStartBtn) {
    navStartBtn.addEventListener('click', () => {
      setBoothMode('strip');
      openBooth();
    });
  }

  // Start Boomerang Mode via Nav
  if (navBoomerang) {
    navBoomerang.addEventListener('click', (e) => {
      e.preventDefault();
      setBoothMode('boomerang');
      openBooth();
    });
  }

  // Home navigation
  const navHome = $('nav-home');
  if (navHome) {
    navHome.addEventListener('click', (e) => {
      e.preventDefault();
      closeBooth();
      showScreen('hero');
    });
  }

  const navWall = $('nav-memory-wall');
  const navAbout = $('nav-about');
  if (navWall) {
    navWall.addEventListener('click', (e) => {
      e.preventDefault();
      closeBooth();
      showMemoryWall();
    });
  }
  if (navAbout) {
    navAbout.addEventListener('click', (e) => {
      e.preventDefault();
      closeBooth();
      showScreen('about');
    });
  }

  // Memory Wall page buttons
  const wallBackBtn = $('wall-back-btn');
  if (wallBackBtn) {
    wallBackBtn.addEventListener('click', () => showScreen('hero'));
  }
  const wallStartBtn = $('wall-start-btn');
  if (wallStartBtn) {
    wallStartBtn.addEventListener('click', () => {
      setBoothMode('strip');
      openBooth();
    });
  }

  // About page buttons
  const aboutBackBtn = $('about-back-btn');
  if (aboutBackBtn) {
    aboutBackBtn.addEventListener('click', () => showScreen('hero'));
  }
  const aboutStartBtn = $('about-start-btn');
  if (aboutStartBtn) {
    aboutStartBtn.addEventListener('click', () => {
      setBoothMode('strip');
      openBooth();
    });
  }
}

function initBoothControls() {
  const captureBtn = $('capture-btn');
  const backBtn    = $('booth-back-btn');
  const retryBtn   = $('retry-camera-btn');
  
  const stripTab   = $('mode-strip-tab');
  const boomerangTab = $('mode-boomerang-tab');

  if (captureBtn) captureBtn.addEventListener('click', startCaptureSequence);
  if (backBtn)    backBtn.addEventListener('click', () => { closeBooth(); showScreen('hero'); });
  if (retryBtn)   retryBtn.addEventListener('click', () => requestCamera());

  // Booth Internal Tabs
  if (stripTab) {
    stripTab.addEventListener('click', () => {
      if (captureInProgress) return;
      setBoothMode('strip');
    });
  }
  if (boomerangTab) {
    boomerangTab.addEventListener('click', () => {
      if (captureInProgress) return;
      setBoothMode('boomerang');
    });
  }

  // Strip Length Options Selection
  const lengthBtns = document.querySelectorAll('.booth__length-toggle .length-tab');
  lengthBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (captureInProgress) return;
      lengthBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      TOTAL_SHOTS = parseInt(btn.getAttribute('data-length'), 10);
      updateProgressDotsCount(TOTAL_SHOTS);
    });
  });
}

function initResultsControls() {
  const retakeBtn   = $('retake-btn');
  const homeBtn     = $('home-btn');
  const dlStripBtn  = $('download-strip-btn');
  const shareQrBtn  = $('share-qr-btn');
  const qrCloseBtn  = $('qr-modal-close');
  const qrOverlay   = $('qr-modal-overlay');

  if (retakeBtn) retakeBtn.addEventListener('click', () => { resetBoothState(); openBooth(); });
  if (homeBtn)   homeBtn.addEventListener('click', () => { closeBooth(); showScreen('hero'); });
  
  if (dlStripBtn) {
    dlStripBtn.addEventListener('click', downloadPhotoStrip);
  }

  if (shareQrBtn) {
    shareQrBtn.addEventListener('click', openShareQRModal);
  }
  if (qrCloseBtn) {
    qrCloseBtn.addEventListener('click', closeShareQRModal);
  }
  if (qrOverlay) {
    qrOverlay.addEventListener('click', closeShareQRModal);
  }
}

/* ============================================
   Mode Swapper
   ============================================ */
function setBoothMode(mode) {
  boothMode = mode;
  const stripTab = $('mode-strip-tab');
  const boomerangTab = $('mode-boomerang-tab');
  const progressDots = $('booth-progress');
  const lengthToggle = $('booth-length-toggle');

  if (mode === 'strip') {
    if (stripTab) stripTab.classList.add('active');
    if (boomerangTab) boomerangTab.classList.remove('active');
    if (progressDots) progressDots.style.visibility = 'visible';
    if (lengthToggle) lengthToggle.style.display = 'flex';
    setStatus("Press capture when you're ready!");
  } else {
    if (stripTab) stripTab.classList.remove('active');
    if (boomerangTab) boomerangTab.classList.add('active');
    if (progressDots) progressDots.style.visibility = 'hidden';
    if (lengthToggle) lengthToggle.style.display = 'none';
    setStatus("Burst capture: 12 rapid shots! 🔄");
  }
}

/* ============================================
   Filters Row Bindings
   ============================================ */
function initFilters() {
  const container = $('filters-container');
  if (!container) return;

  const filterOpts = container.querySelectorAll('.filter-opt');
  filterOpts.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filterName = btn.getAttribute('data-filter');
      selectFilter(filterName);
    });
  });

  const surpriseBtn = $('filter-surprise-btn');
  if (surpriseBtn) {
    surpriseBtn.addEventListener('click', () => {
      const filters = ['none', 'y2k', 'vhs', 'bw', 'warm', 'sepia'];
      let randomFilter = currentFilter;
      while (randomFilter === currentFilter) {
        randomFilter = filters[Math.floor(Math.random() * filters.length)];
      }

      // Play spin animation
      surpriseBtn.classList.remove('spinning');
      void surpriseBtn.offsetWidth; // Force reflow
      surpriseBtn.classList.add('spinning');
      surpriseBtn.addEventListener('animationend', () => {
        surpriseBtn.classList.remove('spinning');
      }, { once: true });

      selectFilter(randomFilter);
    });
  }
}

function selectFilter(filterName) {
  currentFilter = filterName;

  const container = $('filters-container');
  if (container) {
    container.querySelectorAll('.filter-opt').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === filterName);
    });
  }

  const video = $('webcam-video');
  if (video) {
    video.className = '';
    if (filterName !== 'none') {
      video.classList.add(`filter-${filterName}`);
    }
  }

  const scanlines = $('scanlines-overlay');
  const vignette = $('vignette-overlay');
  if (scanlines) scanlines.classList.toggle('active', filterName === 'vhs');
  if (vignette)  vignette.classList.toggle('active', filterName === 'warm');
}

/* ============================================
   Camera & Streaming
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
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
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
  selectFilter('none');
  document.querySelectorAll('.booth__dot').forEach((d) => d.classList.remove('active', 'done'));
  
  // Reset frame style swatches and variable
  currentFrameStyle = 'white';
  const swatches = document.querySelectorAll('.frame-swatch');
  swatches.forEach(s => s.classList.remove('active'));
  const defaultSwatch = document.querySelector('.frame-swatch[data-style="white"]');
  if (defaultSwatch) defaultSwatch.classList.add('active');

  // Clear doodle canvas overlay
  const doodleCanvas = $('doodle-canvas');
  if (doodleCanvas) {
    const dCtx = doodleCanvas.getContext('2d');
    dCtx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);
  }

  // Clear stickers from Results screen
  const stickersOverlay = $('stickers-overlay');
  if (stickersOverlay) stickersOverlay.innerHTML = '';
  activeStickers = [];
  activeStickerNode = null;
  doodleHistory = [];
  selectDoodleMode(false);

  setBoothMode(boothMode);
  updateProgressDotsCount(TOTAL_SHOTS);

  const btn = $('capture-btn');
  if (btn) btn.disabled = false;
}

/* ============================================
   Capture Flow Control
   ============================================ */
async function startCaptureSequence() {
  // Defensive validation: check if stream is ready
  const video = $('webcam-video');
  if (!webcamStream || !video || video.readyState < 2) {
    alert("Please allow camera access and wait for the video stream to load! ♡");
    captureInProgress = false;
    const captureBtn = $('capture-btn');
    if (captureBtn) captureBtn.disabled = false;
    return;
  }

  if (captureInProgress) return;
  captureInProgress = true;

  const captureBtn = $('capture-btn');
  captureBtn.disabled = true;
  capturedFrames = [];

  // 1. Ready Countdown
  await runCountdown();

  if (boothMode === 'strip') {
    // ---- PHOTO STRIP FLOW ----
    for (let i = 0; i < TOTAL_SHOTS; i++) {
      updateProgress(i, 'active');
      setStatus(`Get ready… <span class="accent">Shot ${i + 1} of ${TOTAL_SHOTS}</span>`);

      if (i > 0) await runCountdown();

      triggerFlash();
      captureFrame();

      updateProgress(i, 'done');
      setStatus(`Shot ${i + 1} captured! ♡`);

      if (i < TOTAL_SHOTS - 1) await delay(PAUSE_BETWEEN_MS);
    }

    setStatus('Developing your strip…');
    await delay(400); // reduced delay for responsiveness

    await buildPhotoStrip();
    const baseStripUrl = getBakedStripDataUrl();
    saveMemoryToLocalStorage('strip', baseStripUrl);
    closeBooth();
    generateAuraReading();
    
    // Toggle Results Screen Display Elements
    $('strip-canvas').style.display = 'block';
    $('gif-preview').style.display = 'none';
    $('download-strip-btn').style.display = 'inline-flex';
    $('download-gif-btn').style.display = 'none';
    $('decorate-toolbar').style.display = 'block';

    showScreen('results');
    captureInProgress = false;

  } else {
    // ---- BOOMERANG BURST FLOW ----
    setStatus('Recording burst… 🔄');
    const recIndicator = $('rec-indicator');
    if (recIndicator) recIndicator.classList.add('active');
    triggerFlash(); // Initial flash

    for (let i = 0; i < BOOMERANG_FRAMES; i++) {
      captureFrame();
      await delay(BOOMERANG_FPS_MS);
    }

    if (recIndicator) recIndicator.classList.remove('active');
    setStatus('Stitching looping GIF… 🎞️');
    
    await buildBoomerangGif();
  }
}

/* Countdown overlay */
async function runCountdown() {
  const overlay  = $('countdown-overlay');
  const numberEl = $('countdown-number');

  overlay.classList.add('active');

  for (let n = COUNTDOWN_SECS; n >= 1; n--) {
    numberEl.textContent = n;
    numberEl.classList.remove('pop');
    void numberEl.offsetWidth; // Force reflow
    numberEl.classList.add('pop');
    await delay(1000);
  }

  numberEl.classList.remove('pop');
  overlay.classList.remove('active');
}

/* Flash Screen Overlay */
function triggerFlash() {
  const flash = $('flash-overlay');
  flash.classList.remove('active');
  void flash.offsetWidth; // Force reflow
  flash.classList.add('active');
  flash.addEventListener('animationend', () => flash.classList.remove('active'), { once: true });
}

/* Grabbing Camera Frame */
function captureFrame() {
  const video  = $('webcam-video');
  const canvas = $('capture-canvas');
  const ctx    = canvas.getContext('2d');

  // Hardcode capture dimensions to 640x480 for fast processing
  canvas.width  = 640;
  canvas.height = 480;

  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);

  // Apply filters using canvas filter effects
  let filterStr = 'none';
  if (currentFilter === 'y2k') filterStr = 'contrast(1.45) saturate(1.8) hue-rotate(15deg) brightness(1.05)';
  else if (currentFilter === 'vhs') filterStr = 'contrast(1.1) saturate(0.85) brightness(1.02)';
  else if (currentFilter === 'bw') filterStr = 'grayscale(100%) contrast(130%) brightness(95%)';
  else if (currentFilter === 'warm') filterStr = 'sepia(25%) saturate(135%) contrast(110%) brightness(105%)';
  else if (currentFilter === 'sepia') filterStr = 'sepia(85%) contrast(90%) saturate(70%) brightness(95%)';

  ctx.filter = filterStr;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Apply manual scanline & film grain overlays to the canvas
  if (currentFilter === 'vhs') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.fillRect(0, y, canvas.width, 1.5);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let k = 0; k < 1800; k++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 1.5);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let k = 0; k < 1800; k++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 1.5);
    }
  } else if (currentFilter === 'bw') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    for (let k = 0; k < 4000; k++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let k = 0; k < 4000; k++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }
  } else if (currentFilter === 'warm') {
    const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 3, canvas.width / 2, canvas.height / 2, canvas.width / 2);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(140, 47, 69, 0.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (currentFilter === 'sepia') {
    ctx.save();
    ctx.fillStyle = 'rgba(243, 228, 210, 0.18)';
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  capturedFrames.push(canvas.toDataURL('image/jpeg', 0.85)); // slightly reduced compression for speed
  console.log(`📸 Frame ${capturedFrames.length} captured with filter: ${currentFilter}`);
}

/* ============================================
   Photo-Strip Canvas Compositing
   ============================================ */
function clearDoodleCanvasAndHistory() {
  const doodleCanvas = $('doodle-canvas');
  if (doodleCanvas) {
    const dCtx = doodleCanvas.getContext('2d');
    dCtx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);
    doodleHistory = [dCtx.getImageData(0, 0, doodleCanvas.width, doodleCanvas.height)];
  }
}

function buildPhotoStrip() {
  return new Promise((resolve) => {
    const stripCanvas = $('strip-canvas');
    const ctx = stripCanvas.getContext('2d');
    let loaded = 0;
    const images = [];

    // Clear doodles and reset history for the new capture session
    clearDoodleCanvasAndHistory();

    capturedFrames.forEach((dataUrl, i) => {
      const img = new Image();
      img.onload = () => {
        images[i] = img;
        loaded++;
        if (loaded === TOTAL_SHOTS) {
          currentLoadedImages = images; // Cache images for live styling re-renders
          compositeStrip(ctx, stripCanvas, images, resolve);
        }
      };
      img.src = dataUrl;
    });
  });
}

function compositeStrip(ctx, canvas, images, done) {
  const FRAME_W = 400;
  const BORDER  = 16;
  const GAP     = 12;
  const BRAND_H = 44;
  const OUTER_R = 12;
  const INNER_R = 6;

  const aspect  = images[0].height / images[0].width;
  const FRAME_H = Math.round(FRAME_W * aspect);

  const stripW = FRAME_W + BORDER * 2;
  const stripH = BORDER + (FRAME_H + GAP) * TOTAL_SHOTS - GAP + BORDER + BRAND_H;

  canvas.width  = stripW;
  canvas.height = stripH;

  // Align transparent doodle canvas size with main canvas if dimensions mismatch
  const doodleCanvas = $('doodle-canvas');
  if (doodleCanvas && (doodleCanvas.width !== stripW || doodleCanvas.height !== stripH)) {
    doodleCanvas.width = stripW;
    doodleCanvas.height = stripH;
    const dCtx = doodleCanvas.getContext('2d');
    dCtx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);
    doodleHistory = [dCtx.getImageData(0, 0, stripW, stripH)];
  }

  // Draw background according to currentFrameStyle
  if (currentFrameStyle === 'white') {
    ctx.fillStyle = '#FFFDF8';
    roundedRect(ctx, 0, 0, stripW, stripH, OUTER_R);
    ctx.fill();
  } else if (currentFrameStyle === 'cream') {
    ctx.fillStyle = '#FAF1E4';
    roundedRect(ctx, 0, 0, stripW, stripH, OUTER_R);
    ctx.fill();
  } else if (currentFrameStyle === 'pink') {
    ctx.fillStyle = '#F4C9D3';
    roundedRect(ctx, 0, 0, stripW, stripH, OUTER_R);
    ctx.fill();
  } else if (currentFrameStyle === 'blue') {
    ctx.fillStyle = '#BFD7E8';
    roundedRect(ctx, 0, 0, stripW, stripH, OUTER_R);
    ctx.fill();
  } else if (currentFrameStyle === 'rose') {
    ctx.fillStyle = '#8C2F45';
    roundedRect(ctx, 0, 0, stripW, stripH, OUTER_R);
    ctx.fill();
  } else if (currentFrameStyle === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, 0, stripH);
    grad.addColorStop(0, '#FADCE4');
    grad.addColorStop(1, '#BFD7E8');
    ctx.fillStyle = grad;
    roundedRect(ctx, 0, 0, stripW, stripH, OUTER_R);
    ctx.fill();
  } else if (currentFrameStyle === 'pattern') {
    // Solid background first
    ctx.fillStyle = '#FAF1E4';
    roundedRect(ctx, 0, 0, stripW, stripH, OUTER_R);
    ctx.fill();
    
    // Draw polka dot pattern inside
    ctx.save();
    roundedRect(ctx, 0, 0, stripW, stripH, OUTER_R);
    ctx.clip();
    ctx.fillStyle = '#F4C9D3';
    const dotRadius = 2.5;
    const dotSpacing = 16;
    for (let px = 0; px < stripW + dotSpacing; px += dotSpacing) {
      for (let py = 0; py < stripH + dotSpacing; py += dotSpacing) {
        ctx.beginPath();
        const offset = (Math.round(py / dotSpacing) % 2 === 0) ? 0 : dotSpacing / 2;
        ctx.arc(px + offset, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Draw photos inside inner frames
  for (let i = 0; i < images.length; i++) {
    const x = BORDER;
    const y = BORDER + i * (FRAME_H + GAP);
    ctx.save();
    roundedRect(ctx, x, y, FRAME_W, FRAME_H, INNER_R);
    ctx.clip();
    ctx.drawImage(images[i], x, y, FRAME_W, FRAME_H);
    ctx.restore();
  }

  // Draw vintage script branding signature
  ctx.fillStyle = (currentFrameStyle === 'rose') ? '#FAF1E4' : '#8C2F45';
  ctx.font = '22px "Parisienne", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('Pixie', stripW / 2, stripH - 22);

  // Tiny hearts decoration on sides
  ctx.font = '12px "Quicksand", sans-serif';
  ctx.fillStyle = (currentFrameStyle === 'rose') ? '#F4C9D3' : '#E0578B';
  ctx.fillText('♡', stripW / 2 - 38, stripH - 24);
  ctx.fillText('♡', stripW / 2 + 38, stripH - 24);

  console.log('🖼️ Photo strip composited successfully');
  done();
}

/* ============================================
   Boomerang Mode GIF Compiler (gifshot)
   ============================================ */
async function buildBoomerangGif() {
  // Safety check: make sure gifshot loaded from CDN
  if (typeof gifshot === 'undefined') {
    alert('GIF library failed to load. Please refresh and try again!');
    captureInProgress = false;
    const captureBtn = $('capture-btn');
    if (captureBtn) captureBtn.disabled = false;
    return;
  }

  // Construct the forward-and-reverse boomerang frames array
  const forwardFrames = [...capturedFrames];
  const reverseFrames = [...capturedFrames].reverse().slice(1, -1); // omit end dupes
  const finalSequence = forwardFrames.concat(reverseFrames);

  // Compile animated GIF using gifshot
  gifshot.createGIF({
    images: finalSequence,
    gifWidth: 400,
    gifHeight: 300,
    interval: 0.1, // seconds
    numFrames: finalSequence.length,
  }, function(obj) {
    if (!obj.error) {
      const gifUrl = obj.image; // returns base64 image data URL
      saveMemoryToLocalStorage('boomerang', gifUrl);
      
      const previewImg = $('gif-preview');
      if (previewImg) previewImg.src = gifUrl;

      const downloadGifBtn = $('download-gif-btn');
      if (downloadGifBtn) {
        downloadGifBtn.style.display = 'inline-flex';
        downloadGifBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = gifUrl;
          a.download = `pixie_boomerang_${Date.now()}.gif`;
          a.click();
        };
      }

      closeBooth();
      generateAuraReading();

      // Toggle results screen views
      $('strip-canvas').style.display = 'none';
      $('gif-preview').style.display = 'block';
      $('download-strip-btn').style.display = 'none';
      $('decorate-toolbar').style.display = 'none'; // GIF is non-editable

      showScreen('results');
      captureInProgress = false;
    } else {
      console.error("GIF creation failed:", obj.errorMsg);
      alert("Oops! GIF compilation failed: " + obj.errorMsg);
      captureInProgress = false;
      const captureBtn = $('capture-btn');
      if (captureBtn) captureBtn.disabled = false;
    }
  });
}

/* ============================================
   Canvas Photo Strip Decoration Toolbar
   ============================================ */
function initDecorateToolbar() {
  const tabStickers = $('tab-stickers');
  const tabDoodles  = $('tab-doodles');
  const panelStickers = $('panel-stickers');
  const panelDoodles  = $('panel-doodles');

  if (tabStickers && tabDoodles) {
    tabStickers.addEventListener('click', () => {
      tabStickers.classList.add('active');
      tabDoodles.classList.remove('active');
      panelStickers.classList.add('active');
      panelDoodles.classList.remove('active');
      selectDoodleMode(false);
    });

    tabDoodles.addEventListener('click', () => {
      tabDoodles.classList.add('active');
      tabStickers.classList.remove('active');
      panelDoodles.classList.add('active');
      panelStickers.classList.remove('active');
      selectDoodleMode(true);
    });
  }

  // Spawn stickers from tray
  const tray = $('panel-stickers');
  if (tray) {
    tray.querySelectorAll('.sticker-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        spawnSticker(emoji);
      });
    });
  }

  // Spawn doodle stamps from tray
  const stampTray = $('panel-doodles');
  if (stampTray) {
    stampTray.querySelectorAll('.stamp-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const stampType = btn.getAttribute('data-stamp');
        spawnStamp(stampType);
      });
    });
  }

  // Deselect sticker on clicking blank spaces
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.active-sticker') && !e.target.closest('.sticker-btn')) {
      deselectActiveStickers();
    }
  });
  document.addEventListener('touchstart', (e) => {
    if (!e.target.closest('.active-sticker') && !e.target.closest('.sticker-btn')) {
      deselectActiveStickers();
    }
  });
}

/* ============================================
   Interactive Stickers Layer
   ============================================ */
function spawnSticker(emoji) {
  const overlay = $('stickers-overlay');
  const wrap = $('canvas-wrap');
  if (!overlay || !wrap) return;

  const stickerId = stickerIdCounter++;
  const sticker = document.createElement('div');
  sticker.classList.add('active-sticker');
  sticker.dataset.id = stickerId;

  // Position at overlay center
  const rect = overlay.getBoundingClientRect();
  const left = rect.width / 2 - 25;
  const top = rect.height / 2 - 25;

  sticker.style.left = `${left}px`;
  sticker.style.top  = `${top}px`;

  sticker.innerHTML = `
    <div class="sticker-handle sticker-handle--delete">×</div>
    <div class="active-sticker__emoji">${emoji}</div>
    <div class="sticker-handle sticker-handle--rotate">✥</div>
  `;

  overlay.appendChild(sticker);

  const state = {
    id: stickerId,
    emoji: emoji,
    element: sticker,
    x: left,
    y: top,
    scale: 1,
    rotation: 0
  };

  activeStickers.push(state);
  selectSticker(state);
  bindStickerEvents(state);
  updateActiveMemoryInLocalStorage();
}

function selectSticker(state) {
  deselectActiveStickers();
  if (state) {
    state.element.classList.add('selected');
    activeStickerNode = state;
  }
}

function deselectActiveStickers() {
  document.querySelectorAll('.active-sticker').forEach(el => el.classList.remove('selected'));
  activeStickerNode = null;
}

function bindStickerEvents(state) {
  const el = state.element;
  const deleteBtn = el.querySelector('.sticker-handle--delete');
  const rotateBtn = el.querySelector('.sticker-handle--rotate');

  // Delete sticker button
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    el.remove();
    activeStickers = activeStickers.filter(s => s.id !== state.id);
    if (activeStickerNode === state) activeStickerNode = null;
    updateActiveMemoryInLocalStorage();
  });

  // Tap/Click to select + Drag
  el.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    selectSticker(state);
    startStickerDrag(e, state);
  });
  el.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    selectSticker(state);
    startStickerDrag(e.touches[0], state);
  });

  // Scale and Rotate handle
  rotateBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation(); e.preventDefault();
    startStickerTransform(e, state);
  });
  rotateBtn.addEventListener('touchstart', (e) => {
    e.stopPropagation(); e.preventDefault();
    startStickerTransform(e.touches[0], state);
  });
}

function startStickerDrag(startEvent, state) {
  const el = state.element;
  const startX = startEvent.clientX - state.x;
  const startY = startEvent.clientY - state.y;

  function onMove(e) {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !clientY) return;

    state.x = clientX - startX;
    state.y = clientY - startY;

    el.style.left = `${state.x}px`;
    el.style.top  = `${state.y}px`;
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    updateActiveMemoryInLocalStorage();
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);
}

function startStickerTransform(startEvent, state) {
  const el = state.element;
  const rect = el.getBoundingClientRect();
  
  // Center relative to viewport
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const startAngle = state.rotation;
  const startDist = Math.hypot(startEvent.clientX - centerX, startEvent.clientY - centerY);
  const startScale = state.scale;
  const startPointerAngle = Math.atan2(startEvent.clientY - centerY, startEvent.clientX - centerX);

  function onMove(e) {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !clientY) return;

    const currentPointerAngle = Math.atan2(clientY - centerY, clientX - centerX);
    const currentDist = Math.hypot(clientX - centerX, clientY - centerY);

    const angleDelta = currentPointerAngle - startPointerAngle;
    state.rotation = startAngle + angleDelta;

    const scaleDelta = currentDist / startDist;
    state.scale = Math.max(0.4, Math.min(3.0, startScale * scaleDelta));

    el.style.transform = `rotate(${state.rotation}rad) scale(${state.scale})`;
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    updateActiveMemoryInLocalStorage();
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);
}

/* ============================================
   Freehand Doodling Pen Tool
   ============================================ */
function initDoodles() {
  const doodleCanvas = $('doodle-canvas');
  if (!doodleCanvas) return;

  const ctx = doodleCanvas.getContext('2d');

  function getCanvasCoords(e) {
    const rect = doodleCanvas.getBoundingClientRect();
    const scaleX = doodleCanvas.width / rect.width;
    const scaleY = doodleCanvas.height / rect.height;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  let strokeMinX = Infinity;
  let strokeMaxX = -Infinity;
  let strokeMinY = Infinity;
  let strokeMaxY = -Infinity;
  let hasDrawnStroke = false;

  function startDraw(e) {
    if (!doodleMode) return;
    isDrawing = true;
    const coords = getCanvasCoords(e);
    lastX = coords.x;
    lastY = coords.y;

    strokeMinX = coords.x;
    strokeMaxX = coords.x;
    strokeMinY = coords.y;
    strokeMaxY = coords.y;
    hasDrawnStroke = false;
  }

  function draw(e) {
    if (!isDrawing || !doodleMode) return;
    const coords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastX = coords.x;
    lastY = coords.y;

    strokeMinX = Math.min(strokeMinX, coords.x);
    strokeMaxX = Math.max(strokeMaxX, coords.x);
    strokeMinY = Math.min(strokeMinY, coords.y);
    strokeMaxY = Math.max(strokeMaxY, coords.y);
    hasDrawnStroke = true;
  }

  function stopDraw() {
    if (isDrawing) {
      isDrawing = false;
      if (hasDrawnStroke) {
        const padding = 8;
        const x = Math.max(0, Math.floor(strokeMinX - padding));
        const y = Math.max(0, Math.floor(strokeMinY - padding));
        const w = Math.min(doodleCanvas.width - x, Math.ceil(strokeMaxX - strokeMinX + 2 * padding));
        const h = Math.min(doodleCanvas.height - y, Math.ceil(strokeMaxY - strokeMinY + 2 * padding));

        if (w > 1 && h > 1) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = w;
          tempCanvas.height = h;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.drawImage(doodleCanvas, x, y, w, h, 0, 0, w, h);

          ctx.clearRect(x, y, w, h);

          const imgDataUrl = tempCanvas.toDataURL('image/png');

          const rect = doodleCanvas.getBoundingClientRect();
          const toCssX = rect.width / doodleCanvas.width;
          const toCssY = rect.height / doodleCanvas.height;

          const cssX = x * toCssX;
          const cssY = y * toCssY;
          const cssW = w * toCssX;
          const cssH = h * toCssY;

          spawnDoodleSticker(imgDataUrl, cssX, cssY, cssW, cssH, w, h);
        }
      }
    }
  }

  doodleCanvas.addEventListener('mousedown', startDraw);
  doodleCanvas.addEventListener('mousemove', draw);
  doodleCanvas.addEventListener('mouseup', stopDraw);
  doodleCanvas.addEventListener('mouseout', stopDraw);

  doodleCanvas.addEventListener('touchstart', (e) => {
    if (doodleMode) {
      e.preventDefault();
      startDraw(e);
    }
  }, { passive: false });
  
  doodleCanvas.addEventListener('touchmove', (e) => {
    if (doodleMode) {
      e.preventDefault();
      draw(e);
    }
  }, { passive: false });

  doodleCanvas.addEventListener('touchend', stopDraw);

  // Undo button trigger
  const undoBtn = $('doodle-undo-btn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      const doodles = activeStickers.filter(s => s.isDoodle);
      if (doodles.length > 0) {
        const lastDoodle = doodles[doodles.length - 1];
        lastDoodle.element.remove();
        activeStickers = activeStickers.filter(s => s.id !== lastDoodle.id);
        if (activeStickerNode === lastDoodle) activeStickerNode = null;
        updateActiveMemoryInLocalStorage();
      } else {
        alert("No doodles left to undo! ♡");
      }
    });
  }

  // Clear button trigger
  const clearBtn = $('doodle-clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm("Clear all doodles? 🧹")) {
        const doodles = activeStickers.filter(s => s.isDoodle);
        doodles.forEach(d => d.element.remove());
        activeStickers = activeStickers.filter(s => !s.isDoodle);
        deselectActiveStickers();
        updateActiveMemoryInLocalStorage();
      }
    });
  }

  // Color Swatch pickers
  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      penColor = swatch.getAttribute('data-color');
    });
  });

  // Pen tool toggle button
  const drawBtn = $('doodle-draw-btn');
  if (drawBtn) {
    drawBtn.addEventListener('click', () => {
      selectDoodleMode(!doodleMode);
    });
  }
}

function selectDoodleMode(active) {
  doodleMode = active;
  const wrap = $('canvas-wrap');
  const drawBtn = $('doodle-draw-btn');
  const doodleCanvas = $('doodle-canvas');
  if (!wrap || !drawBtn || !doodleCanvas) return;

  if (active) {
    wrap.classList.add('drawing-mode');
    drawBtn.classList.add('active');
    drawBtn.textContent = '✏️ Drawing On';
    doodleCanvas.style.pointerEvents = 'auto';
    deselectActiveStickers();
  } else {
    wrap.classList.remove('drawing-mode');
    drawBtn.classList.remove('active');
    drawBtn.textContent = '✏️ Draw Pen';
    doodleCanvas.style.pointerEvents = 'none';
  }
}

/* ============================================
   Bake Stickers & Doodles to Photo Strip Canvas
   ============================================ */
function getBakedStripDataUrl() {
  const canvas = $('strip-canvas');
  if (!canvas) return '';
  const ctx = canvas.getContext('2d');

  try {
    // 1. Save current doodle/strip image state
    const originalState = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 2. Draw transparent doodle canvas on top of base strip canvas
    const doodleCanvas = $('doodle-canvas');
    if (doodleCanvas) {
      ctx.drawImage(doodleCanvas, 0, 0);
    }

    // 3. Draw all absolute stickers (emojis & SVG doodle stamps) onto the canvas pixels
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    activeStickers.forEach((s) => {
      const el = s.element;
      const elRect = el.getBoundingClientRect();
      const parentRect = el.parentNode.getBoundingClientRect();

      // Center coordinates relative to the canvas bounding rect
      const clientX = elRect.left - parentRect.left + elRect.width / 2;
      const clientY = elRect.top - parentRect.top + elRect.height / 2;

      const canvasX = clientX * scaleX;
      const canvasY = clientY * scaleY;

      ctx.save();
      ctx.translate(canvasX, canvasY);
      ctx.rotate(s.rotation);
      
      if (s.isStamp) {
        // Draw SVG Stamp Image
        const w = Math.round(80 * s.scale * scaleX);
        const h = Math.round(80 * s.scale * scaleY);
        try {
          ctx.drawImage(s.stampImg, -w / 2, -h / 2, w, h);
        } catch (stampErr) {
          console.warn("Failed to draw stamp image on canvas:", stampErr);
        }
      } else if (s.isDoodle) {
        // Draw Draggable Doodle Stroke Image
        const w = Math.round(s.nativeW * s.scale * scaleX);
        const h = Math.round(s.nativeH * s.scale * scaleY);
        try {
          ctx.drawImage(s.doodleImg, -w / 2, -h / 2, w, h);
        } catch (doodleErr) {
          console.warn("Failed to draw doodle image on canvas:", doodleErr);
        }
      } else {
        // Scale emoji font size based on sticker scale
        const fontSize = Math.round(42 * s.scale * scaleX);
        ctx.font = `${fontSize}px "Quicksand", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.emoji, 0, 0);
      }
      ctx.restore();
    });

    // 4. Export baked canvas as PNG data URL
    const dataUrl = canvas.toDataURL('image/png');

    // 5. Restore original canvas state so stickers remain as active DOM layers
    ctx.putImageData(originalState, 0, 0);
    
    return dataUrl;
  } catch (err) {
    console.error("Failed to bake strip canvas:", err);
    // Fallback: return the unbaked strip canvas Data URL to prevent a complete crash
    try {
      return canvas.toDataURL('image/png');
    } catch (fallbackErr) {
      console.error("Canvas is completely tainted:", fallbackErr);
      return '';
    }
  }
}

function downloadPhotoStrip() {
  const dataUrl = getBakedStripDataUrl();
  if (!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `pixie_decorated_${Date.now()}.png`;
  a.click();
}

/* ============================================
   QR Share — Compress image to URL-safe base64url
   (targeting ~400 chars so QR stays Version 12 or
   below = easily scannable at 200px display size)
   ============================================ */
function getTinyQRCodeDataUrl(inputSource, callback) {
  const img = new Image();
  img.onload = () => {
    try {
      // Start very small — 30px wide strip thumbnail
      let targetW = 30;
      let targetH = Math.round(targetW * (img.height / img.width));

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');

      let quality = 0.12;
      let dataUrl = '';

      // Loop: get under 500 chars so the final share URL stays scannable
      for (let attempt = 0; attempt < 8; attempt++) {
        tempCanvas.width  = targetW;
        tempCanvas.height = targetH;
        tempCtx.drawImage(img, 0, 0, targetW, targetH);
        try {
          dataUrl = tempCanvas.toDataURL('image/jpeg', quality);
        } catch (e) {
          console.error('Tainted canvas in QR compress:', e);
          callback('');
          return;
        }
        // data URL prefix 'data:image/jpeg;base64,' is 23 chars — strip it
        const b64len = dataUrl.length - 23;
        if (b64len <= 500) break;

        targetW  = Math.max(18, Math.round(targetW  * 0.75));
        targetH  = Math.max(18, Math.round(targetH  * 0.75));
        quality  = Math.max(0.04, quality - 0.015);
      }

      callback(dataUrl);
    } catch (err) {
      console.error('Error in getTinyQRCodeDataUrl:', err);
      callback('');
    }
  };
  img.onerror = (err) => {
    console.error('Image load failed in getTinyQRCodeDataUrl:', err);
    callback('');
  };
  img.src = inputSource;
}

/* ============================================
   QR Share Modal — Opens with a real scannable
   http(s):// URL containing the strip in the
   URL hash so any phone camera can open it.
   ============================================ */
function openShareQRModal() {
  const container = $('qr-code-container');
  const modal     = $('qr-modal');
  if (!container || !modal) return;

  container.innerHTML = '<div style="font-family:var(--ff-body);color:var(--clr-text-dim);font-size:0.85rem;">Generating QR... ⏳</div>';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  const sourceImg = (boothMode === 'strip') ? getBakedStripDataUrl() : (capturedFrames[0] || '');

  if (!sourceImg) {
    container.innerHTML = '<div style="color:var(--clr-rose);font-size:0.85rem;">⚠️ No image yet — take a photo first!</div>';
    return;
  }

  getTinyQRCodeDataUrl(sourceImg, (tinyDataUrl) => {
    if (!tinyDataUrl) {
      container.innerHTML = '<div style="color:var(--clr-rose);font-size:0.85rem;">Failed to compress image.</div>';
      return;
    }

    // --- Build a REAL http(s):// URL ---
    // Convert base64 → base64url (URL-safe: no +  /  = that need %XX escaping)
    const b64    = tinyDataUrl.split(',')[1]; // drop 'data:image/jpeg;base64,'
    const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const baseUrl  = window.location.href.split('#')[0];
    const shareUrl = baseUrl + '#strip=' + b64url;

    console.log('QR share URL length:', shareUrl.length, '| b64 length:', b64url.length);

    container.innerHTML = '';

    try {
      if (typeof QRCode === 'undefined') {
        container.innerHTML = '<div style="color:var(--clr-rose);">QR library failed to load.</div>';
        return;
      }

      // 200×200 display — gives ~3.5 px/module at Version 12, very scannable
      new QRCode(container, {
        text         : shareUrl,
        width        : 200,
        height       : 200,
        colorDark    : '#8C2F45',
        colorLight   : '#FFFDF8',
        correctLevel : QRCode.CorrectLevel.L
      });
      console.log('QR Code generated ✓  share URL length:', shareUrl.length);
    } catch (err) {
      console.error('QR Code generation failed:', err);
      container.innerHTML = '<div style="color:var(--clr-rose);font-size:0.8rem;">QR rendering error: ' + err.message + '</div>';
    }
  });
}

function closeShareQRModal() {
  const modal = $('qr-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/* ============================================
   Shared Strip Receiver
   When another device scans the QR and opens
   this page, detect #strip= in the URL hash
   and show the photo they received.
   ============================================ */
function checkForSharedStrip() {
  if (!window.location.hash.startsWith('#strip=')) return;

  const b64url = window.location.hash.slice(7); // drop '#strip='
  if (!b64url) return;

  // Convert base64url back to standard base64
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  // Re-add padding '=' stripped during encoding
  const pad = b64.length % 4;
  if (pad === 2) b64 += '==';
  else if (pad === 3) b64 += '=';

  const dataUrl = 'data:image/jpeg;base64,' + b64;

  // Remove hash from URL bar (no reload, no history entry)
  history.replaceState(null, '', window.location.pathname);

  // Show the received strip in a cozy overlay
  showSharedStripModal(dataUrl);
}

function showSharedStripModal(dataUrl) {
  const modal = $('shared-strip-modal');
  const img   = $('shared-strip-img');
  if (!modal || !img) return;

  img.src = dataUrl;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  // Wire close button (safe to do multiple times)
  const closeBtn   = $('shared-strip-close');
  const overlay    = $('shared-strip-overlay');
  const saveBtn    = $('shared-strip-save');

  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  };

  if (closeBtn)  closeBtn.onclick  = closeModal;
  if (overlay)   overlay.onclick   = closeModal;
  if (saveBtn) {
    saveBtn.onclick = () => {
      const a = document.createElement('a');
      a.href     = dataUrl;
      a.download = 'pixie_shared_strip.jpg';
      a.click();
    };
  }
}

/* ============================================
   Aura Reading Generator
   ============================================ */
function generateAuraReading() {
  const nameEl    = $('aura-name');
  const scoreEl   = $('aura-score');
  const verdictEl = $('aura-verdict');
  const blobEl    = $('aura-blob');

  if (!nameEl || !scoreEl || !verdictEl) return;

  // Pick random values
  const auraName    = AURA_NAMES[Math.floor(Math.random() * AURA_NAMES.length)];
  const auraVerdict = AURA_VERDICTS[Math.floor(Math.random() * AURA_VERDICTS.length)];
  const auraGrad    = AURA_GRADIENTS[Math.floor(Math.random() * AURA_GRADIENTS.length)];
  const targetScore = 40 + Math.floor(Math.random() * 61); // 40-100

  nameEl.textContent    = auraName;
  verdictEl.textContent = auraVerdict;

  // Set animated gradient blob background
  if (blobEl) {
    blobEl.style.setProperty('--aura-grad', auraGrad);
    blobEl.style.background = auraGrad;
  }

  // Animate score count-up
  scoreEl.textContent = '0';
  let current = 0;
  const startTime = performance.now();
  const duration = 1200; // ms

  function animateScore(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    current = Math.round(eased * targetScore);

    scoreEl.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(animateScore);
    }
  }

  requestAnimationFrame(animateScore);
}

/* ============================================
   Progress Dot Helpers
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

function setStatus(html) {
  const el = $('booth-status');
  if (el) el.innerHTML = html;
}

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

/* ============================================
   Scrapbook Decorative Background Animations
   ============================================ */
function initSparkles() {
  const container = $('sparkles');
  if (!container) return;

  const COUNT  = 20;
  const colors = ['#F4C9D3', '#BFD7E8', '#E0578B', '#d4a5b3', '#c9dbe8'];

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

function initPetals() {
  const container = $('petals');
  if (!container) return;

  const COUNT  = 16;
  const colors = ['#F4C9D3', '#FADCE4', '#f0b8c8', '#e8aebf'];

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
    p.style.setProperty('--delay', (Math.random() * 12) + 's');
    p.style.setProperty('--drift', (40 + Math.random() * 80) + 'px');
    p.style.setProperty('--spin',  (180 + Math.random() * 360) + 'deg');
    p.style.setProperty('--peak',  (0.2 + Math.random() * 0.3));

    container.appendChild(p);
  }
}

function initHearts() {
  const container = $('hearts');
  if (!container) return;

  const COUNT = 12;
  const hearts = ['♡', '♥', '💕', '🌸', '✨'];

  for (let i = 0; i < COUNT; i++) {
    const h = document.createElement('div');
    h.classList.add('float-heart');
    h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    h.style.left = Math.random() * 100 + '%';
    h.style.fontSize = (12 + Math.random() * 14) + 'px';
    h.style.color = Math.random() > 0.5 ? '#F4C9D3' : '#E0578B';

    h.style.setProperty('--dur',   (12 + Math.random() * 14) + 's');
    h.style.setProperty('--delay', (Math.random() * 10) + 's');
    h.style.setProperty('--sway',  (20 + Math.random() * 40) + 'px');
    h.style.setProperty('--tilt',  (-25 + Math.random() * 50) + 'deg');
    h.style.setProperty('--peak',  (0.15 + Math.random() * 0.25));

    container.appendChild(h);
  }
}

/* ============================================
   Memory Wall & Local Storage Persistence
   ============================================ */
function saveMemoryToLocalStorage(type, dataUrl) {
  const newId = 'pixie_' + Date.now();
  const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  
  const newMemory = {
    id: newId,
    type: type, // 'strip' or 'boomerang'
    dataUrl: dataUrl,
    date: dateStr
  };

  let memories = [];
  try {
    const raw = localStorage.getItem('pixie_memories');
    if (raw) memories = JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse memories from localStorage:", e);
  }

  // Prepend to show newest first
  memories.unshift(newMemory);

  // Cap at 15 items to prevent quota issues
  if (memories.length > 15) {
    memories = memories.slice(0, 15);
  }

  try {
    localStorage.setItem('pixie_memories', JSON.stringify(memories));
    activeMemoryId = newId;
    console.log("Memory auto-saved to localStorage with ID:", newId);
  } catch (err) {
    console.error("Failed to write memory to localStorage:", err);
    // If it fails, let's evict some items and try again
    if (memories.length > 2) {
      memories = memories.slice(0, Math.floor(memories.length / 2));
      try {
        localStorage.setItem('pixie_memories', JSON.stringify(memories));
      } catch (err2) {
        console.error("Eviction retry also failed:", err2);
      }
    }
  }
}

function updateActiveMemoryInLocalStorage() {
  if (!activeMemoryId) return;

  // We can only update decorated strip canvas images
  if (boothMode !== 'strip') return;

  const dataUrl = getBakedStripDataUrl();
  if (!dataUrl) return;

  let memories = [];
  try {
    const raw = localStorage.getItem('pixie_memories');
    if (raw) memories = JSON.parse(raw);
  } catch (e) {
    return;
  }

  const index = memories.findIndex(m => m.id === activeMemoryId);
  if (index !== -1) {
    memories[index].dataUrl = dataUrl;
    try {
      localStorage.setItem('pixie_memories', JSON.stringify(memories));
      console.log("Active memory updated in localStorage:", activeMemoryId);
    } catch (err) {
      console.error("Failed to update active memory:", err);
    }
  }
}

function deleteMemoryFromLocalStorage(id) {
  let memories = [];
  try {
    const raw = localStorage.getItem('pixie_memories');
    if (raw) memories = JSON.parse(raw);
  } catch (e) {
    return;
  }

  memories = memories.filter(m => m.id !== id);

  try {
    localStorage.setItem('pixie_memories', JSON.stringify(memories));
    console.log("Memory deleted from localStorage:", id);
    renderMemoryWall();
  } catch (err) {
    console.error("Failed to delete memory:", err);
  }
}

function showMemoryWall() {
  renderMemoryWall();
  showScreen('wall');
}

function renderMemoryWall() {
  const grid = $('wall-grid');
  const empty = $('wall-empty');
  if (!grid || !empty) return;

  let memories = [];
  try {
    const raw = localStorage.getItem('pixie_memories');
    if (raw) memories = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to retrieve memories:", e);
  }

  if (memories.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  grid.style.display = 'grid';
  empty.style.display = 'none';
  grid.innerHTML = '';

  memories.forEach((m) => {
    const item = document.createElement('div');
    item.classList.add('wall__item');
    item.dataset.id = m.id;

    const badgeLabel = m.type === 'strip' ? '📸 Photo Strip' : '🔄 Boomerang';
    const wrapClass = m.type === 'boomerang' ? 'wall__img-wrap boomerang-type' : 'wall__img-wrap';

    item.innerHTML = `
      <button class="wall__delete-btn" type="button" title="Delete memory">×</button>
      <div class="${wrapClass}">
        <img src="${m.dataUrl}" alt="Pixie memory from ${m.date}">
      </div>
      <span class="wall__date">${m.date}</span>
      <span class="wall__type-badge">${badgeLabel}</span>
    `;

    // Bind delete click
    const delBtn = item.querySelector('.wall__delete-btn');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm("Delete this memory forever? 🧹")) {
          deleteMemoryFromLocalStorage(m.id);
        }
      });
    }

    grid.appendChild(item);
  });
}

/* ============================================
   Doodle Stamps & Frame Style Picker Logic
   ============================================ */
const DOODLE_STAMPS = {
  flower: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><path d="M50,70 Q45,85 50,95" fill="none" stroke="#8C2F45" stroke-width="4" stroke-linecap="round"/><path d="M48,80 Q35,75 42,70" fill="none" stroke="#8C2F45" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="30" r="12" fill="#FFFDF8" stroke="#8C2F45" stroke-width="3"/><circle cx="50" cy="54" r="12" fill="#FFFDF8" stroke="#8C2F45" stroke-width="3"/><circle cx="38" cy="42" r="12" fill="#FFFDF8" stroke="#8C2F45" stroke-width="3"/><circle cx="62" cy="42" r="12" fill="#FFFDF8" stroke="#8C2F45" stroke-width="3"/><circle cx="50" cy="42" r="12" fill="#FAF1E4" stroke="#8C2F45" stroke-width="3"/><circle cx="46" cy="40" r="1.5" fill="#8C2F45"/><circle cx="54" cy="40" r="1.5" fill="#8C2F45"/><path d="M47,45 Q50,48 53,45" fill="none" stroke="#8C2F45" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  heart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><path d="M50,35 C50,35 43,20 30,25 C15,30 20,53 50,80 C80,53 85,30 70,25 C57,20 50,35 50,35" fill="#F4C9D3" stroke="#8C2F45" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M50,45 C50,45 46,36 38,39 C29,42 32,56 50,70 C68,56 71,42 62,39 C54,36 50,45 50,45" fill="#E0578B" stroke="#8C2F45" stroke-width="2"/><path d="M72,20 L74,25 L79,27 L74,29 L72,34 L70,29 L65,27 L70,25 Z" fill="#FFFDF8" stroke="#8C2F45" stroke-width="1.5"/></svg>`,
  ribbon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><path d="M50,45 C35,30 15,35 25,55 C35,70 45,55 50,45" fill="#FADCE4" stroke="#8C2F45" stroke-width="3.5" stroke-linejoin="round"/><path d="M50,45 C65,30 85,35 75,55 C65,70 55,55 50,45" fill="#FADCE4" stroke="#8C2F45" stroke-width="3.5" stroke-linejoin="round"/><path d="M42,52 L25,82 L38,80 L44,57" fill="#E8AEBF" stroke="#8C2F45" stroke-width="3" stroke-linejoin="round"/><path d="M58,52 L75,82 L62,80 L56,57" fill="#E8AEBF" stroke="#8C2F45" stroke-width="3" stroke-linejoin="round"/><path d="M50,42 C50,42 47,36 42,38 C37,40 38,48 50,56 C62,48 63,40 58,38 C53,36 50,42 50,42" fill="#E0578B" stroke="#8C2F45" stroke-width="2"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><path d="M50,15 L53,38 L76,41 L53,44 L50,67 L47,44 L24,41 L47,38 Z" fill="#FFFDF8" stroke="#8C2F45" stroke-width="4" stroke-linejoin="round"/><path d="M78,55 L79.5,65 L89.5,66.5 L79.5,68 L78,78 L76.5,68 L66.5,66.5 L76.5,65 Z" fill="#BFD7E8" stroke="#8C2F45" stroke-width="2.5" stroke-linejoin="round"/><path d="M25,50 L26,57 L33,58.5 L26,60 L25,67 L24,60 L17,58.5 L24,57 Z" fill="#FADCE4" stroke="#8C2F45" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  underline: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" width="100" height="60"><path d="M10,20 Q30,5 50,20 T90,20" fill="none" stroke="#8C2F45" stroke-width="4" stroke-linecap="round"/><line x1="50" y1="20" x2="43" y2="38" stroke="#8C2F45" stroke-width="2"/><line x1="50" y1="20" x2="57" y2="38" stroke="#8C2F45" stroke-width="2"/><circle cx="43" cy="38" r="6" fill="#E0578B" stroke="#8C2F45" stroke-width="2"/><circle cx="57" cy="38" r="6" fill="#E0578B" stroke="#8C2F45" stroke-width="2"/></svg>`,
  cloud: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><path d="M25,65 C15,65 10,55 20,45 C15,30 35,20 45,30 C55,15 75,20 75,35 C85,35 90,45 85,55 C90,65 75,70 70,65 C60,75 35,75 25,65 Z" fill="#FFFDF8" stroke="#BFD7E8" stroke-width="3" stroke-linejoin="round"/><path d="M40,43 Q43,46 46,43" fill="none" stroke="#8C2F45" stroke-width="2" stroke-linecap="round"/><path d="M54,43 Q57,46 60,43" fill="none" stroke="#8C2F45" stroke-width="2" stroke-linecap="round"/><circle cx="36" cy="46" r="3" fill="#F4C9D3"/><circle cx="64" cy="46" r="3" fill="#F4C9D3"/><path d="M30,72 L32,77 A2,2 0 0,1 28,77 Z" fill="#BFD7E8" stroke="#8C2F45" stroke-width="1.5"/><path d="M50,75 L52,80 A2,2 0 0,1 48,80 Z" fill="#FADCE4" stroke="#8C2F45" stroke-width="1.5"/><path d="M70,72 L72,77 A2,2 0 0,1 68,77 Z" fill="#BFD7E8" stroke="#8C2F45" stroke-width="1.5"/></svg>`
};

function spawnStamp(stampType) {
  const overlay = $('stickers-overlay');
  const wrap = $('canvas-wrap');
  if (!overlay || !wrap) return;

  const svgContent = DOODLE_STAMPS[stampType];
  if (!svgContent) return;

  const stickerId = stickerIdCounter++;
  const sticker = document.createElement('div');
  sticker.classList.add('active-sticker', 'sticker-stamp', `stamp-${stampType}`);
  sticker.dataset.id = stickerId;

  // Position at overlay center
  const rect = overlay.getBoundingClientRect();
  const left = rect.width / 2 - 40;
  const top = rect.height / 2 - 40;

  sticker.style.left = `${left}px`;
  sticker.style.top  = `${top}px`;
  sticker.style.width = '80px';
  sticker.style.height = '80px';

  sticker.innerHTML = `
    <div class="sticker-handle sticker-handle--delete">×</div>
    <div class="active-sticker__svg-wrap">${svgContent}</div>
    <div class="sticker-handle sticker-handle--rotate">✥</div>
  `;

  overlay.appendChild(sticker);

  // Pre-load SVG as image object for synchronous drawing on canvas export
  // Use base64 encoding to prevent tainted canvas issue across browsers
  const stampImg = new Image();
  stampImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));

  const state = {
    id: stickerId,
    isStamp: true,
    stampType: stampType,
    stampImg: stampImg,
    element: sticker,
    x: left,
    y: top,
    scale: 1,
    rotation: 0
  };

  activeStickers.push(state);
  selectSticker(state);
  bindStickerEvents(state);
  updateActiveMemoryInLocalStorage();
}

function spawnDoodleSticker(imgDataUrl, cssX, cssY, cssW, cssH, nativeW, nativeH) {
  const overlay = $('stickers-overlay');
  const wrap = $('canvas-wrap');
  if (!overlay || !wrap) return;

  const stickerId = stickerIdCounter++;
  const sticker = document.createElement('div');
  sticker.classList.add('active-sticker', 'sticker-doodle');
  sticker.dataset.id = stickerId;

  sticker.style.left = `${cssX}px`;
  sticker.style.top  = `${cssY}px`;
  sticker.style.width = `${cssW}px`;
  sticker.style.height = `${cssH}px`;

  sticker.innerHTML = `
    <div class="sticker-handle sticker-handle--delete">×</div>
    <div class="active-sticker__img-wrap" style="width: 100%; height: 100%;">
      <img src="${imgDataUrl}" style="width: 100%; height: 100%; object-fit: contain; pointer-events: none;">
    </div>
    <div class="sticker-handle sticker-handle--rotate">✥</div>
  `;

  overlay.appendChild(sticker);

  const doodleImg = new Image();
  doodleImg.src = imgDataUrl;

  const state = {
    id: stickerId,
    isDoodle: true,
    doodleImg: doodleImg,
    imgDataUrl: imgDataUrl,
    element: sticker,
    x: cssX,
    y: cssY,
    w: cssW,
    h: cssH,
    nativeW: nativeW,
    nativeH: nativeH,
    scale: 1,
    rotation: 0
  };

  activeStickers.push(state);
  bindStickerEvents(state);
  updateActiveMemoryInLocalStorage();
}

function updateFrameStyle(styleName) {
  currentFrameStyle = styleName;
  const stripCanvas = $('strip-canvas');
  const ctx = stripCanvas.getContext('2d');
  if (stripCanvas && currentLoadedImages.length > 0) {
    compositeStrip(ctx, stripCanvas, currentLoadedImages, () => {
      // Re-draw the doodles since compositeStrip redraws the clean strip
      const doodleCanvas = $('doodle-canvas');
      if (doodleCanvas) {
        // Redrawing is not needed because doodleCanvas is overlaid on top of stripCanvas!
        // We only need to trigger save to localStorage so it gets updated
        updateActiveMemoryInLocalStorage();
      }
    });
  }
}

function updateProgressDotsCount(count) {
  const dots = document.querySelectorAll('.booth__dot');
  dots.forEach((d, i) => {
    if (i < count) {
      d.style.display = 'block';
    } else {
      d.style.display = 'none';
    }
  });
}
