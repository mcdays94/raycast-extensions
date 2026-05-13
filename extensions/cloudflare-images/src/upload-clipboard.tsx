import { type LaunchProps } from "@raycast/api";
import type { OutputFormat } from "@mcdays/cloudflare-images-core";
import { runUploadClipboard } from "./lib/upload-clipboard-impl.js";

/**
 * Argument shape from the manifest's `arguments` entry. The dropdown's first
 * option ("Use my preference") yields the sentinel value "preference"; the
 * rest map 1:1 to OutputFormat values.
 */
type FormatArg = "preference" | OutputFormat;

/**
 * Default Upload Clipboard Image command. Reads an optional `format`
 * dropdown argument and delegates to the shared `runUploadClipboard`
 * implementation. With no argument (or "preference"), the user's
 * outputFormat preference wins.
 *
 * Format-locked variants (`Upload Clipboard as Markdown/HTML/URL`) live
 * in sibling files and pass an explicit format to the same impl.
 */
export default async function UploadClipboardCommand(
  props: LaunchProps<{ arguments: { format?: FormatArg } }>,
) {
  const argFormat = props.arguments?.format;
  const override = argFormat && argFormat !== "preference" ? argFormat : null;
  await runUploadClipboard(override);
}
