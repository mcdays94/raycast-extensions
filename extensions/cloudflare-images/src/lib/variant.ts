import { LocalStorage } from "@raycast/api";
import type { CfImagesPreferences } from "./config.js";

/**
 * The "effective" default variant is what the upload / list / format commands
 * actually use when constructing image delivery URLs. Resolution order:
 *
 *   1. The variant stored via the "Set Default Variant" command (LocalStorage).
 *      This is what most users will hit — it's the friendly path that lets you
 *      pick from a live list fetched from your CF account.
 *   2. The textfield in extension preferences (`prefs.defaultVariant`). This
 *      is the fallback for power users or for cases where the variant API is
 *      unavailable.
 *   3. The hardcoded `/public` default. Every CF Images account has a built-in
 *      `public` variant so this is always a safe last resort.
 *
 * Stored values include the leading `/` (e.g. `/public`, `/hero`) to match
 * the convention used by `core/signed-urls.ts buildPublicUrl()` which
 * concatenates `<id>` and `<variant>` without an explicit separator.
 */

const STORAGE_KEY = "default-variant";

export async function getEffectiveDefaultVariant(
  prefs: CfImagesPreferences,
): Promise<string> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (stored && stored.trim()) {
    return ensureLeadingSlash(stored.trim());
  }
  const fromPrefs = prefs.defaultVariant?.trim();
  if (fromPrefs) {
    return ensureLeadingSlash(fromPrefs);
  }
  return "/public";
}

function ensureLeadingSlash(variant: string): string {
  return variant.startsWith("/") ? variant : `/${variant}`;
}

export async function getStoredDefaultVariant(): Promise<string | null> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  return stored && stored.trim() ? stored : null;
}

/**
 * Persists a variant choice. Pass with leading `/` (e.g. `/public`).
 */
export async function setStoredDefaultVariant(variant: string): Promise<void> {
  const normalised = variant.startsWith("/") ? variant : `/${variant}`;
  await LocalStorage.setItem(STORAGE_KEY, normalised);
}

export async function clearStoredDefaultVariant(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
