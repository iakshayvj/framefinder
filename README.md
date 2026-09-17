# Framefinder

**Composition guides on top of a live phone camera, so you can compose before you capture.**

[Open Framefinder](https://iakshayvj.github.io/framefinder/)

## The story

Most camera apps show a basic grid and leave the rest to instinct. I wanted a mobile web app that could open directly in Safari or Chrome, use the phone camera, and place useful composition frames over the scene before the photo is taken.

Framefinder does that without an app install. You can use the live camera, try it with a demo, or load an existing photo.

## What it does

| | Feature | What it does |
|---|---|---|
| 📷 | Live camera | Opens the browser camera on supported phones |
| 🧭 | Composition guides | Includes thirds, centered, golden ratio, symmetry, leading lines, diagonals, S-curve and a clean view |
| 🤖 | Scene coach | Suggests a guide for the current scene and explains the choice |
| 🎛️ | Camera controls | Switches camera and exposes supported device controls such as torch |
| 🖼️ | Photo mode | Applies the same framing workflow to an uploaded photo |
| 📱 | Mobile-first | Built for touch, portrait screens and in-browser capture |

## Privacy

Camera and photo processing happen in the browser. There is no account and no server upload in the current build.

## The honest bit

Browser camera features vary by device and browser. Torch and advanced controls only appear when the hardware and browser expose them. Framefinder is a composition aid, not a replacement for a native camera pipeline.

## Run it locally

Because browsers restrict camera access on plain files, serve the folder locally:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Built with Instinct

I brought the product idea and pushed the interaction deeper until it felt useful on a phone. **Instinct designed and built the web app, implemented the camera and guide system, added the scene coach and photo fallback, tested the mobile experience, and published it to GitHub Pages.**
