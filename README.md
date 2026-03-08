# sequence-editor – Roblox Sequence Editor

A Visual Studio Code extension that lets you **edit Roblox ColorSequence and NumberSequence values visually** instead of manually writing keypoints.

The extension adds inline decorators above sequences so you can open a **visual editor directly from your code**.

---

## Features

### 🎨 ColorSequence Editor

Edit Roblox `ColorSequence` values using a gradient editor.

Features:
- draggable color stops
- live gradient preview
- add/remove stops
- color picker
- presets
- automatically writes `ColorSequence.new(...)`


### 📈 NumberSequence Editor

Edit Roblox `NumberSequence` values using a graph editor.

Features:
- draggable sequence keypoints
- live sequence preview
- add/remove keypoints
- support for listing keypoints
- supports editing envelopes
- automatically writes `NumberSequence.new(...)`

### AI Usage

Yes, it uses AI, mostly because I have no experience developing extensions or using CSS/JS/HTML.
This extension was made for personal use and just to make my life easier
Yes, this is my first time using AI, so i absolutely sucked with prompts.

### Known Limitations

- Currently supports only Color3.fromRGB
- Only detects sequences written as ColorSequence.new(...)
- Regex parsing (yes, it's ugly)