import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');

/**
 * Check if a path is a local asset (not external URL, data URI, etc.)
 */
const isLocalAsset = (assetPath) => {
  if (!assetPath) return false;
  return !/^([a-z]+:)?\/\//i.test(assetPath)
    && !assetPath.startsWith('data:')
    && !assetPath.startsWith('#');
};

const toFilePath = (assetPath) => path.resolve(distDir, assetPath);

/**
 * Escape </script> inside inlined JS so the browser doesn't
 * interpret it as the end of the <script> block.
 */
const escapeScriptClose = (code) => code.replace(/<\/script/gi, '<\\/script');

const main = async () => {
  let html = await readFile(indexPath, 'utf8');

  // ── 1. Remove <link rel="modulepreload" ...> tags ──
  html = html.replace(/<link\s+[^>]*rel\s*=\s*"modulepreload"[^>]*>\s*/gi, '');

  // ── 2. Inline <script ... src="..."> tags ──
  //    Match both self-closing and non-self-closing script tags with a src attribute.
  //    Vite typically emits: <script type="module" crossorigin src="./assets/index-XXX.js"></script>
  const scriptTagRe = /<script\b[^>]*\bsrc\s*=\s*"([^"]+)"[^>]*>\s*<\/script>/gi;
  const scriptMatches = [...html.matchAll(scriptTagRe)];
  const inlineScripts = [];

  for (const match of scriptMatches) {
    const fullTag = match[0];
    const srcPath = match[1];

    if (!isLocalAsset(srcPath)) continue;

    const jsContent = await readFile(toFilePath(srcPath), 'utf8');
    const escaped = escapeScriptClose(jsContent);

    // Build the inline tag. IIFE format, no type="module" (file:// safe).
    // Will be placed before </body> so the DOM is ready when it executes.
    inlineScripts.push(`<script data-inline-source="${srcPath}">\n${escaped}\n</script>`);

    // Remove the original <script> tag from its current position (head).
    // IMPORTANT: Use a replacer function to avoid $-pattern issues in replace().
    html = html.replace(fullTag, () => '');
  }

  // Insert all inlined scripts just before </body> so <div id="root"> exists.
  if (inlineScripts.length > 0) {
    html = html.replace('</body>', () => inlineScripts.join('\n') + '\n</body>');
  }

  // ── 3. Inline <link rel="stylesheet" href="..."> tags ──
  const linkStyleRe = /<link\b[^>]*\brel\s*=\s*"stylesheet"[^>]*\bhref\s*=\s*"([^"]+)"[^>]*\/?>\s*/gi;
  const linkStyleRe2 = /<link\b[^>]*\bhref\s*=\s*"([^"]+)"[^>]*\brel\s*=\s*"stylesheet"[^>]*\/?>\s*/gi;

  for (const re of [linkStyleRe, linkStyleRe2]) {
    const linkMatches = [...html.matchAll(re)];
    for (const match of linkMatches) {
      const fullTag = match[0];
      const hrefPath = match[1];

      if (!isLocalAsset(hrefPath)) continue;

      // Avoid double-processing if already replaced
      if (!html.includes(fullTag)) continue;

      const cssContent = await readFile(toFilePath(hrefPath), 'utf8');
      const inlineStyle = `<style data-inline-source="${hrefPath}">\n${cssContent}\n</style>`;

      html = html.replace(fullTag, () => inlineStyle);
    }
  }

  await writeFile(indexPath, html, 'utf8');
  console.log('[postbuild-inline-html] done ✔');
};

main().catch((error) => {
  console.error('[postbuild-inline-html] failed:', error);
  process.exitCode = 1;
});
