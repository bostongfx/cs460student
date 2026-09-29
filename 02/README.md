# CS460 Assignment 02 - 3D Nested Square Cube Tunnel Visualization (XTK)

An interactive, high-performance 3D Cube Art Visualization built with **The X Toolkit (XTK)** WebGL scientific visualization framework.

---

## 🚀 Quick Start

Open `index.html` in any modern WebGL-compatible browser (Chrome, Firefox, Safari, Edge):
- **Option 1**: Double-click [index.html](file:///Users/aryankikaganeshwala/Desktop/CS-460/cs460student/02/index.html) in Finder or File Explorer.
- **Option 2**: Run a local HTTP server:
  ```bash
  python3 -m http.server 8000
  # Open http://localhost:8000 in your browser
  ```

---

## 🌌 Final Visualization Design (`index.html`)

The final visualization is a **3D Cube Tunnel** constructed from **12 nested square-shaped rings** of cubes receding into deep perspective.

### 📐 Geometry & Perspective Architecture
- **Nested Square Frames**: 12 concentric square frames composed of 20 cubes each ($5 \text{ cubes per edge} \times 4 \text{ edges} = 240 \text{ cubes total}$).
- **Receding Perspective Scale**:
  - Outermost square frame has large cubes ($\text{scale} = 1.45\times$, half-width $L = 230$).
  - Each inner ring is progressively smaller in frame dimensions and cube size.
  - Innermost square frame at the center has tiny cubes ($\text{scale} = 0.32\times$, half-width $L = 28$).
  - Deep perspective span along the Z-axis from $Z = +80$ to $Z = -600$, creating a profound tunnel vortex.
- **Edge Arrangement**: Cubes are strictly arranged along the top, bottom, left, and right sides of each square ring, forming clean floating square frames.

### 🎨 Color Grading (Cool Bright Gradient)
- **Outer Cubes**: Pure Electric Cyan (`#00f5ff`)
- **Next Layers**: Vivid Azure & Royal Cobalt Blue (`#1462ff`)
- **Deeper Layers**: Electric Violet & Royal Purple (`#991aff`)
- **Center Rings**: Hot Neon Magenta & Radiant Pink (`#ff1493`)
- **Smooth Transition**: Gradual interpolation across all 12 rings from outer cyan/blue to center purple/magenta.

### 🌀 Continuous Animations
- **Center Axis Rotation**: The entire tunnel slowly rotates continuously around its center Z-axis, with cubes preserving frame alignment.
- **Forward & Backward Depth Travel**: Sinusoidal depth travel along the Z-axis makes the tunnel surge smoothly toward and away from the viewer, looping seamlessly.
- **Multiple Motion Styles**:
  1. **Surge (Default)**: Harmonious forward/backward depth travel.
  2. **Wave**: Peristaltic cascading wave of depth motion through the nested rings.
  3. **Warp Loop**: Continuous hyperspace forward flythrough.

### 🖱️ Interactive Camera Controls
- **Full 3D Mouse Interaction**:
  - **Left Click + Drag**: Rotate camera in 3D around the tunnel.
  - **Right Click + Drag / Scroll Wheel**: Zoom into or out of the tunnel.
  - **Middle Click + Drag**: Pan view.
- **Reset View (`[R]` / Button)**: Snaps the camera back to looking directly down the center axis into the tunnel.
- **Cinematic Auto-Orbit**: Toggleable camera orbit around the tunnel.

---

## ⌨️ Keyboard Shortcuts Reference

| Key | Action |
| :--- | :--- |
| `R` | **Reset Camera** (Look directly into the center of the tunnel) |
| `P` / `Space` | **Play / Pause** animation |
| `M` | Toggle native **XTK Magic Mode** (Vertex multi-color shading) |
| `C` | Cycle through **Color Palettes** (Cool Gradient, Cyberpunk, Aurora, Solar Magma) |
| `1` | Switch to **Travel Surge** motion (Forward / Backward looping) |
| `2` | Switch to **Traveling Wave** motion |
| `3` | Switch to **Warp Flight** loop |
| `H` | **Hide / Show HUD** controls |

---

## 📁 Project Structure

- [index.html](file:///Users/aryankikaganeshwala/Desktop/CS-460/cs460student/02/index.html) - **Final Assignment 2 Visualization**: 3D Nested Square Cube Tunnel with cool cyan-to-magenta colors, center-axis rotation, depth travel, and interactive XTK camera.
- [agent.html](file:///Users/aryankikaganeshwala/Desktop/CS-460/cs460student/02/agent.html) - **Experimental Visualization**: The initial experimental sandbox featuring 6 morphable formations, physics explosions, and generative sound.
- [README.md](file:///Users/aryankikaganeshwala/Desktop/CS-460/cs460student/02/README.md) - Documentation and technical reference.

---

## 📐 Technical Implementation

- **Framework**: [The X Toolkit (XTK)](https://goxtk.com) WebGL Framework (`xtk_edge.js`).
- **Performance**: In-place direct matrix manipulation on `cube.transform.matrix` (`Float32Array(16)`) eliminates heap allocation and garbage collection pauses, delivering rock-solid 60 FPS performance.
- **Dual Layer Architecture**: Non-blocking CSS pointer events keep HUD controls fully interactive while allowing mouse events to pass directly through to the WebGL canvas.
