# XTK WebGL Kinetic Cube Art Visualization

An interactive, high-performance 3D kinetic cube art installation built with the **XTK (The X Toolkit)** WebGL framework for **CS460 (Computer Graphics)**.

![XTK Cube Art](https://raw.githubusercontent.com/xtk/X/master/gfx/xtk.png)

---

## 🌟 Key Features

### 1. 6 Dynamic Kinetic Formations
- 🌊 **Wave Grid**: A $13 \times 13$ matrix of cubes undulating with multi-frequency sinusoidal waves and radial ripples.
- 🌀 **Vortex Galaxy**: A flock of cubes caught in logarithmic galactic spiral orbits with variable gravitational velocities.
- 🧬 **DNA Helix**: Intertwining double-helical strands with kinetic cross-linking rungs.
- 💥 **Supernova Chaos**: Explosive orbital expansion with boundary rebounds and gravitational collapse.
- 🍩 **Torus Knot**: A continuous parametric $(3, 5)$ torus knot ribbon flowing gracefully in 3D space.
- 📻 **Audio Pulsar**: Concentric equalizer rings and frequency bars that pulse rhythmically to ambient synth beats.

### 2. Kinetic Shockwave Physics
- **Click & Blast**: Clicking anywhere on the WebGL canvas (or pressing `E`) triggers a radial kinetic shockwave that blasts cubes outward based on an inverse-square distance law.
- **Spring-Damper Restoration**: Cubes smoothly bounce and settle back into formation using real-time physics integration.

### 3. Dynamic Color Shifting & Shader Palettes
- 💖 **Cyber Neon**: Electric cyan and hot pink contrast with traveling ripple waves.
- 🌈 **Rainbow Chroma**: Smooth continuous HSL spectrum cycling across space and time.
- 🔥 **Solar Flare**: Molten red, amber gold, and radiant white solar gradients.
- 🌊 **Bioluminescence**: Deep navy, turquoise, and luminous seafoam emerald.
- 🌆 **Vaporwave**: Pastel lavender, magenta, and celestial sky blue.
- ⚡ **Digital Matrix**: Hyper-pulsing emerald matrix codes.
- ✨ **Magic Mode**: Native XTK normal-vector shader for psychedelic multi-faceted coloring.

### 4. Interactive Audio Synthesizer
- Built with the **Web Audio API**:
  - Atmospheric ambient chord drone with low-pass biquad filter modulation.
  - Pentatonic arpeggios synchronized with the visual rhythm.
  - Sub-bass laser impact SFX on shockwaves.
  - Toggleable on/off via the HUD.

### 5. Render Styles
- **Solid**: Shaded 3D polygonal faces (`TRIANGLES`).
- **Wireframe**: Geometric wire outlines (`LINES`).
- **Point Cloud**: Glowing starry vertices (`POINTS`).

---

## 🚀 How to Run

### Method 1: Local HTTP Server (Recommended)
From this directory (`02`), run a local web server:
```bash
# Python 3
python -m http.server 8000
```
Then open your browser to [http://localhost:8000](http://localhost:8000).

### Method 2: Open Single-File Bundle Directly
Double-click [`agent.html`](agent.html) to open it directly in Chrome, Edge, Firefox, or Safari. It contains all HTML, CSS, JavaScript, and the XTK WebGL engine in a single, 100% self-contained file with zero external dependencies. You can also open [`index.html`](index.html).

---

## 🎮 Controls & Shortcuts

| Key / Action | Description |
| :--- | :--- |
| **Mouse Drag** | Orbit camera around the 3D scene |
| **Mouse Scroll** | Zoom camera in / out |
| **Left Click** | Trigger 3D kinetic shockwave blast at clicked point |
| **Space** | Pause / Resume animation engine |
| **1 – 6** | Switch formations (Wave, Vortex, Helix, Supernova, Torus, Pulsar) |
| **C** | Cycle color palettes |
| **W** | Toggle render style (Solid $\to$ Wireframe $\to$ Points) |
| **M** | Toggle XTK Magic Mode (rainbow normal shader) |
| **E** | Trigger explosive shockwave |
| **A** | Toggle cinematic auto-orbit camera |
| **R** | Reset camera view to default isometric angle |
| **H** | Hide / Show HUD overlay for clean wallpaper view |
