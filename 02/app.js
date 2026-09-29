/**
 * CS460 Assignment 2 - Next-Gen XTK 3D Cube Art Visualization
 * Includes Kinetic Wave Matrices, Flying Swarms, Quantum Double Helix,
 * Shatter & Recall Physics, Interactive Voxel Builder, Procedural Audio Beat,
 * and Full CS460 Scene Serialization.
 */

// Global CS460 constants & variables
var CUBE_SIDELENGTH = 10;
var CUBE_SIDELENGTH_PLACE = 10.2;
var GAP = 2;
var r = null;           // Primary X.renderer3D instance
var c = null;           // Interactive builder cursor cube
var CAMERAS = [];       // Recorded camera view matrices
var intervalID = null;  // Camera switching timer
var currCamIndex = 0;   // Current active camera index

// Master Application State Object
window.APP = {
  cubes: [],            // Managed cubes array with physics and transform metadata
  activeMode: 'wave',   // 'wave', 'swarm', 'helix', 'monument', 'supernova', 'builder'
  activePalette: 'cyber',// 'cyber', 'rainbow', 'magma', 'ocean', 'synth', 'matrix'
  animSpeed: 1.0,
  waveAmplitude: 24.0,
  waveFrequency: 0.12,
  autoOrbit: true,
  orbitSpeed: 0.35,
  isPaused: false,
  isShattered: false,
  shatterTimer: 0,
  time: 0,
  beatValue: 0,         // Audio or procedural rhythm pulse (0.0 to 1.0)
  audioEnabled: false,
  audioCtx: null,
  synthTimer: null,
  fps: 60,
  lastFrameTime: performance.now(),
  frameCount: 0,
  currentColorIndex: 1, // Builder cursor color index (0-9)

  // Palette definitions in RGB [0..1]
  palettes: {
    cyber: [
      [0.0, 0.94, 1.0],  // Cyan
      [1.0, 0.0, 0.5],   // Hot Pink
      [0.6, 0.1, 0.95],  // Neon Violet
      [1.0, 0.9, 0.0],   // Electric Yellow
      [0.0, 1.0, 0.55]   // Neon Mint
    ],
    rainbow: [],         // Computed on the fly via HSL
    magma: [
      [1.0, 1.0, 0.9],   // White heat
      [1.0, 0.85, 0.0],  // Gold
      [1.0, 0.35, 0.0],  // Molten Orange
      [0.9, 0.08, 0.05], // Crimson
      [0.35, 0.0, 0.1]   // Dark Obsidian
    ],
    ocean: [
      [0.0, 0.95, 0.9],  // Turquoise
      [0.0, 0.65, 1.0],  // Electric Azure
      [0.1, 0.25, 0.85], // Deep Cobalt
      [0.0, 1.0, 0.7],   // Phosphor Seafoam
      [0.05, 0.1, 0.3]   // Abyss
    ],
    synth: [
      [0.95, 0.15, 0.7], // Neon Pink
      [0.55, 0.1, 0.9],  // Sunset Purple
      [0.1, 0.85, 0.95], // Cyber Blue
      [1.0, 0.6, 0.1],   // Amber Sunset
      [0.85, 0.2, 0.4]   // Magenta
    ],
    matrix: [
      [0.2, 1.0, 0.4],   // Bright Terminal Green
      [0.0, 0.8, 0.2],   // Phosphor Green
      [0.05, 0.4, 0.1],  // Dark Green
      [0.8, 1.0, 0.85],  // White-Green Flash
      [0.0, 0.2, 0.05]   // Black Green
    ]
  },

  // Color lookup table for CS460 0-9 digits
  digitColors: [
    [0.0, 0.0, 0.0],       // 0: Black
    [1.0, 1.0, 1.0],       // 1: White
    [1.0, 0.05, 0.05],     // 2: Red
    [0.05, 0.9, 0.1],      // 3: Green
    [0.1, 0.3, 1.0],       // 4: Blue
    [1.0, 0.95, 0.0],      // 5: Yellow
    [1.0, 0.1, 0.85],      // 6: Pink
    [0.0, 0.95, 1.0],      // 7: Cyan
    [1.0, 0.55, 0.0],      // 8: Orange
    [0.66, 0.3, 0.26]      // 9: Brick
  ]
};

// -------------------------------------------------------------
// HELPER MATH FUNCTIONS
// -------------------------------------------------------------

/**
 * HSL to RGB conversion helper. Returns [r, g, b] in [0, 1] range.
 */
function hslToRgb(h, s, l) {
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var hp = (h % 360) / 60;
  var x = c * (1 - Math.abs((hp % 2) - 1));
  var m = l - c / 2;
  var r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) { r = c; g = x; b = 0; }
  else if (hp >= 1 && hp < 2) { r = x; g = c; b = 0; }
  else if (hp >= 2 && hp < 3) { r = 0; g = c; b = x; }
  else if (hp >= 3 && hp < 4) { r = 0; g = x; b = c; }
  else if (hp >= 4 && hp < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return [r + m, g + m, b + m];
}

/**
 * Build a 4x4 column-major transformation matrix with translation and Euler rotation.
 */
function createTRSMatrix(x, y, z, rx, ry, rz, s) {
  var cx = Math.cos(rx || 0), sx = Math.sin(rx || 0);
  var cy = Math.cos(ry || 0), sy = Math.sin(ry || 0);
  var cz = Math.cos(rz || 0), sz = Math.sin(rz || 0);
  s = s || 1.0;

  // Rotation = Rz * Ry * Rx, scaled by s
  var m00 = (cy * cz) * s;
  var m01 = (sx * sy * cz + cx * sz) * s;
  var m02 = (-cx * sy * cz + sx * sz) * s;

  var m10 = (-cy * sz) * s;
  var m11 = (-sx * sy * sz + cx * cz) * s;
  var m12 = (cx * sy * sz + sx * cz) * s;

  var m20 = sy * s;
  var m21 = -sx * cy * s;
  var m22 = cx * cy * s;

  return new Float32Array([
    m00, m01, m02, 0,
    m10, m11, m12, 0,
    m20, m21, m22, 0,
    x,   y,   z,   1
  ]);
}

/**
 * Interpolate / sample color from current active palette
 */
function getPaletteColor(t, index) {
  var pal = window.APP.palettes[window.APP.activePalette];
  if (window.APP.activePalette === 'rainbow' || !pal || pal.length === 0) {
    var hue = (t * 120 + (index || 0) * 8) % 360;
    return hslToRgb(hue, 0.95, 0.55);
  }
  var pos = Math.abs(t * 0.4 + (index || 0) * 0.15) % pal.length;
  var idx1 = Math.floor(pos);
  var idx2 = (idx1 + 1) % pal.length;
  var f = pos - idx1;
  var c1 = pal[idx1];
  var c2 = pal[idx2];
  return [
    c1[0] * (1 - f) + c2[0] * f,
    c1[1] * (1 - f) + c2[1] * f,
    c1[2] * (1 - f) + c2[2] * f
  ];
}

// -------------------------------------------------------------
// SCENE SETUP & SCULPTURE GENERATORS
// -------------------------------------------------------------

/**
 * Clear all animated cubes from the renderer and application state
 */
window.APP.clearScene = function(keepCursor) {
  for (var i = 0; i < window.APP.cubes.length; i++) {
    var item = window.APP.cubes[i];
    if (item && item.cube) {
      try {
        r.remove(item.cube);
      } catch (err) {}
    }
  }
  window.APP.cubes = [];

  // Re-add cursor if requested and in builder mode
  if (c && !keepCursor && window.APP.activeMode !== 'builder') {
    c.visible = false;
  }
};

/**
 * Register a cube imported from JSON or placed manually
 */
window.APP.registerImportedCube = function(cube) {
  var mat = cube.transform.matrix;
  var x = mat[12];
  var y = mat[13];
  var z = mat[14];
  window.APP.cubes.push({
    cube: cube,
    baseX: x, baseY: y, baseZ: z,
    currX: x, currY: y, currZ: z,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4,
    vz: (Math.random() - 0.5) * 4,
    rotX: 0, rotY: 0, rotZ: 0,
    vrotX: (Math.random() - 0.5) * 0.05,
    vrotY: (Math.random() - 0.5) * 0.05,
    vrotZ: (Math.random() - 0.5) * 0.05,
    phase: Math.random() * Math.PI * 2,
    colorBase: [cube.color[0], cube.color[1], cube.color[2]]
  });
  window.APP.updateStats();
};

/**
 * Mode 1: Cosmic Wave - 3D kinetic undulating wave field
 */
function buildWaveGrid() {
  window.APP.clearScene();
  var rows = 16;
  var cols = 16;
  var step = CUBE_SIDELENGTH + GAP;
  var startX = -((cols - 1) * step) / 2;
  var startY = -((rows - 1) * step) / 2;

  for (var iy = 0; iy < rows; iy++) {
    for (var ix = 0; ix < cols; ix++) {
      var bx = startX + ix * step;
      var by = startY + iy * step;
      var bz = 0;
      var dist = Math.sqrt(bx * bx + by * by);

      var cube = new X.cube();
      cube.lengthX = cube.lengthY = cube.lengthZ = CUBE_SIDELENGTH;
      cube.center = [0, 0, 0];
      var initColor = getPaletteColor(0, dist * 0.05);
      cube.color = initColor;
      cube.transform.matrix = createTRSMatrix(bx, by, bz, 0, 0, 0, 1);

      r.add(cube);

      window.APP.cubes.push({
        cube: cube,
        baseX: bx, baseY: by, baseZ: bz,
        currX: bx, currY: by, currZ: bz,
        vx: 0, vy: 0, vz: 0,
        rotX: 0, rotY: 0, rotZ: 0,
        vrotX: 0, vrotY: 0, vrotZ: 0,
        phase: dist * window.APP.waveFrequency,
        dist: dist,
        colorBase: initColor
      });
    }
  }
  window.APP.updateStats();
}

/**
 * Mode 2: Quantum Swarm - 3D orbiting flying cubes nebula
 */
function buildQuantumSwarm() {
  window.APP.clearScene();
  var count = 150;

  for (var i = 0; i < count; i++) {
    var radius = 40 + Math.random() * 110;
    var theta = Math.random() * Math.PI * 2;
    var phi = (Math.random() - 0.5) * Math.PI * 0.8;
    var speed = (0.4 + Math.random() * 0.8) * (Math.random() > 0.5 ? 1 : -1);

    var bx = radius * Math.cos(theta) * Math.cos(phi);
    var by = radius * Math.sin(theta) * Math.cos(phi);
    var bz = radius * Math.sin(phi);

    var cube = new X.cube();
    var sz = 6 + Math.random() * 6;
    cube.lengthX = cube.lengthY = cube.lengthZ = sz;
    cube.center = [0, 0, 0];
    var initColor = getPaletteColor(0, i);
    cube.color = initColor;
    cube.transform.matrix = createTRSMatrix(bx, by, bz, 0, 0, 0, 1);

    r.add(cube);

    window.APP.cubes.push({
      cube: cube,
      baseX: bx, baseY: by, baseZ: bz,
      currX: bx, currY: by, currZ: bz,
      vx: 0, vy: 0, vz: 0,
      rotX: Math.random() * Math.PI,
      rotY: Math.random() * Math.PI,
      rotZ: Math.random() * Math.PI,
      vrotX: (Math.random() - 0.5) * 0.06,
      vrotY: (Math.random() - 0.5) * 0.06,
      vrotZ: (Math.random() - 0.5) * 0.06,
      radius: radius,
      theta: theta,
      phi: phi,
      orbitSpeed: speed,
      phase: i * 0.1,
      colorBase: initColor
    });
  }
  window.APP.updateStats();
}

/**
 * Mode 3: Quantum DNA Double Helix
 */
function buildDoubleHelix() {
  window.APP.clearScene();
  var pairs = 48;
  var stepZ = 4.2;
  var radius = 38;
  var startZ = -((pairs - 1) * stepZ) / 2;

  for (var i = 0; i < pairs; i++) {
    var angle = i * 0.28;
    var z = startZ + i * stepZ;

    // Strand 1 cube
    var x1 = radius * Math.cos(angle);
    var y1 = radius * Math.sin(angle);
    createHelixCube(x1, y1, z, angle, 0);

    // Strand 2 cube (180 deg opposite)
    var x2 = radius * Math.cos(angle + Math.PI);
    var y2 = radius * Math.sin(angle + Math.PI);
    createHelixCube(x2, y2, z, angle + Math.PI, 1);

    // Connecting rungs every 3 pairs
    if (i % 3 === 0) {
      var rungs = 3;
      for (var k = 1; k <= rungs; k++) {
        var frac = k / (rungs + 1);
        var rx = x1 * (1 - frac) + x2 * frac;
        var ry = y1 * (1 - frac) + y2 * frac;
        var rcube = new X.cube();
        rcube.lengthX = rcube.lengthY = rcube.lengthZ = 5;
        rcube.center = [0, 0, 0];
        var col = getPaletteColor(0, i + k * 10);
        rcube.color = col;
        rcube.transform.matrix = createTRSMatrix(rx, ry, z, 0, 0, angle, 1);
        r.add(rcube);

        window.APP.cubes.push({
          cube: rcube,
          baseX: rx, baseY: ry, baseZ: z,
          currX: rx, currY: ry, currZ: z,
          vx: 0, vy: 0, vz: 0,
          rotX: 0, rotY: 0, rotZ: angle,
          vrotX: 0, vrotY: 0, vrotZ: 0.02,
          isRung: true,
          strandIdx: i,
          frac: frac,
          angleOffset: angle,
          zBase: z,
          colorBase: col
        });
      }
    }
  }

  function createHelixCube(x, y, z, angle, strand) {
    var cube = new X.cube();
    cube.lengthX = cube.lengthY = cube.lengthZ = CUBE_SIDELENGTH * 0.9;
    cube.center = [0, 0, 0];
    var col = getPaletteColor(0, angle * 5 + strand * 20);
    cube.color = col;
    cube.transform.matrix = createTRSMatrix(x, y, z, 0, 0, angle, 1);
    r.add(cube);

    window.APP.cubes.push({
      cube: cube,
      baseX: x, baseY: y, baseZ: z,
      currX: x, currY: y, currZ: z,
      vx: 0, vy: 0, vz: 0,
      rotX: 0, rotY: 0, rotZ: angle,
      vrotX: 0.01, vrotY: 0.01, vrotZ: 0.02,
      isRung: false,
      strand: strand,
      helixAngle: angle,
      zBase: z,
      radius: radius,
      colorBase: col
    });
  }
  window.APP.updateStats();
}

/**
 * Mode 4: Voxel Monument & Shatter/Recall
 * Stepped cyber temple pyramid with instant explosion and magnetic reassembly
 */
function buildVoxelMonument() {
  window.APP.clearScene();
  var step = CUBE_SIDELENGTH + GAP;
  var levels = 5;

  for (var l = 0; l < levels; l++) {
    var size = levels - l; // from 5 down to 1
    var z = (l - levels / 2) * step;
    var start = -((size - 1) * step) / 2;

    for (var ix = 0; ix < size; ix++) {
      for (var iy = 0; iy < size; iy++) {
        // Hollow out center on larger levels for crystal interior look
        if (l < 3 && ix > 0 && ix < size - 1 && iy > 0 && iy < size - 1) {
          continue;
        }

        var x = start + ix * step;
        var y = start + iy * step;

        var cube = new X.cube();
        cube.lengthX = cube.lengthY = cube.lengthZ = CUBE_SIDELENGTH;
        cube.center = [0, 0, 0];
        var col = getPaletteColor(0, l * 15 + ix + iy);
        cube.color = col;
        cube.transform.matrix = createTRSMatrix(x, y, z, 0, 0, 0, 1);
        r.add(cube);

        window.APP.cubes.push({
          cube: cube,
          baseX: x, baseY: y, baseZ: z,
          currX: x, currY: y, currZ: z,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          vz: (Math.random() - 0.5) * 6 + 2,
          rotX: 0, rotY: 0, rotZ: 0,
          vrotX: (Math.random() - 0.5) * 0.1,
          vrotY: (Math.random() - 0.5) * 0.1,
          vrotZ: (Math.random() - 0.5) * 0.1,
          level: l,
          colorBase: col
        });
      }
    }
  }
  window.APP.updateStats();
}

/**
 * Mode 5: Supernova Burst - Endless fireworks particle fountain
 */
function buildSupernova() {
  window.APP.clearScene();
  var count = 130;

  for (var i = 0; i < count; i++) {
    var cube = new X.cube();
    var sz = 5 + Math.random() * 7;
    cube.lengthX = cube.lengthY = cube.lengthZ = sz;
    cube.center = [0, 0, 0];
    var col = getPaletteColor(0, i);
    cube.color = col;

    var speed = 1.5 + Math.random() * 3.5;
    var theta = Math.random() * Math.PI * 2;
    var phi = (Math.random() - 0.5) * Math.PI;

    var vx = speed * Math.cos(theta) * Math.cos(phi);
    var vy = speed * Math.sin(theta) * Math.cos(phi);
    var vz = speed * Math.sin(phi);

    cube.transform.matrix = createTRSMatrix(0, 0, 0, 0, 0, 0, 1);
    r.add(cube);

    window.APP.cubes.push({
      cube: cube,
      baseX: 0, baseY: 0, baseZ: 0,
      currX: (Math.random() - 0.5) * 20,
      currY: (Math.random() - 0.5) * 20,
      currZ: (Math.random() - 0.5) * 20,
      vx: vx, vy: vy, vz: vz,
      rotX: 0, rotY: 0, rotZ: 0,
      vrotX: (Math.random() - 0.5) * 0.08,
      vrotY: (Math.random() - 0.5) * 0.08,
      vrotZ: (Math.random() - 0.5) * 0.08,
      age: Math.random() * 100,
      lifeSpan: 90 + Math.random() * 80,
      colorBase: col
    });
  }
  window.APP.updateStats();
}

/**
 * Mode 6: Freeform Voxel Sculptor / Builder Mode
 */
function setupBuilderMode() {
  window.APP.clearScene(true);
  if (c) {
    c.visible = true;
    c.color = window.APP.digitColors[window.APP.currentColorIndex];
    c.transform.matrix = createTRSMatrix(0, 0, 0, 0, 0, 0, 1);
  }
  window.APP.updateStats();
}

/**
 * Place a permanent cube at cursor position (CS460 Builder functionality)
 */
function placeBuilderCube() {
  if (!c) return;
  var newCube = new X.cube();
  newCube.color = [c.color[0], c.color[1], c.color[2]];
  newCube.lengthX = newCube.lengthY = newCube.lengthZ = CUBE_SIDELENGTH;
  newCube.transform.matrix = new Float32Array(c.transform.matrix);
  r.add(newCube);

  window.APP.registerImportedCube(newCube);
  window.APP.showToast('Cube added! (' + window.APP.cubes.length + ' cubes)');
}

// -------------------------------------------------------------
// PHYSICS, EXPLOSION & FRAME ANIMATION ENGINE
// -------------------------------------------------------------

/**
 * Main per-frame animation step hooked directly into XTK's onRender
 */
function updateFrame() {
  var now = performance.now();
  var delta = (now - window.APP.lastFrameTime) / 1000;
  window.APP.lastFrameTime = now;

  // Frame rate counter
  window.APP.frameCount++;
  if (window.APP.frameCount % 20 === 0) {
    window.APP.fps = Math.round(1 / Math.max(0.001, delta));
    var fpsElem = document.getElementById('statFps');
    if (fpsElem) fpsElem.textContent = window.APP.fps;
  }

  // Handle paused state
  if (window.APP.isPaused) return;

  var dt = Math.min(delta, 0.1) * window.APP.animSpeed;
  window.APP.time += dt;
  var t = window.APP.time;

  // Simulated audio beat pulse if Web Audio is muted
  if (!window.APP.audioEnabled) {
    var rawBeat = Math.sin(t * 3.5);
    window.APP.beatValue = Math.max(0, Math.pow(rawBeat, 8));
  }
  var beat = window.APP.beatValue;

  // Handle cinematic auto-camera orbit
  if (window.APP.autoOrbit && r && r.camera) {
    r.camera.rotate([window.APP.orbitSpeed, 0.08 * Math.sin(t * 0.5)]);
  }

  // Cursor pulsing in builder mode
  if (window.APP.activeMode === 'builder' && c && c.visible) {
    c.opacity = 0.65 + 0.35 * Math.sin(t * 6);
  }

  // Animate cubes based on active mode
  var cubes = window.APP.cubes;
  var mode = window.APP.activeMode;
  var isShattered = window.APP.isShattered;

  for (var i = 0; i < cubes.length; i++) {
    var item = cubes[i];
    var cube = item.cube;
    if (!cube) continue;

    // Global real-time dynamic color shift
    var col = getPaletteColor(t * 0.4, i * 0.3);
    cube.color = col;

    // --- EXPLOSION / SHATTER OVERRIDE ---
    if (isShattered) {
      item.currX += item.vx;
      item.currY += item.vy;
      item.currZ += item.vz;
      item.rotX += item.vrotX * 4;
      item.rotY += item.vrotY * 4;
      item.rotZ += item.vrotZ * 4;

      // Gentle zero-gravity cosmic drag
      item.vx *= 0.985;
      item.vy *= 0.985;
      item.vz *= 0.985;

      cube.transform.matrix = createTRSMatrix(
        item.currX, item.currY, item.currZ,
        item.rotX, item.rotY, item.rotZ,
        1.0 + beat * 0.2
      );
      continue;
    }

    // --- REASSEMBLY ELASTIC PULL TO BASE ---
    if (Math.abs(item.currX - item.baseX) > 0.5 ||
        Math.abs(item.currY - item.baseY) > 0.5 ||
        Math.abs(item.currZ - item.baseZ) > 0.5) {
      item.currX += (item.baseX - item.currX) * 0.12;
      item.currY += (item.baseY - item.currY) * 0.12;
      item.currZ += (item.baseZ - item.currZ) * 0.12;
    }

    // --- MODE SPECIFIC ANIMATION DYNAMICS ---
    if (mode === 'wave') {
      var waveFreq = window.APP.waveFrequency;
      var waveAmp = window.APP.waveAmplitude * (1.0 + beat * 0.6);
      var w1 = Math.sin(item.dist * waveFreq - t * 3.2) * waveAmp;
      var w2 = Math.cos(item.baseX * 0.08 + t * 2.0) * (waveAmp * 0.4);
      var z = item.baseZ + w1 + w2;

      // Dynamic tilt based on wave slope
      var tiltX = Math.cos(item.dist * waveFreq - t * 3.2) * 0.25;
      var tiltY = Math.sin(item.baseX * 0.08 + t * 2.0) * 0.15;

      cube.transform.matrix = createTRSMatrix(item.baseX, item.baseY, z, tiltX, tiltY, 0, 1.0 + beat * 0.1);

    } else if (mode === 'swarm') {
      item.theta += item.orbitSpeed * dt * 1.5;
      var curR = item.radius + 18 * Math.sin(t * 1.8 + item.phase) + beat * 15;
      var sx = curR * Math.cos(item.theta) * Math.cos(item.phi);
      var sy = curR * Math.sin(item.theta) * Math.cos(item.phi);
      var sz = curR * Math.sin(item.phi) + 14 * Math.sin(item.theta * 2 + t);

      item.rotX += item.vrotX;
      item.rotY += item.vrotY;
      item.rotZ += item.vrotZ;

      cube.transform.matrix = createTRSMatrix(sx, sy, sz, item.rotX, item.rotY, item.rotZ, 1.0 + beat * 0.25);

    } else if (mode === 'helix') {
      var speed = 1.2;
      var curAngle = (item.helixAngle !== undefined ? item.helixAngle : item.angleOffset) + t * speed;
      var rH = item.radius || 38;
      rH += beat * 8;

      if (!item.isRung) {
        var hx = rH * Math.cos(curAngle);
        var hy = rH * Math.sin(curAngle);
        var hz = item.zBase + Math.sin(t * 2.5 + item.zBase * 0.05) * 8;
        cube.transform.matrix = createTRSMatrix(hx, hy, hz, 0, 0, curAngle, 1.0 + beat * 0.15);
      } else {
        var xA = rH * Math.cos(curAngle);
        var yA = rH * Math.sin(curAngle);
        var xB = rH * Math.cos(curAngle + Math.PI);
        var yB = rH * Math.sin(curAngle + Math.PI);
        var rx = xA * (1 - item.frac) + xB * item.frac;
        var ry = yA * (1 - item.frac) + yB * item.frac;
        var rz = item.zBase + Math.sin(t * 2.5 + item.zBase * 0.05) * 8;
        cube.transform.matrix = createTRSMatrix(rx, ry, rz, 0, 0, curAngle, 1.0 + beat * 0.1);
      }

    } else if (mode === 'monument') {
      // Breathing crystal pulsation
      var bPulse = 1.0 + Math.sin(t * 2.0 + item.level * 0.8) * 0.08 + beat * 0.2;
      var mz = item.baseZ + Math.sin(t * 3.0 + item.level) * 3;
      cube.transform.matrix = createTRSMatrix(
        item.baseX * bPulse,
        item.baseY * bPulse,
        mz,
        Math.sin(t * 0.5) * 0.05,
        Math.cos(t * 0.5) * 0.05,
        0,
        bPulse
      );

    } else if (mode === 'supernova') {
      item.age += dt * 40;
      if (item.age >= item.lifeSpan) {
        // Reset particle to core
        item.age = 0;
        item.currX = 0; item.currY = 0; item.currZ = 0;
        var spd = 2.0 + Math.random() * 4.0;
        var th = Math.random() * Math.PI * 2;
        var ph = (Math.random() - 0.5) * Math.PI;
        item.vx = spd * Math.cos(th) * Math.cos(ph);
        item.vy = spd * Math.sin(th) * Math.cos(ph);
        item.vz = spd * Math.sin(ph);
      } else {
        item.currX += item.vx;
        item.currY += item.vy;
        item.currZ += item.vz;
        item.vx *= 0.985;
        item.vy *= 0.985;
        item.vz *= 0.985;
        item.rotX += item.vrotX;
        item.rotY += item.vrotY;
        item.rotZ += item.vrotZ;
      }
      var scale = Math.max(0.2, (1 - item.age / item.lifeSpan)) * (1.0 + beat * 0.3);
      cube.transform.matrix = createTRSMatrix(item.currX, item.currY, item.currZ, item.rotX, item.rotY, item.rotZ, scale);

    } else if (mode === 'builder') {
      // User placed cubes gently breathe or stay anchored
      var pZ = item.baseZ + Math.sin(t * 2.0 + (item.baseX + item.baseY) * 0.05) * (2 * beat);
      cube.transform.matrix = createTRSMatrix(item.baseX, item.baseY, pZ, item.rotX, item.rotY, item.rotZ, 1.0 + beat * 0.1);
    }
  }
}

/**
 * Trigger explosion shatter or magnetic reassembly
 */
window.APP.toggleShatter = function() {
  window.APP.isShattered = !window.APP.isShattered;
  var btn = document.getElementById('btnShatter');
  if (btn) {
    if (window.APP.isShattered) {
      btn.classList.add('active');
      btn.textContent = '🧲 Recall Cubes';
      window.APP.showToast('💥 Cubes Shattered into Flying Orbit!');
      // Apply explosive burst velocities
      for (var i = 0; i < window.APP.cubes.length; i++) {
        var it = window.APP.cubes[i];
        var angle = Math.random() * Math.PI * 2;
        var elevation = (Math.random() - 0.5) * Math.PI;
        var burstPower = 6 + Math.random() * 12;
        it.vx = burstPower * Math.cos(angle) * Math.cos(elevation);
        it.vy = burstPower * Math.sin(angle) * Math.cos(elevation);
        it.vz = burstPower * Math.sin(elevation);
      }
    } else {
      btn.classList.remove('active');
      btn.textContent = '💥 Shatter / Fly';
      window.APP.showToast('🧲 Magnetic Recall: Reassembling Sculpture...');
    }
  }
};

// -------------------------------------------------------------
// WEB AUDIO PROCEDURAL SYNTHWAVE BEAT
// -------------------------------------------------------------

window.APP.toggleAudio = function() {
  if (!window.APP.audioCtx) {
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      window.APP.audioCtx = new AudioContext();
    } catch (e) {
      console.warn('Web Audio not supported');
      return;
    }
  }

  if (window.APP.audioCtx.state === 'suspended') {
    window.APP.audioCtx.resume();
  }

  window.APP.audioEnabled = !window.APP.audioEnabled;
  var btn = document.getElementById('btnAudio');
  if (btn) {
    btn.classList.toggle('active', window.APP.audioEnabled);
    btn.textContent = window.APP.audioEnabled ? '🔊 Audio Beat: ON' : '🎵 Audio Beat: OFF';
  }

  if (window.APP.audioEnabled) {
    window.APP.startSynthBeat();
    window.APP.showToast('🔊 Cyberpunk Synth Beat Activated!');
  } else {
    window.APP.stopSynthBeat();
    window.APP.showToast('Audio Muted');
  }
};

window.APP.startSynthBeat = function() {
  if (window.APP.synthTimer) clearInterval(window.APP.synthTimer);
  var ctx = window.APP.audioCtx;
  if (!ctx) return;

  var step = 0;
  var baseNotes = [110, 110, 130.81, 146.83, 110, 98, 110, 164.81]; // Cyber synth riff

  window.APP.synthTimer = setInterval(function() {
    if (!window.APP.audioEnabled) return;
    var t = ctx.currentTime;

    // Trigger visual beat spike
    window.APP.beatValue = 1.0;
    setTimeout(function() { window.APP.beatValue = 0.0; }, 120);

    // Kick / Bass pulse
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = (step % 2 === 0) ? 'sine' : 'triangle';
    var freq = (step % 4 === 0) ? 65 : baseNotes[step % baseNotes.length];
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.28);

    // High Arp chirp
    if (step % 2 === 1) {
      var arpOsc = ctx.createOscillator();
      var arpGain = ctx.createGain();
      arpOsc.type = 'sawtooth';
      arpOsc.frequency.setValueAtTime(baseNotes[step % baseNotes.length] * 4, t);
      arpGain.gain.setValueAtTime(0.04, t);
      arpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      arpOsc.connect(arpGain);
      arpGain.connect(ctx.destination);
      arpOsc.start(t);
      arpOsc.stop(t + 0.16);
    }

    step++;
  }, 250); // 120 BPM 8th notes
};

window.APP.stopSynthBeat = function() {
  if (window.APP.synthTimer) {
    clearInterval(window.APP.synthTimer);
    window.APP.synthTimer = null;
  }
};

// -------------------------------------------------------------
// UI CONTROLS & CAMERA VIEWS
// -------------------------------------------------------------

window.APP.switchMode = function(modeName) {
  window.APP.activeMode = modeName;
  window.APP.isShattered = false;
  var shatterBtn = document.getElementById('btnShatter');
  if (shatterBtn) {
    shatterBtn.classList.remove('active');
    shatterBtn.textContent = '💥 Shatter / Fly';
  }

  // Update mode buttons active state
  var modeButtons = document.querySelectorAll('.mode-btn');
  for (var i = 0; i < modeButtons.length; i++) {
    var btn = modeButtons[i];
    btn.classList.toggle('active', btn.getAttribute('data-mode') === modeName);
  }

  var modeDisplay = document.getElementById('statMode');
  if (modeDisplay) modeDisplay.textContent = modeName.toUpperCase();

  // Build requested scene
  switch (modeName) {
    case 'wave': buildWaveGrid(); break;
    case 'swarm': buildQuantumSwarm(); break;
    case 'helix': buildDoubleHelix(); break;
    case 'monument': buildVoxelMonument(); break;
    case 'supernova': buildSupernova(); break;
    case 'builder': setupBuilderMode(); break;
  }

  window.APP.showToast('Mode: ' + modeName.toUpperCase());
};

window.APP.switchPalette = function(palName) {
  window.APP.activePalette = palName;
  var palButtons = document.querySelectorAll('.palette-btn');
  for (var i = 0; i < palButtons.length; i++) {
    var btn = palButtons[i];
    btn.classList.toggle('active', btn.getAttribute('data-pal') === palName);
  }
  window.APP.showToast('Palette: ' + palName.toUpperCase());
};

window.APP.setCameraPreset = function(preset) {
  if (!r || !r.camera) return;
  switch (preset) {
    case 'iso': // Isometric 3D angle
      r.camera.view = new Float32Array([
        0.707, -0.408, 0.577, 0,
        0, 0.816, 0.577, 0,
        -0.707, -0.408, 0.577, 0,
        0, 0, -220, 1
      ]);
      break;
    case 'top': // Overhead top-down plan view
      r.camera.view = new Float32Array([
        1, 0, 0, 0,
        0, 0, 1, 0,
        0, -1, 0, 0,
        0, 0, -260, 1
      ]);
      break;
    case 'hero': // Dramatic low-angle view
      r.camera.view = new Float32Array([
        1, 0, 0, 0,
        0, 0.94, -0.34, 0,
        0, 0.34, 0.94, 0,
        0, -20, -180, 1
      ]);
      break;
  }
  window.APP.showToast('Camera: ' + preset.toUpperCase());
};

window.APP.toggleAutoOrbit = function() {
  window.APP.autoOrbit = !window.APP.autoOrbit;
  var btn = document.getElementById('btnOrbit');
  if (btn) {
    btn.classList.toggle('active', window.APP.autoOrbit);
    btn.textContent = window.APP.autoOrbit ? '🎥 Auto Orbit: ON' : '🎥 Auto Orbit: OFF';
  }
  window.APP.showToast(window.APP.autoOrbit ? 'Auto Orbit Enabled' : 'Auto Orbit Paused');
};

window.APP.togglePause = function() {
  window.APP.isPaused = !window.APP.isPaused;
  var btn = document.getElementById('btnPause');
  if (btn) {
    btn.classList.toggle('active', window.APP.isPaused);
    btn.textContent = window.APP.isPaused ? '▶️ Resume' : '⏸️ Pause';
  }
  window.APP.showToast(window.APP.isPaused ? 'Animation Paused' : 'Animation Resumed');
};

window.APP.toggleUI = function() {
  var panels = [
    document.getElementById('sidebarPanel'),
    document.getElementById('statsAndLegend'),
    document.getElementById('topControlBar')
  ];
  var isHidden = panels[0].classList.contains('ui-hidden');
  for (var i = 0; i < panels.length; i++) {
    if (panels[i]) panels[i].classList.toggle('ui-hidden', !isHidden);
  }
};

window.APP.updateStats = function() {
  var cubeElem = document.getElementById('statCubes');
  if (cubeElem) cubeElem.textContent = window.APP.cubes.length;
  var modeElem = document.getElementById('statMode');
  if (modeElem) modeElem.textContent = window.APP.activeMode.toUpperCase();
};

window.APP.showToast = function(msg) {
  var toast = document.getElementById('toastMessage');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(window.APP._toastTimer);
  window.APP._toastTimer = setTimeout(function() {
    toast.classList.remove('show');
  }, 2200);
};

window.APP.onSceneLoaded = function(count) {
  window.APP.activeMode = 'builder';
  var modeDisplay = document.getElementById('statMode');
  if (modeDisplay) modeDisplay.textContent = 'IMPORTED SCENE';
  window.APP.showToast('Loaded ' + count + ' cubes from scene file!');
  window.APP.updateStats();
};

// -------------------------------------------------------------
// CS460 KEYBOARD & EVENT BINDINGS
// -------------------------------------------------------------

function setupKeyboardListeners() {
  window.addEventListener('keydown', function(e) {
    // If typing in input, ignore
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    var step = CUBE_SIDELENGTH + GAP;

    switch (e.code) {
      // WASD / EQ builder cursor movement
      case 'KeyD': // Right (+X)
        if (c) c.transform.translateX(-step);
        break;
      case 'KeyA': // Left (-X)
        if (c) c.transform.translateX(step);
        break;
      case 'KeyW': // Up (+Z)
        if (c) c.transform.translateZ(step);
        break;
      case 'KeyS': // Down (-Z)
        if (c) c.transform.translateZ(-step);
        break;
      case 'KeyQ': // Forward (+Y)
        if (c) c.transform.translateY(step);
        break;
      case 'KeyE': // Backward (-Y)
        if (c) c.transform.translateY(-step);
        break;

      // Digits 0-9: CS460 color selection
      case 'Digit0': selectDigitColor(0); break;
      case 'Digit1': selectDigitColor(1); break;
      case 'Digit2': selectDigitColor(2); break;
      case 'Digit3': selectDigitColor(3); break;
      case 'Digit4': selectDigitColor(4); break;
      case 'Digit5': selectDigitColor(5); break;
      case 'Digit6': selectDigitColor(6); break;
      case 'Digit7': selectDigitColor(7); break;
      case 'Digit8': selectDigitColor(8); break;
      case 'Digit9': selectDigitColor(9); break;

      // Spacebar: place cube in builder mode OR trigger explosion in art modes
      case 'Space':
        e.preventDefault();
        if (window.APP.activeMode === 'builder') {
          placeBuilderCube();
        } else {
          window.APP.toggleShatter();
        }
        break;

      // O: Save / Download scene.json
      case 'KeyO':
        download();
        break;

      // L: Load scene.json
      case 'KeyL':
        upload('scene.json');
        break;

      // C: Record new camera view (CS460 Bonus)
      case 'KeyC':
        if (r && r.camera) {
          CAMERAS.push(new Float32Array(r.camera.view));
          window.APP.showToast('Camera view recorded! Total: ' + CAMERAS.length);
        }
        break;

      // V: Switch camera views every second (CS460 Bonus)
      case 'KeyV':
        if (intervalID == null) {
          intervalID = setInterval(switchCamera, 1000);
          window.APP.showToast('Camera loop started (every 1s)');
        } else {
          clearInterval(intervalID);
          intervalID = null;
          window.APP.showToast('Camera loop stopped');
        }
        break;

      // M: Cycle Modes
      case 'KeyM':
        cycleNextMode();
        break;

      // P: Pause / Resume
      case 'KeyP':
        window.APP.togglePause();
        break;

      // B: Toggle Audio Beat
      case 'KeyB':
        window.APP.toggleAudio();
        break;

      // H: Toggle HUD
      case 'KeyH':
        window.APP.toggleUI();
        break;

      // R: Reset scene
      case 'KeyR':
        window.APP.switchMode(window.APP.activeMode);
        break;
    }
  });

  function selectDigitColor(index) {
    window.APP.currentColorIndex = index;
    if (c) {
      c.color = window.APP.digitColors[index];
    }
    // Update color dot UI
    var dots = document.querySelectorAll('.color-dot');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('active', parseInt(dots[i].getAttribute('data-color-index'), 10) === index);
    }
    window.APP.showToast('Color: ' + index);
  }

  function cycleNextMode() {
    var modes = ['wave', 'swarm', 'helix', 'monument', 'supernova', 'builder'];
    var curr = modes.indexOf(window.APP.activeMode);
    var next = modes[(curr + 1) % modes.length];
    window.APP.switchMode(next);
  }

  function switchCamera() {
    if (!CAMERAS || CAMERAS.length === 0) return;
    if (currCamIndex >= CAMERAS.length) {
      currCamIndex = 0;
    }
    r.camera.view = CAMERAS[currCamIndex];
    currCamIndex++;
  }
}

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------

window.onload = function() {
  // Initialize XTK 3D Renderer
  r = new X.renderer3D();
  r.init();

  // Create CS460 builder cursor cube
  c = new X.cube();
  c.lengthX = c.lengthY = c.lengthZ = CUBE_SIDELENGTH_PLACE;
  c.color = window.APP.digitColors[window.APP.currentColorIndex];
  r.add(c);

  // Hook frame update function into XTK's onRender loop
  r.onRender = function() {
    updateFrame();
  };

  // Perform initial render call to start the WebGL pipeline
  r.render();

  // Adjust camera to a great perspective angle
  if (r.camera) {
    r.camera.rotate([25, -15]);
  }

  // Setup initial sculpture mode (Cosmic Wave)
  window.APP.switchMode('wave');

  // Bind keyboard shortcuts and UI event handlers
  setupKeyboardListeners();
  setupUIEventHandlers();

  window.APP.showToast('🚀 XTK Cube Art Initialized! Press [Space] to Shatter.');
};

/**
 * Connect DOM buttons and sliders to APP state
 */
function setupUIEventHandlers() {
  // Mode selection buttons
  var modeButtons = document.querySelectorAll('.mode-btn');
  for (var i = 0; i < modeButtons.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        window.APP.switchMode(btn.getAttribute('data-mode'));
      });
    })(modeButtons[i]);
  }

  // Palette buttons
  var palButtons = document.querySelectorAll('.palette-btn');
  for (var j = 0; j < palButtons.length; j++) {
    (function(btn) {
      btn.addEventListener('click', function() {
        window.APP.switchPalette(btn.getAttribute('data-pal'));
      });
    })(palButtons[j]);
  }

  // Builder Color Dots
  var colorDots = document.querySelectorAll('.color-dot');
  for (var k = 0; k < colorDots.length; k++) {
    (function(dot) {
      dot.addEventListener('click', function() {
        var idx = parseInt(dot.getAttribute('data-color-index'), 10);
        window.APP.currentColorIndex = idx;
        if (c) c.color = window.APP.digitColors[idx];
        for (var d = 0; d < colorDots.length; d++) colorDots[d].classList.remove('active');
        dot.classList.add('active');
        if (window.APP.activeMode !== 'builder') {
          window.APP.switchMode('builder');
        }
      });
    })(colorDots[k]);
  }

  // Sliders
  var speedSlider = document.getElementById('sliderSpeed');
  if (speedSlider) {
    speedSlider.addEventListener('input', function(e) {
      window.APP.animSpeed = parseFloat(e.target.value);
      var valDisplay = document.getElementById('valSpeed');
      if (valDisplay) valDisplay.textContent = window.APP.animSpeed.toFixed(1) + 'x';
    });
  }

  var ampSlider = document.getElementById('sliderAmplitude');
  if (ampSlider) {
    ampSlider.addEventListener('input', function(e) {
      window.APP.waveAmplitude = parseFloat(e.target.value);
      var valDisplay = document.getElementById('valAmplitude');
      if (valDisplay) valDisplay.textContent = Math.round(window.APP.waveAmplitude);
    });
  }

  // File input handler for scene loading
  var fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(evt) {
        try {
          var data = JSON.parse(evt.target.result);
          upload(data);
        } catch (err) {
          alert('Failed to parse JSON scene file: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }
}
