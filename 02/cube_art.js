/**
 * XTK WebGL Kinetic Cube Art Engine
 * CS460 Interactive 3D Graphics Visualization
 * 
 * Features:
 * - 6 Dynamic 3D Formations (Hypercube Wave, Vortex Galaxy, Cyber DNA Helix, Supernova Chaos, Torus Knot, Audio Pulsar)
 * - Kinetic Shockwave Physics & Particle Spring-Damping
 * - Dynamic Multi-Palette HSL Shader Coloring
 * - Wireframe / Solid / Point-Cloud / XTK Magic Shading modes
 * - Procedural Web Audio Ambient Synth & Beat Sync
 * - Smooth Cinematic Camera Choreography & Auto-Orbit
 * - Interactive Keyboard Shortcuts & HUD Dashboard
 */

(function () {
  'use strict';

  // --- Configuration & State ---
  const CUBE_COUNT = 169; // 13x13 grid for symmetric wave, or 169 particles
  const GRID_SIZE = 13;

  const state = {
    mode: 'wave',           // 'wave' | 'vortex' | 'helix' | 'supernova' | 'torus' | 'pulsar'
    palette: 'cyber',       // 'cyber' | 'rainbow' | 'solar' | 'ocean' | 'vapor' | 'matrix'
    renderType: 'TRIANGLES',// 'TRIANGLES' | 'LINES' | 'POINTS'
    magicMode: false,
    speed: 1.0,
    amplitude: 75.0,
    rotSpeed: 1.2,
    opacity: 0.9,
    cubeBaseSize: 14.0,
    cameraOrbit: true,
    cameraOrbitSpeed: 0.35,
    isPaused: false,
    audioEnabled: false,
    shockwaves: []
  };

  let renderer = null;
  const cubes = [];
  let lastTime = performance.now();
  let animTime = 0;
  let frameCount = 0;
  let fpsTimer = performance.now();

  // --- Web Audio API Synth Engine ---
  let audioCtx = null;
  let synthMasterGain = null;
  let synthFilter = null;
  let audioEnergy = 0.5;

  function initAudio() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      synthMasterGain = audioCtx.createGain();
      synthMasterGain.gain.setValueAtTime(0.2, audioCtx.currentTime);

      synthFilter = audioCtx.createBiquadFilter();
      synthFilter.type = 'lowpass';
      synthFilter.frequency.setValueAtTime(800, audioCtx.currentTime);
      synthFilter.Q.setValueAtTime(4.0, audioCtx.currentTime);

      synthMasterGain.connect(synthFilter);
      synthFilter.connect(audioCtx.destination);

      // Start ambient synth drone
      startAmbientDrone();
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  function startAmbientDrone() {
    if (!audioCtx) return;
    const baseFreqs = [110, 164.81, 220, 329.63]; // A chord drone
    baseFreqs.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(synthMasterGain);
      osc.start();
    });

    // Schedule periodic subtle arpeggios
    setInterval(() => {
      if (!state.audioEnabled || !audioCtx) return;
      playArpeggioNote();
    }, 450);
  }

  function playArpeggioNote() {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const notes = [220, 261.63, 329.63, 392.00, 440, 523.25, 659.25];
    const freq = notes[Math.floor(Math.random() * notes.length)];
    const osc = audioCtx.createOscillator();
    const noteGain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    const now = audioCtx.currentTime;
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(noteGain);
    noteGain.connect(synthFilter);

    osc.start(now);
    osc.stop(now + 0.65);

    // Filter frequency modulation
    synthFilter.frequency.setTargetAtTime(600 + Math.sin(animTime * 2) * 500, now, 0.2);
    audioEnergy = 0.5 + 0.5 * Math.sin(animTime * 3);
  }

  function triggerShockwaveSound() {
    if (!audioCtx || !state.audioEnabled) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.4);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  // --- Color Palettes & Helpers ---
  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r, g, b];
  }

  function calculateColor(palette, cubeIndex, distFromCenter, time) {
    const normIdx = cubeIndex / CUBE_COUNT;
    const normDist = distFromCenter / 200.0;

    switch (palette) {
      case 'rainbow': {
        const hue = (normDist * 0.8 + time * 0.15 + normIdx * 0.2) % 1.0;
        return hslToRgb(hue, 0.95, 0.55);
      }
      case 'solar': {
        const t = (Math.sin(time * 1.5 + normDist * 4) + 1) * 0.5;
        // Ember red -> gold yellow -> bright white
        return [
          1.0,
          0.15 + 0.75 * t,
          0.05 + 0.4 * (t * t)
        ];
      }
      case 'ocean': {
        const t = (Math.cos(time * 1.2 + normDist * 3) + 1) * 0.5;
        // Deep navy -> cyan -> seafoam emerald
        return [
          0.05 + 0.15 * t,
          0.45 + 0.55 * t,
          0.85 + 0.15 * (1 - t)
        ];
      }
      case 'vapor': {
        const phase = (time * 0.8 + normIdx * 2.5) % 1.0;
        if (phase < 0.5) {
          // Purple to Pink
          const k = phase * 2;
          return [0.6 + 0.35 * k, 0.15 + 0.2 * k, 0.9 - 0.2 * k];
        } else {
          // Pink to Turquoise
          const k = (phase - 0.5) * 2;
          return [0.95 - 0.8 * k, 0.35 + 0.55 * k, 0.7 + 0.25 * k];
        }
      }
      case 'matrix': {
        const pulse = (Math.sin(time * 3.0 + normIdx * 12.0) + 1) * 0.5;
        return [
          0.1 + 0.4 * Math.pow(pulse, 4),
          0.6 + 0.4 * pulse,
          0.2 + 0.3 * Math.pow(pulse, 2)
        ];
      }
      case 'cyber':
      default: {
        // Neon Pink to Cyan gradient with time traveling ripples
        const wave = Math.sin(normDist * 5 - time * 2.0);
        if (wave > 0) {
          // Hot Neon Pink
          const f = wave;
          return [0.98, 0.05 + 0.3 * f, 0.65 + 0.35 * f];
        } else {
          // Electric Cyan
          const f = -wave;
          return [0.0, 0.8 + 0.2 * f, 0.98];
        }
      }
    }
  }

  // --- Formation Calculation Functions ---
  function computeTargetPosition(mode, cube, t, amp) {
    const idx = cube.index;
    const gx = cube.gridX - Math.floor(GRID_SIZE / 2);
    const gy = cube.gridY - Math.floor(GRID_SIZE / 2);
    const dist = Math.sqrt(gx * gx + gy * gy);
    const SPACING = 24.0;

    switch (mode) {
      case 'wave': {
        // Multi-frequency radial ripples + diagonal cross-currents
        const ripple = Math.sin(dist * 0.65 - t * 2.5) * amp;
        const cross = Math.cos(gx * 0.4 + t * 1.5) * Math.sin(gy * 0.4 + t * 1.8) * (amp * 0.5);
        return [
          gx * SPACING,
          gy * SPACING,
          ripple + cross
        ];
      }

      case 'vortex': {
        // Flying logarithmic galaxy vortex
        const angle = cube.orbitAngle + t * (0.8 + cube.orbitSpeed);
        const radius = cube.orbitRadius + Math.sin(t * 1.5 + cube.phase) * (amp * 0.3);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = Math.sin(angle * 2.0 + t) * (amp * 0.7) + (cube.phase - 0.5) * 60;
        return [x, y, z];
      }

      case 'helix': {
        // Double DNA Strand with linking base pairs
        const strand = cube.strandIndex; // 0, 1, or 2 (cross-link)
        const helixZ = (idx / CUBE_COUNT - 0.5) * 380;
        const angle = (idx / CUBE_COUNT) * Math.PI * 8 + t * 1.8;
        const helixRadius = 70.0 + Math.sin(t * 2 + helixZ * 0.02) * 15.0;

        if (strand === 0) {
          // Strand A
          return [
            Math.cos(angle) * helixRadius,
            Math.sin(angle) * helixRadius,
            helixZ
          ];
        } else if (strand === 1) {
          // Strand B (opposite phase)
          return [
            Math.cos(angle + Math.PI) * helixRadius,
            Math.sin(angle + Math.PI) * helixRadius,
            helixZ
          ];
        } else {
          // Cross-linking rungs
          const interp = (idx % 5) / 4.0; // 0 to 1 between strand A and B
          const ax = Math.cos(angle) * helixRadius;
          const ay = Math.sin(angle) * helixRadius;
          const bx = Math.cos(angle + Math.PI) * helixRadius;
          const by = Math.sin(angle + Math.PI) * helixRadius;
          return [
            ax + (bx - ax) * interp,
            ay + (by - ay) * interp,
            helixZ
          ];
        }
      }

      case 'supernova': {
        // Explosive expansion, gravity bounce, chaotic cosmic field
        const baseRadius = 140.0;
        const pulse = (Math.sin(t * 1.2 + cube.phase * 5.0) + 1.0) * 0.5;
        const r = baseRadius * Math.pow(pulse, 0.8) + 25.0;
        const theta = cube.theta + Math.sin(t * 0.5) * 0.5;
        const phi = cube.phi + t * 0.2;

        const x = r * Math.sin(theta) * Math.cos(phi);
        const y = r * Math.sin(theta) * Math.sin(phi);
        const z = r * Math.cos(theta);
        return [x, y, z];
      }

      case 'torus': {
        // (3, 5) Torus Knot parametric surface
        const p = 3;
        const q = 5;
        const u = (idx / CUBE_COUNT) * Math.PI * 2 + t * 0.6;
        const rKnot = 0.5 * (2 + Math.sin(q * u)) * 60;
        const x = rKnot * Math.cos(p * u);
        const y = rKnot * Math.sin(p * u);
        const z = -Math.cos(q * u) * amp;
        return [x, y, z];
      }

      case 'pulsar': {
        // Equalizer circular towers pulsing to audio / rhythm
        const ring = cube.ringIndex;
        const angle = cube.ringAngle;
        const rRing = (ring + 1) * 32.0;
        const freqOffset = ring * 1.2;
        const bounce = Math.abs(Math.sin(t * 3.5 + freqOffset + angle * 2)) * (amp * 1.4);
        const audioBoost = state.audioEnabled ? audioEnergy * 40.0 : 0.0;
        return [
          Math.cos(angle) * rRing,
          Math.sin(angle) * rRing,
          bounce + audioBoost
        ];
      }

      default:
        return [gx * SPACING, gy * SPACING, 0];
    }
  }

  // --- Kinetic Shockwave Trigger ---
  function triggerShockwave(originX = 0, originY = 0, originZ = 0, strength = 180.0) {
    state.shockwaves.push({
      x: originX,
      y: originY,
      z: originZ,
      strength: strength,
      radius: 0,
      maxRadius: 350,
      speed: 320
    });

    cubes.forEach(c => {
      const dx = c.pos[0] - originX;
      const dy = c.pos[1] - originY;
      const dz = c.pos[2] - originZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 20.0;
      const force = (strength * 120.0) / (dist * dist);
      c.vel[0] += (dx / dist) * force;
      c.vel[1] += (dy / dist) * force;
      c.vel[2] += (dz / dist) * force + (Math.random() - 0.5) * 10;
    });

    triggerShockwaveSound();
  }

  // --- Main XTK Initialization ---
  function init() {
    // Instantiate XTK 3D Renderer
    renderer = new X.renderer3D();
    renderer.container = 'container';
    renderer.init();

    // Set camera position to an aesthetic 3/4 isometric vantage
    renderer.camera.position = [0, -320, 240];
    renderer.camera.focus = [0, 0, 0];
    renderer.camera.up = [0, 0, 1];

    // Create Cube entities
    for (let i = 0; i < CUBE_COUNT; i++) {
      const c = new X.cube();
      c.lengthX = state.cubeBaseSize;
      c.lengthY = state.cubeBaseSize;
      c.lengthZ = state.cubeBaseSize;
      c.opacity = state.opacity;
      c.type = state.renderType;
      c.magicmode = state.magicMode;

      // Assign initial position
      const gx = i % GRID_SIZE;
      const gy = Math.floor(i / GRID_SIZE);
      const initX = (gx - Math.floor(GRID_SIZE / 2)) * 24.0;
      const initY = (gy - Math.floor(GRID_SIZE / 2)) * 24.0;
      const initZ = 0;

      c.center = [0, 0, 0]; // Geometry centered on local origin
      renderer.add(c); // Register with XTK

      // Metadata object for physics, kinetics, and formations
      const ringIndex = Math.floor(i / 24);
      const ringAngle = (i % 24) * (Math.PI * 2 / 24);

      cubes.push({
        cube: c,
        index: i,
        gridX: gx,
        gridY: gy,
        pos: [initX, initY, initZ],
        target: [initX, initY, initZ],
        vel: [0, 0, 0],
        phase: Math.random() * Math.PI * 2,
        orbitRadius: 30.0 + (i / CUBE_COUNT) * 180.0,
        orbitAngle: (i / CUBE_COUNT) * Math.PI * 4,
        orbitSpeed: 0.2 + Math.random() * 0.5,
        strandIndex: i % 3, // for DNA helix
        theta: Math.acos(2 * Math.random() - 1), // spherical coords
        phi: Math.random() * Math.PI * 2,
        ringIndex: ringIndex,
        ringAngle: ringAngle,
        rotSpeedX: (Math.random() - 0.5) * 2.0,
        rotSpeedY: (Math.random() - 0.5) * 2.0,
        rotSpeedZ: (Math.random() - 0.5) * 2.0
      });
    }

    // Hook into XTK render loop
    renderer.onRender = onRender;

    // Start rendering
    renderer.render();

    // Setup Event Listeners & UI Controls
    setupEventListeners();
    updateUIElements();

    console.log(`[XTK Kinetic Cube Art] Initialized with ${CUBE_COUNT} cubes.`);
  }

  // --- Animation Render Loop ---
  function onRender() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000.0, 0.1);
    lastTime = now;

    // FPS calculation
    frameCount++;
    if (now - fpsTimer >= 500) {
      const fps = Math.round((frameCount * 1000) / (now - fpsTimer));
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.textContent = `${fps} FPS`;
      frameCount = 0;
      fpsTimer = now;
    }

    if (!state.isPaused) {
      animTime += dt * state.speed;
    }

    const t = animTime;
    const amp = state.amplitude;
    const rotMult = state.rotSpeed * 45.0 * dt;

    // Camera Auto-Orbit
    if (state.cameraOrbit && !state.isPaused) {
      renderer.camera.rotate([state.cameraOrbitSpeed, Math.sin(t * 0.5) * 0.1]);
    }

    // Process shockwaves
    for (let s = state.shockwaves.length - 1; s >= 0; s--) {
      const sw = state.shockwaves[s];
      sw.radius += sw.speed * dt;
      if (sw.radius > sw.maxRadius) {
        state.shockwaves.splice(s, 1);
      }
    }

    // Update each cube
    const springK = 8.5; // Spring stiffness pulling towards target
    const damping = 0.88; // Physics velocity decay

    for (let i = 0; i < CUBE_COUNT; i++) {
      const item = cubes[i];
      const c = item.cube;

      // 1. Calculate Target formation position
      const target = computeTargetPosition(state.mode, item, t, amp);
      item.target = target;

      // 2. Spring force pulling towards target + Damping
      if (!state.isPaused) {
        item.vel[0] += (target[0] - item.pos[0]) * springK * dt;
        item.vel[1] += (target[1] - item.pos[1]) * springK * dt;
        item.vel[2] += (target[2] - item.pos[2]) * springK * dt;

        item.vel[0] *= damping;
        item.vel[1] *= damping;
        item.vel[2] *= damping;

        item.pos[0] += item.vel[0] * dt * 20.0;
        item.pos[1] += item.vel[1] * dt * 20.0;
        item.pos[2] += item.vel[2] * dt * 20.0;
      }

      // 3. Update Model Matrix position in O(1)
      c.transform.matrix[12] = item.pos[0];
      c.transform.matrix[13] = item.pos[1];
      c.transform.matrix[14] = item.pos[2];

      // 4. Local Axis Rotations
      if (!state.isPaused && state.rotSpeed > 0) {
        c.transform.rotateX(item.rotSpeedX * rotMult);
        c.transform.rotateY(item.rotSpeedY * rotMult);
        c.transform.rotateZ(item.rotSpeedZ * rotMult);
      }
      c.transform.modified();

      // 5. Dynamic Color Shift
      const distFromCenter = Math.sqrt(
        item.pos[0] * item.pos[0] +
        item.pos[1] * item.pos[1] +
        item.pos[2] * item.pos[2]
      );
      c.color = calculateColor(state.palette, i, distFromCenter, t);

      // 6. Opacity & Render properties
      c.opacity = state.opacity;
    }
  }

  // --- UI & Event Handling ---
  function setupEventListeners() {
    // Mode Buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = btn.getAttribute('data-mode');
        setFormationMode(mode);
      });
    });

    // Palette Buttons
    document.querySelectorAll('[data-palette]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pal = btn.getAttribute('data-palette');
        setColorPalette(pal);
      });
    });

    // Render Style Buttons
    document.querySelectorAll('[data-style]').forEach(btn => {
      btn.addEventListener('click', () => {
        const style = btn.getAttribute('data-style');
        setRenderStyle(style);
      });
    });

    // Magic Mode Button
    const magicBtn = document.getElementById('btn-magic');
    if (magicBtn) {
      magicBtn.addEventListener('click', () => {
        state.magicMode = !state.magicMode;
        magicBtn.classList.toggle('active', state.magicMode);
        cubes.forEach(c => { c.cube.magicmode = state.magicMode; });
      });
    }

    // Sliders
    bindSlider('slider-speed', 'val-speed', v => { state.speed = parseFloat(v); }, v => `${parseFloat(v).toFixed(1)}x`);
    bindSlider('slider-amp', 'val-amp', v => { state.amplitude = parseFloat(v); }, v => `${parseInt(v)}px`);
    bindSlider('slider-rot', 'val-rot', v => { state.rotSpeed = parseFloat(v); }, v => `${parseFloat(v).toFixed(1)}x`);
    bindSlider('slider-opacity', 'val-opacity', v => { state.opacity = parseFloat(v); }, v => `${Math.round(parseFloat(v) * 100)}%`);

    // Shockwave Blast Button
    const blastBtn = document.getElementById('btn-blast');
    if (blastBtn) {
      blastBtn.addEventListener('click', () => {
        triggerShockwave(0, 0, 0, 220);
      });
    }

    // Camera Auto-Orbit Toggle
    const orbitBtn = document.getElementById('btn-orbit');
    if (orbitBtn) {
      orbitBtn.addEventListener('click', () => {
        state.cameraOrbit = !state.cameraOrbit;
        orbitBtn.classList.toggle('active', state.cameraOrbit);
      });
    }

    // Pause Toggle
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        state.isPaused = !state.isPaused;
        pauseBtn.classList.toggle('active', state.isPaused);
        pauseBtn.innerHTML = state.isPaused ? '<span class="icon">▶</span> Resume' : '<span class="icon">⏸</span> Pause';
      });
    }

    // Reset Camera
    const resetCamBtn = document.getElementById('btn-reset-cam');
    if (resetCamBtn) {
      resetCamBtn.addEventListener('click', () => {
        renderer.camera.position = [0, -320, 240];
        renderer.camera.focus = [0, 0, 0];
        renderer.camera.up = [0, 0, 1];
        renderer.camera.reset();
      });
    }

    // Audio Toggle
    const audioBtn = document.getElementById('btn-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        initAudio();
        state.audioEnabled = !state.audioEnabled;
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        audioBtn.classList.toggle('active', state.audioEnabled);
        audioBtn.innerHTML = state.audioEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      });
    }

    // Drawer Toggle
    const toggleDrawerBtn = document.getElementById('btn-toggle-controls');
    const drawer = document.getElementById('controls-drawer');
    if (toggleDrawerBtn && drawer) {
      toggleDrawerBtn.addEventListener('click', () => {
        drawer.classList.toggle('collapsed');
      });
    }

    // Help Modal
    const helpBtn = document.getElementById('btn-help');
    const modalBackdrop = document.getElementById('help-modal-backdrop');
    const modalClose = document.getElementById('btn-close-modal');
    if (helpBtn && modalBackdrop) {
      helpBtn.addEventListener('click', () => modalBackdrop.classList.add('open'));
    }
    if (modalClose && modalBackdrop) {
      modalClose.addEventListener('click', () => modalBackdrop.classList.remove('open'));
    }
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) modalBackdrop.classList.remove('open');
      });
    }

    // Interactive Shockwave on Canvas Click (distinguish click vs drag)
    const container = document.getElementById('container');
    let downPos = { x: 0, y: 0 };
    if (container) {
      container.addEventListener('mousedown', (e) => {
        downPos = { x: e.clientX, y: e.clientY };
      });

      container.addEventListener('mouseup', (e) => {
        const distMoved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
        if (distMoved < 6) { // It's a clean click, not a camera drag
          // Convert screen coordinate to approximate centered world coord
          const normX = (e.clientX / window.innerWidth - 0.5) * 200.0;
          const normY = -(e.clientY / window.innerHeight - 0.5) * 200.0;
          triggerShockwave(normX, normY, 0, 160);
        }
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is in an input
      if (e.target.tagName === 'INPUT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (pauseBtn) pauseBtn.click();
          break;
        case 'Digit1': setFormationMode('wave'); break;
        case 'Digit2': setFormationMode('vortex'); break;
        case 'Digit3': setFormationMode('helix'); break;
        case 'Digit4': setFormationMode('supernova'); break;
        case 'Digit5': setFormationMode('torus'); break;
        case 'Digit6': setFormationMode('pulsar'); break;
        case 'KeyC': cyclePalette(); break;
        case 'KeyM': if (magicBtn) magicBtn.click(); break;
        case 'KeyW': cycleRenderStyle(); break;
        case 'KeyE': triggerShockwave(0, 0, 0, 220); break;
        case 'KeyA': if (orbitBtn) orbitBtn.click(); break;
        case 'KeyR': if (resetCamBtn) resetCamBtn.click(); break;
        case 'KeyH':
          if (drawer) drawer.classList.toggle('collapsed');
          break;
        case 'Escape':
          if (modalBackdrop) modalBackdrop.classList.remove('open');
          break;
      }
    });
  }

  function bindSlider(sliderId, labelId, onVal, formatVal) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (!slider || !label) return;

    slider.addEventListener('input', (e) => {
      const v = e.target.value;
      onVal(v);
      label.textContent = formatVal(v);
    });
  }

  function setFormationMode(mode) {
    state.mode = mode;
    document.querySelectorAll('[data-mode]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });
    const badge = document.getElementById('current-mode-badge');
    if (badge) {
      badge.textContent = `Mode: ${mode.toUpperCase()}`;
    }
    // Small impulse on transition
    triggerShockwave(0, 0, 0, 60);
  }

  function setColorPalette(palette) {
    state.palette = palette;
    document.querySelectorAll('[data-palette]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-palette') === palette);
    });
  }

  function cyclePalette() {
    const palettes = ['cyber', 'rainbow', 'solar', 'ocean', 'vapor', 'matrix'];
    const nextIdx = (palettes.indexOf(state.palette) + 1) % palettes.length;
    setColorPalette(palettes[nextIdx]);
  }

  function setRenderStyle(style) {
    state.renderType = style;
    document.querySelectorAll('[data-style]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-style') === style);
    });
    cubes.forEach(c => {
      c.cube.type = style;
    });
  }

  function cycleRenderStyle() {
    const styles = ['TRIANGLES', 'LINES', 'POINTS'];
    const nextIdx = (styles.indexOf(state.renderType) + 1) % styles.length;
    setRenderStyle(styles[nextIdx]);
  }

  function updateUIElements() {
    const cubeCountBadge = document.getElementById('cube-count-badge');
    if (cubeCountBadge) {
      cubeCountBadge.textContent = `${CUBE_COUNT} Cubes`;
    }
  }

  // Initialize once DOM is ready
  window.addEventListener('DOMContentLoaded', init);

})();
