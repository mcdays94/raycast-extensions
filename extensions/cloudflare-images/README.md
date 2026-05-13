<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Cloudflare Images icon" />
</p>

# Cloudflare Images

Clipboard-first uploader for [Cloudflare Images](https://www.cloudflare.com/developer-platform/products/cloudflare-images/) directly from Raycast. Take a screenshot or copy an image, fire one of the 11 commands from `⌘ Space`, and a URL pastes at your cursor. Browse, search, and manage your uploaded images without ever leaving Raycast.

Unofficial. Not affiliated with Cloudflare, Inc.

> **Inspired by the [`cloudflare-images-upload`](https://github.com/mcdays94/cloudflare-images-upload-extension) VS Code extension** by the same author (also on [Open VSX](https://open-vsx.org/extension/miguelcaetanodias/cloudflare-images-upload)). The VS Code original integrates paste and drag-drop *inside* the editor; this Raycast extension brings the same workflow *next to* the editor via `⌘ Space`, which lets it work everywhere on your Mac, including editors that don't expose paste-hook APIs (Zed, for example).

## Getting Started

You'll need three pieces of Cloudflare configuration:

1. **Account ID**, found in your Cloudflare dashboard URL, or the right sidebar of the dashboard.
2. **API Token**, create one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) with the **Cloudflare Images: Edit** permission.
3. **Account Hash**, open any image in the Cloudflare Images dashboard; the hash is the segment in the delivery URL: `imagedelivery.net/{hash}/...`.

Open Raycast → **"Validate Cloudflare Credentials"** → fill them into the extension preferences (`⌘ ,`) and re-run. A success page confirms everything's wired up.

## Commands

11 commands grouped under "Cloudflare Images" in Raycast root search.

### Setup & validation

- **Validate Cloudflare Credentials**, confirms your three credentials work end-to-end. Typed failure messages with actionable next steps.
- **Set Default Variant**, pick the variant (`/public`, `/hero`, etc.) used in delivery URLs from a live list of your account's variants. Stored in Raycast LocalStorage; overrides the textfield preference.

### Upload from clipboard

- **Upload Clipboard Image**, reads your clipboard (file reference, image-path text, or raw screenshot bytes), uploads to Cloudflare Images, pastes the URL at the cursor in your preferred output format. Optional dropdown argument overrides format for this invocation only.
- **Upload Clipboard as Markdown**, format-locked to `![filename](url)`.
- **Upload Clipboard as HTML**, format-locked to `<img src="url" alt="filename" />`.
- **Upload Clipboard as URL**, format-locked to the raw URL. The "just give me the link" path.

Bind hotkeys to whichever variants match your workflow.

### Upload from Finder

- **Upload Selected File**, uploads image(s) selected in Finder. Handles multi-select sequentially with per-file progress; partial failures are tolerated and surfaced afterwards. Newline-joined output copied to clipboard.
- **Upload Selected File as Markdown** / **HTML** / **URL**, format-locked variants for the same workflow.

### Browse & manage

- **My Cloudflare Images**, list view with thumbnails. Search bar matches filename, image ID, and every custom metadata key + value. Toggle the detail panel (`⌘ D`) for image preview + full metadata table. Copy URL in any format, open in browser, copy image ID, or delete (destructive confirm).

## Features

- **Deduplication.** SHA-256 hash of every image is stored in Raycast LocalStorage with a 30-day TTL. Re-uploading the same screenshot returns the cached URL without hitting Cloudflare.
- **Compression.** Images larger than your configured threshold are compressed with [sharp](https://sharp.pixelplumbing.com) before upload. Quality is reduced progressively (up to 5 attempts) until the file fits. SVG and animated GIF are skipped.
- **AVIF conversion.** Cloudflare Images doesn't accept AVIF as input. The extension converts AVIF to your chosen format (WebP / JPEG / PNG) automatically.
- **Signed URLs.** Optional HMAC-signed delivery URLs with configurable expiration. The signing key is auto-fetched from Cloudflare's API and cached, or you can supply a manual override.
- **Metadata templating.** Tag uploads with structured metadata using eight dynamic placeholders: `${fileName}`, `${timestamp}`, `${date}`, `${time}`, `${fileSize}`, `${fileExtension}`, `${surfaceVersion}`, `${workspaceName}`. Cloudflare's 1024-byte metadata limit is enforced with a warning toast.
- **Live variant picker.** "Set Default Variant" fetches the variants you've configured in Cloudflare Images and lets you pick the active one, no need to type variant paths by hand.
- **Output format choice.** Markdown, HTML, or raw URL. Set a default in preferences, override per-invocation via the dropdown argument or by using a format-locked command.
- **Application-agnostic.** The paste happens at the cursor of whatever app was frontmost before Raycast opened, so you get the URL inserted exactly where you wanted it, Zed, VS Code, Slack, Notes, the Cloudflare dashboard, anywhere.

## Preferences

Open with `⌘ ,` from any of the commands.

| Preference | Type | Default | What it does |
|---|---|---|---|
| Cloudflare Account ID | textfield | - | Required |
| Cloudflare API Token | password | - | Required; needs `Cloudflare Images: Edit` |
| Cloudflare Account Hash | textfield | - | Required |
| Default Variant (fallback) | textfield | `/public` | Overridden by Set Default Variant |
| Output Format | dropdown | Markdown | For preference-driven commands |
| Signed URLs | checkbox | off | Generate HMAC-signed URLs for new uploads |
| Signed URL Expiration | textfield | `0` | Seconds; 0 = no expiry |
| Manual Signing Key | password | empty | Optional override; skips auto-fetch |
| Attach Metadata to Uploads | checkbox | on | Toggle metadata on/off entirely |
| Metadata Template (JSON) | textfield | identifying default | Customisable with `${...}` placeholders |
| Compression | checkbox | on | sharp-based for files larger than Max File Size |
| Max File Size (MB) | textfield | `10` | Cloudflare's hard limit is 10 MB |
| Compression Quality | textfield | `80` | 1–100 |
| Preserve PNG Format | checkbox | off | When off, PNGs are converted to JPEG during compression |
| AVIF Conversion Format | dropdown | WebP | AVIF inputs are converted to this before upload |

## License

MIT.
