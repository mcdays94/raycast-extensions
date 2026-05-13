# Changelog

All notable changes to the Cloudflare Images family of tools live here.
This file follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
conventions and (eventually) [Semantic Versioning](https://semver.org).

The Raycast Store displays the latest section as the extension's "What's New"
copy on the listing page, so keep the most recent release at the top.

## [Unreleased]

### Planned

- Replace the placeholder icon.
- Record a README hero GIF for GitHub.
- Wire GitHub Actions CI on PR (typecheck + ray build + smoke tests).
- Friendly Form view for editing the metadata template (alternative to the JSON textfield).
- Pagination in My Cloudflare Images beyond the first 100 images.
- Bulk delete in My Cloudflare Images.

## [0.4.0] - {PR_MERGE_DATE}

Local-only release: parity with the VS Code extension is closed.

### Added

- **My Cloudflare Images** command — browse, search, view metadata, delete.
  Search matches filename, image ID, and every custom metadata key + value
  via Raycast's built-in keyword matching. Detail panel toggleable with ⌘ D.
- **Set Default Variant** command — pick from a live list of your account's
  variants. Stored in LocalStorage; overrides the textfield fallback.
- **Format dropdown argument** on Upload Clipboard Image — override the
  output format for a single invocation without changing your default.
- **Format-locked command variants** — `Upload Clipboard as Markdown`,
  `as HTML`, `as URL`, plus `Upload Selected File as Markdown`,
  `as HTML`, `as URL`. Bind hotkeys, pin to favourites.
- **Multi-select Finder upload** — `Upload Selected File` now handles N
  files sequentially with per-file progress and partial-failure tolerance.
- **Metadata customisation** — `addMetadata` checkbox + `metadataTemplate`
  JSON textfield preference. Supports `${fileName}`, `${timestamp}`,
  `${date}`, `${time}`, `${fileSize}`, `${fileExtension}`,
  `${surfaceVersion}`, `${workspaceName}`.
- **Manual signing key** override preference for users whose API token
  can't read `/images/v1/keys`.
- API smoke test script (`npm run test:api`) verifies the core's API
  contract against a real Cloudflare account.
- Pure-function smoke tests (`npm test`) — 35 deterministic checks
  covering hashing, URL building, HMAC signing, output format, metadata
  template resolution.

### Fixed

- Cache returning stale URLs after a variant change — cache now stores
  `imageId` instead of the full URL and rebuilds the URL fresh on every
  hit using the current effective variant. Legacy entries migrate
  automatically.
- Uploaded images appearing in the CF dashboard with their temp filename
  (`cf-clipboard-{uuid}.png`) instead of the intended friendly name
  — `uploadImage()` now accepts an explicit `fileName` override.

### Changed

- Renamed from "CF Images" to "Cloudflare Images" throughout — matches
  the VS Code extension's brand and other Cloudflare-prefixed Raycast
  Store extensions.
- `Clipboard.copy` → `Clipboard.paste` in Upload Clipboard Image —
  preserves the paste-from-clipboard UX from the VS Code extension.

## [0.1.0] - 2026-05-12

Initial Raycast scaffold:

### Added

- npm-workspaces monorepo with `packages/core` (pure TypeScript) and
  `packages/raycast` (Raycast extension).
- `Validate Cloudflare Credentials` command — typed failure messages
  with actionable next steps.
- Upload Clipboard Image and Upload Selected File commands (single-file).
- 12 Raycast preferences covering account, compression, AVIF conversion,
  signed URLs, output format.
- Core package with all the pure logic ported from the VS Code extension:
  hashing, compression (sharp), AVIF conversion, signed URL HMAC,
  metadata template resolution, upload / list / delete API.
