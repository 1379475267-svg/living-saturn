# Living Saturn

Living Saturn is a cinematic interactive Three.js artwork that treats Saturn as a living cosmic entity made of light. The planet core is rendered as a dense sphere of glowing particles, wrapped by layered volumetric rings that breathe, stretch, destabilize, and collapse into controlled chaos under gesture input.

## Features

- Dense particle Saturn with a glowing particle core
- Multi-band volumetric ring system with elliptical orbital motion
- Webcam gesture control using MediaPipe hand tracking
- Smooth `openRatio` control from hand openness
- Breathing expansion and non-linear elastic scaling
- Chaos mode with ring breakdown and outward particle release
- Bloom and subtle particle trails for a cinematic finish
- Minimal fullscreen control

## Setup

This project should be run from a local server because the browser needs camera access and ES module imports.

### Option 1: Python

```bash
python -m http.server
```

### Option 2: VS Code Live Server

Open the folder in VS Code and launch Live Server on `index.html`.

Then open the local URL shown by your server, for example:

```text
http://127.0.0.1:8000/
```

## Usage

1. Allow webcam permission when prompted.
2. Hold one hand in view of the camera.
3. Open and close the hand to control Saturn:
   - Closed hand: calm, compact system
   - Open hand: expanding, breathing system
   - Very open hand: enters controlled chaos and breakdown
4. Move the mouse for subtle cinematic parallax.
5. Use the mouse wheel to move the camera closer or farther.
6. Use the fullscreen button for an immersive view.

## Notes

- Visual quality is prioritized over performance.
- Gesture tracking uses MediaPipe Tasks Vision hand landmarker.
- The artwork is designed as an installation-style experience rather than a UI-heavy demo.
