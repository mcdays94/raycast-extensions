<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Clipboard to Photoshop icon" />
</p>

# Clipboard to Photoshop

A [Raycast](https://raycast.com) extension that opens the current clipboard image directly in Adobe Photoshop or another image editing application.

## Usage

1. Copy any image to your clipboard (screenshot, image from browser, file, etc.)
2. Open Raycast and search for **"Open Clipboard in Photoshop"**
3. The image will open instantly in Photoshop

## How It Works

The command handles three clipboard scenarios:

- **File reference** — if the clipboard holds a path to an image file, it opens it directly
- **Image file path as text** — if the clipboard text looks like a path to an image (`.png`, `.jpg`, `.psd`, `.heic`, `.raw`, etc.), it uses it directly
- **Raw image data** — if the clipboard holds raw image data (e.g. a screenshot), it saves it to a temporary PNG file and opens that

## Photoshop Detection

The extension automatically detects installed Photoshop versions via macOS Spotlight and defaults to the most recent one. No configuration needed — it just works with whatever version you have installed.

## Using a Different Application

Although the extension targets Photoshop by default, the **Target Application** preference accepts any macOS application. You can point it at Affinity Photo, Pixelmator Pro, GIMP, Preview, or any other app that can open image files.

### Preferences

| Preference             | Description                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Target Application** | Override which application opens the clipboard image. Leave empty to auto-detect the latest installed Photoshop. Accepts any app name (e.g. `Affinity Photo 2`, `Adobe Photoshop 2025`) or a full path (e.g. `/Applications/Pixelmator Pro.app`). |

## Requirements

- macOS
- Adobe Photoshop (or another image editor) installed
