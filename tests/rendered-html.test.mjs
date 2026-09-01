import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("builds a static English GitHub Pages site", async () => {
  const [html, source, packageJson, workflow] = await Promise.all([
    readFile(new URL("../dist/index.html", import.meta.url), "utf8"),
    readFile(new URL("../app/BrickBuddyStudy.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  ]);

  assert.match(html, /<html lang="en">/i);
  assert.match(html, /<title>BrickBuddy Family Co-Design<\/title>/i);
  assert.match(html, /\/CODESIGNWEB\/assets\//);
  assert.match(packageJson, /"vite"/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|drizzle|cloudflare/i);
  assert.match(workflow, /actions\/deploy-pages@v4/);

  for (const required of [
    "Finding a piece",
    "Experience with AI",
    "Button controls",
    "Voice interruptions",
    "The parent and child should decide together",
    "Export JSON",
    "Export CSV",
    "localStorage",
    "URL.createObjectURL",
  ]) assert.match(source, new RegExp(required));

  await access(new URL("../dist/assets/", import.meta.url));
  await assert.rejects(access(new URL("../dist/server/", import.meta.url)));
});
