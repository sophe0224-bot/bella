import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Labubu welcome", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="en"/);
  assert.match(html, /<title>LABUBU Seeding Chatbox/);
  assert.match(html, /LABUBU Seeding Chatbox/);
  assert.match(html, /300 bilingual Q&amp;As|300 bilingual Q&As/);
  assert.match(html, /Do not worry about sounding rational yet/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("Labubu text base is loaded as 300 unique bilingual Q&A pairs", async () => {
  const text = await readFile(new URL("../app/labubu-text-base.json", import.meta.url), "utf8");
  const items = JSON.parse(text);
  assert.equal(items.length, 300);
  assert.equal(items.at(0).id, 1);
  assert.equal(items.at(-1).id, 300);
  assert.equal(new Set(items.map((item) => item.question.zh)).size, 300);
  assert.ok(items.every((item) => item.question.zh && item.question.en && item.answer.zh && item.answer.en));
});
