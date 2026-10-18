# Reelsmith

A video editor that runs in your browser. Give it raw footage and it gives you back a finished vertical reel with captions, titles, stickers, zooms, a color grade, sound effects and music.

Nothing gets uploaded. Your footage stays on your computer.

## Run it

You don't need to install anything, but browsers block some features when a page is opened as a plain file, so serve the folder:

```sh
cd video-editor
python3 -m http.server 8000
# then open http://localhost:8000 in Chrome or Edge
```

Use Chrome or Edge to export MP4 (H.264). Browsers without an H.264 recorder export WebM instead. Safari 17+ also works.

## The fast path

1. **Open video**, or drag a clip onto the preview.
2. **Captions → Auto-caption**. This runs Whisper in your browser and gives you timings for every word. The first run downloads the speech model (80 to 150 MB), and after that it is cached. If you'd rather not download it, paste your script and click **Time it to my voice**, or import an `.srt` / `.vtt` file.
3. **Make it spectacular**. Pick a vibe (Energetic, Cinematic or Clean) and it builds the whole edit for you:
   - a hook title for the first 3 seconds and a call to action at the end
   - punch-in zooms timed to your caption lines, plus glitches, shakes and flashes on the loudest moments
   - whooshes, pops, booms and a ding, placed to match those moments
   - emoji stickers on words that call for one (money 💰, mistake 🛑, hair 💇‍♀️ …)
   - a color grade, a caption style and a progress bar

   Run it again and you get a different take. Anything it adds shows a small dot on the timeline, and the next run replaces only those dotted items.
4. Change anything you like, then **Export video**. The export renders in real time with sound, so keep the tab visible until it finishes.

## What's in the box

| Area | What you get |
| --- | --- |
| Captions | 8 styles (Bold pop, Loud, Highlight box, Clean subtitle, Word reveal, Typewriter, Neon, Read-along). The current word is highlighted as it's spoken. You can set the font, size, colors, outline, box, position, entrance animation and how many words show at once. You can also export an `.srt`. |
| Text & graphics | Hook title, headline, big number, label tag, quote, handwritten note, typewriter, call to action, lower third, 3‑2‑1 countdown, plus arrows, circles, underlines and boxes that draw themselves on. Also 24 emoji stickers and your own logo or image. Drag any of them on the video to move it. |
| Fonts | 16 display faces: Montserrat Black, Anton, Bebas Neue, Bangers, Luckiest Guy, Archivo Black, Poppins, Permanent Marker, Playfair Display, Righteous, Rubik Mono One, Caveat, Pacifico, Oswald, Courier Prime, DM Sans. |
| Animations | Pop, bounce, fade, slide up, slide in, zoom, typewriter, wiggle, draw on. |
| Video effects | Punch-in, slow push-in, zoom-out reveal, camera shake, Dutch tilt, white flash, glitch, RGB split, VHS, black & white, blur in, invert, fade from or to black, slow motion and speed up. |
| Look | 9 grades (Original, Punchy, Cinematic, Golden, Cool, Vintage, Noir, Dreamy, Neon) and manual controls for brightness, contrast, saturation, hue, sepia, tint, vignette, film grain, glow and cinema bars. For horizontal footage you can fill the frame and slide the crop, or show the whole shot over a blurred fill. |
| Sound | 17 sound effects generated in the browser, so no audio files are needed: whoosh, swoosh, pop, click, ding, sparkle, boom, bass drop, riser, record scratch, camera shutter, cha-ching, glitch, typing, boing, air horn and heartbeat. You can upload your own sounds, add a music track with volume, a start offset and a fade-out, and set the clip's own volume. |
| Formats | 9:16 (Reels, TikTok, Shorts), 4:5, 1:1, 16:9 |
| Projects | Save the edit as JSON and open it again with the same clip. Undo keeps your last 100 changes. |

## Keyboard

`Space` play/pause · `←` `→` step one frame (hold `Shift` for one second) · `Delete` remove the selected item · `Ctrl/Cmd+D` duplicate · `Ctrl/Cmd+Z` undo · `Esc` deselect

## How it's built

These are plain files with no build step and no framework:

- `js/render.js` draws every frame on a canvas: the graded video, the effects, the graphics and the word-timed captions. The preview and the export use the same function, so the export looks the same as the preview.
- `js/sfx.js` builds each sound effect from Web Audio oscillators and noise.
- `js/captions.js` handles word grouping, SRT/VTT, fitting a pasted script to the loud parts of your clip, finding the loudest moments, and Whisper through [transformers.js](https://github.com/huggingface/transformers.js).
- `js/app.js` contains the editor: timeline, inspector, playback, the auto edit and export (`canvas.captureStream` + `MediaRecorder`, with the clip, music and sound effects mixed into one audio track).

The project JSON is plain data (`captions`, `overlays`, `effects`, `sfx`, `look`, `captionStyle`), so another tool or an agent can write an edit plan and open it here.
