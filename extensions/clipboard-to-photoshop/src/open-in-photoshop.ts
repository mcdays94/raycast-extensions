import { Clipboard, showToast, Toast, closeMainWindow, showHUD, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

interface Preferences {
  photoshopApp?: string;
}

/**
 * Uses Spotlight (mdfind) to discover installed Photoshop apps,
 * sorted so the most recent version comes first.
 */
async function detectPhotoshopApps(): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      `mdfind "kMDItemKind == 'Application' && kMDItemDisplayName == 'Adobe Photoshop*'" -onlyin /Applications`,
    );
    const paths = stdout
      .trim()
      .split("\n")
      .filter((p) => p.length > 0);

    // Sort descending so newest year / "Beta" / plain come in a sensible order.
    // Extract the app name from the path for sorting.
    paths.sort((a, b) => {
      const nameA = a.split("/").pop() ?? "";
      const nameB = b.split("/").pop() ?? "";
      return nameB.localeCompare(nameA);
    });

    return paths;
  } catch {
    return [];
  }
}

export default async function OpenInPhotoshop() {
  const clipboardContent = await Clipboard.read();

  let imagePath: string | null = null;

  // Case 1: clipboard holds a file reference
  if (clipboardContent.file) {
    imagePath = decodeURIComponent(clipboardContent.file.replace(/^file:\/\//, ""));
  }
  // Case 2: clipboard text is a path to an image file
  else if (clipboardContent.text) {
    const text = clipboardContent.text.trim();
    if (/\.(png|jpe?g|gif|webp|tiff?|bmp|psd|svg|ai|eps|pdf|raw|cr2|nef|arw|heic)$/i.test(text)) {
      imagePath = text;
    }
  }

  // Case 3: clipboard holds raw image data — dump it to a temp PNG via osascript
  if (!imagePath) {
    const tempPath = join(tmpdir(), `raycast-ps-${randomUUID()}.png`);
    try {
      await execAsync(
        `osascript -e 'set theFile to open for access POSIX file "${tempPath}" with write permission' ` +
          `-e 'set theData to the clipboard as «class PNGf»' ` +
          `-e 'write theData to theFile' ` +
          `-e 'close access theFile'`,
      );
      imagePath = tempPath;
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No image in clipboard",
        message: e instanceof Error ? e.message : String(e),
      });
      return;
    }
  }

  // Resolve which Photoshop to open
  const prefs = getPreferenceValues<Preferences>();
  const manualApp = prefs.photoshopApp?.trim();

  await closeMainWindow();

  // If the user set a manual override, try that directly
  if (manualApp) {
    try {
      // -a works with both app names ("Adobe Photoshop 2025") and full paths ("/Applications/...")
      const { stderr } = await execAsync(`open -a "${manualApp}" "${imagePath}"`);
      if (!stderr) {
        const displayName =
          manualApp
            .split("/")
            .pop()
            ?.replace(/\.app$/, "") ?? manualApp;
        await showHUD(`Opened in ${displayName}`);
        return;
      }
    } catch {
      // Fall through to auto-detect if the manual override fails
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open specified app",
      message: `"${manualApp}" failed. Check the app name in extension preferences.`,
    });
    return;
  }

  // Auto-detect installed Photoshop versions via Spotlight
  const detectedApps = await detectPhotoshopApps();

  if (detectedApps.length > 0) {
    // Try each detected app (already sorted newest-first)
    for (const appPath of detectedApps) {
      try {
        const { stderr } = await execAsync(`open -a "${appPath}" "${imagePath}"`);
        if (!stderr) {
          const displayName =
            appPath
              .split("/")
              .pop()
              ?.replace(/\.app$/, "") ?? appPath;
          await showHUD(`Opened in ${displayName}`);
          return;
        }
      } catch {
        continue;
      }
    }
  }

  // Final fallback: hardcoded names in case Spotlight indexing is incomplete
  const fallbackApps = ["Adobe Photoshop 2026", "Adobe Photoshop 2025", "Adobe Photoshop (Beta)", "Adobe Photoshop"];
  for (const app of fallbackApps) {
    try {
      const { stderr } = await execAsync(`open -a "${app}" "${imagePath}"`);
      if (!stderr) {
        await showHUD(`Opened in ${app}`);
        return;
      }
    } catch {
      continue;
    }
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Photoshop not found",
    message: "No Adobe Photoshop installation was detected. Install Photoshop or set the app path in preferences.",
  });
}
