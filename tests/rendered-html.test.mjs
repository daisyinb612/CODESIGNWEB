import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the BrickBuddy study shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="en">/i);
  assert.match(html, /<title>BrickBuddy Family Co-Design<\/title>/i);
  assert.match(html, /BrickBuddy/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships the complete local research flow", async () => {
  const [source, packageJson] = await Promise.all([
    readFile(new URL("../app/BrickBuddyStudy.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  for (const required of [
    "Finding a piece",
    "when do you want to talk to someone",
    "paper booklet",
    "follow the instructions one page at a time",
    "turn to the next page automatically",
    "Researcher study navigation",
    "Previous",
    "Next",
    "Study directory",
    "without clearing completed answers",
    "Child’s age",
    "Child’s gender",
    "Parent’s age",
    "Parent’s gender",
    "highest level of education",
    "parentEducation",
    "Have you heard of or used AI",
    "Doubao’s “phone call” feature",
    "aiFamiliarity",
    "doubaoCall",
    "Focused on building",
    "Just finished a step",
    "Stuck or made a mistake",
    "Building buddy",
    "Little teacher",
    "childRoles",
    "controls",
    "Button controls",
    "Voice interruptions",
    "voiceInterrupts",
    "controlCustom",
    "voiceInterruptCustom",
    "Child’s custom button control",
    "Child’s custom voice interruption",
    "parentRoles",
    "parentRecordingPreference",
    "parentHelpExpectation",
    "Would you like the AI to record your child’s building process",
    "What kind of help would you most like the AI to give your child",
    "Watches quietly most of the time",
    "parentControls",
    "parentVoiceInterrupts",
    "parentControlCustom",
    "parentVoiceInterruptCustom",
    "finalRoles",
    "finalControls",
    "finalVoiceInterrupts",
    "controlNegotiation",
    "openQuestionResponses",
    "When should the AI speak most",
    "what should its very first sentence be",
    "Optional prompts",
    "parentProposal",
    "participantNumber",
    "actorLabel",
    "actionLabel",
    "recordNo",
    "childIntervention",
    "roleNegotiation",
    "localStorage",
    "Export JSON",
    "Export CSV",
  ]) assert.match(source, new RegExp(required));
  assert.match(packageJson, /"react-native-web"/);
  assert.match(packageJson, /"lucide-react"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(source, /\\uFEFF/);
  assert.match(source, /\\r\\n/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /The parent and child should decide together which button controls and voice interruptions to keep/);
  assert.doesNotMatch(source, /form\.action\s*=\s*["']\/api\/export/);
  await assert.rejects(access(new URL("app/_sites-preview/SkeletonPreview.tsx", root)));
});
