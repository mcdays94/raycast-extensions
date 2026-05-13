import {
  Clipboard,
  closeMainWindow,
  launchCommand,
  LaunchType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as fs from "node:fs";

import {
  buildDeliveryUrl,
  calculateFileHash,
  formatImageUrl,
  uploadImage,
  type OutputFormat,
} from "@mcdays/cloudflare-images-core";
import {
  buildCloudflareConfig,
  buildCompressionConfig,
  getPreferences,
  parseMetadataTemplate,
  type CfImagesPreferences,
} from "./config.js";
import { addImageToCache, getCachedImage } from "./cache.js";
import { getSigningKey } from "./signing-key.js";
import { getEffectiveDefaultVariant } from "./variant.js";
import { SURFACE_VERSION } from "./version.js";

const execAsync = promisify(exec);

/**
 * The full Upload Clipboard Image pipeline, parameterised by an optional
 * format override. Used by:
 *
 *   - `upload-clipboard.tsx`         (formatOverride from launch argument, or
 *                                     null to fall back to user preference)
 *   - `upload-clipboard-markdown.tsx` (formatOverride = "markdown")
 *   - `upload-clipboard-html.tsx`     (formatOverride = "html")
 *   - `upload-clipboard-url.tsx`      (formatOverride = "raw")
 *
 * All four entry points share this single implementation so behaviour stays
 * identical across them — only the final formatting + HUD label differ.
 *
 * Flow:
 *   1. Read preferences; check Account ID / API Token / Account Hash present.
 *   2. Read Finder clipboard (in priority: file ref → image-path text → raw
 *      image bytes via osascript `«class PNGf»` dump).
 *   3. Resolve effective variant + signing key.
 *   4. Hash buffer; on cache hit, rebuild URL fresh with current variant/
 *      signing settings (cached imageId is stable).
 *   5. On cache miss, upload via uploadImage(), then cache the imageId.
 *   6. Format URL per the effective format (override || preference).
 *   7. Paste at the cursor of the previously-focused app — Clipboard.paste
 *      also copies, so the formatted string ends up on the clipboard even
 *      if the paste lands somewhere unexpected.
 *   8. HUD confirmation.
 */
export async function runUploadClipboard(
  formatOverride: OutputFormat | null,
): Promise<void> {
  const prefs = getPreferences();
  const effectiveFormat: OutputFormat = formatOverride ?? prefs.outputFormat;

  // 1. Credentials check — bail before closing the window so the toast is visible.
  const missing = missingCredentials(prefs);
  if (missing.length > 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cloudflare credentials missing",
      message: `Fill in ${missing.join(", ")} via ⌘ , — or run Validate Cloudflare Credentials.`,
      primaryAction: {
        title: "Run Validate Credentials",
        onAction: async () => {
          await launchCommand({
            name: "validate-credentials",
            type: LaunchType.UserInitiated,
          });
        },
      },
    });
    return;
  }

  // 2. Close Raycast — gives focus back to the app the user was in so the
  // eventual Clipboard.paste lands in the right place. Done early so the user
  // sees their previous app immediately while the upload runs.
  await closeMainWindow();

  let imagePath: string | null = null;
  let cleanupOsascriptPath: string | null = null;
  let fileName = "clipboard-image.png";

  try {
    // 3. Read clipboard.
    const clipboard = await Clipboard.read();

    if (clipboard.file) {
      imagePath = decodeURIComponent(clipboard.file.replace(/^file:\/\//, ""));
      fileName = imagePath.split("/").pop() ?? fileName;
    } else if (
      clipboard.text &&
      /\.(png|jpe?g|gif|webp|tiff?|bmp|svg|heic|heif|avif)$/i.test(
        clipboard.text.trim(),
      )
    ) {
      imagePath = clipboard.text.trim();
      fileName = imagePath.split("/").pop() ?? fileName;
    } else {
      const tempPath = join(tmpdir(), `cf-clipboard-${randomUUID()}.png`);
      try {
        await execAsync(
          `osascript -e 'set theFile to open for access POSIX file "${tempPath}" with write permission' ` +
            `-e 'set theData to the clipboard as «class PNGf»' ` +
            `-e 'write theData to theFile' ` +
            `-e 'close access theFile'`,
        );
        const stat = fs.statSync(tempPath);
        if (stat.size === 0) {
          try {
            fs.unlinkSync(tempPath);
          } catch {
            // ignore
          }
          await showToast({
            style: Toast.Style.Failure,
            title: "No image on clipboard",
            message:
              "Copy an image first. Tip: ⌘⇧⌃4 screenshots to clipboard directly.",
          });
          return;
        }
        imagePath = tempPath;
        cleanupOsascriptPath = tempPath;
        fileName = `clipboard-${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}.png`;
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "No image on clipboard",
          message:
            "Copy an image first. Tip: ⌘⇧⌃4 screenshots to clipboard directly.",
        });
        return;
      }
    }

    if (!imagePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read clipboard image",
      });
      return;
    }

    // 4. Resolve variant + signing key up front (used by both cache-hit and
    // upload paths). Signing key honours the manualSigningKey preference
    // override before falling back to LocalStorage cache / API auto-fetch.
    const effectiveVariant = await getEffectiveDefaultVariant(prefs);
    let signingKey = "";
    if (prefs.useSignedUrls) {
      try {
        signingKey = await getSigningKey({
          accountId: prefs.accountId,
          apiToken: prefs.apiToken,
          manualOverride: prefs.manualSigningKey,
        });
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't resolve signing key",
          message: err instanceof Error ? err.message : String(err),
        });
        return;
      }
    }
    const config = buildCloudflareConfig(prefs, signingKey, effectiveVariant);

    // 5. Dedupe.
    const buffer = fs.readFileSync(imagePath);
    const hash = calculateFileHash(buffer);
    const cached = await getCachedImage(hash);

    let url: string;
    let toast: Toast | null = null;

    if (cached) {
      url = buildDeliveryUrl(cached.imageId, effectiveVariant, config);
      await showToast({
        style: Toast.Style.Success,
        title: "Duplicate detected",
        message: `Reusing ${cached.fileName} (variant: ${effectiveVariant})`,
      });
    } else {
      // 6. Upload.
      const compression = buildCompressionConfig(prefs);
      toast = await showToast({
        style: Toast.Style.Animated,
        title: "Uploading to Cloudflare Images…",
      });

      // Metadata: respect `addMetadata` toggle; when on, parse the user's
      // template (falling back to the default + a quiet toast on parse error).
      let resolvedTemplate: Record<string, string> | undefined;
      if (prefs.addMetadata) {
        const parsed = parseMetadataTemplate(prefs.metadataTemplate);
        if (parsed.parseError) {
          // Don't block the upload — warn once and continue with default.
          void showToast({
            style: Toast.Style.Failure,
            title: "Metadata template JSON invalid — using default",
            message: parsed.errorMessage ?? "Check the JSON in preferences.",
          });
        }
        resolvedTemplate = parsed.template;
      }

      const outcome = await uploadImage({
        source: { type: "file", path: imagePath, fileName },
        config,
        compressionConfig: compression,
        avifConversionFormat: prefs.avifConversionFormat,
        metadataTemplate: resolvedTemplate,
        metadataContext: resolvedTemplate
          ? {
              fileName,
              filePath: imagePath,
              surfaceVersion: SURFACE_VERSION,
            }
          : undefined,
        onProgress: (event) => {
          if (!toast) return;
          if (event.type === "compressed") {
            toast.message = `Compressed ${formatBytes(event.originalBytes)} → ${formatBytes(event.newBytes)}`;
          } else if (event.type === "avif-converted") {
            toast.message = `Converting AVIF → ${event.toFormat}…`;
          } else if (event.type === "uploading") {
            toast.message = "Uploading…";
          } else if (event.type === "metadata-warning") {
            console.warn(event.message);
          }
        },
      });

      url = outcome.url;
      await addImageToCache(hash, outcome.imageId, fileName);
      await toast.hide();
      toast = null;
    }

    // 7. Format per the effective output format.
    const formatted = formatImageUrl(url, fileName, effectiveFormat);

    // 8. Paste at cursor in the previously-focused app.
    await Clipboard.paste(formatted);

    // 9. HUD confirmation.
    await showHUD(
      `✓ ${humanFormatLabel(effectiveFormat)} pasted from Cloudflare Images`,
    );
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Upload failed",
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    if (cleanupOsascriptPath) {
      try {
        fs.unlinkSync(cleanupOsascriptPath);
      } catch {
        // ignore
      }
    }
  }
}

function missingCredentials(prefs: CfImagesPreferences): string[] {
  const missing: string[] = [];
  if (!prefs.accountId?.trim()) missing.push("Account ID");
  if (!prefs.apiToken?.trim()) missing.push("API Token");
  if (!prefs.accountHash?.trim()) missing.push("Account Hash");
  return missing;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function humanFormatLabel(format: OutputFormat): string {
  switch (format) {
    case "markdown":
      return "Markdown";
    case "html":
      return "HTML";
    case "raw":
      return "URL";
  }
}
