import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

async function loadGuards() {
  const source = await readFile(new URL("../app/chatbot-guards.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const sandbox = {
    exports: {},
    module: { exports: {} },
    require,
  };
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(compiled, sandbox, { filename: "chatbot-guards.ts" });
  return sandbox.module.exports;
}

test("intent guard separates liking, uncertainty, rejection, refusal, and correction", async () => {
  const { describeIntentHandling } = await loadGuards();
  const cases = [
    {
      input: "I like Labubu.",
      expectedIntent: "positive-interest",
      expectedRoute: "retrieval-or-fallback",
      expectedText: "No rejection guard. Continue to retrieval/fallback with the detected intent.",
    },
    {
      input: "I am not sure about Labubu.",
      expectedIntent: "uncertainty",
      expectedRoute: "retrieval-or-fallback",
      expectedText: "No rejection guard. Continue to retrieval/fallback with the detected intent.",
    },
    {
      input: "I don't like Labubu.",
      expectedIntent: "explicit-dislike",
      expectedRoute: "intent:explicit-dislike",
      expectedText: "Got it - Labubu is not your thing.",
    },
    {
      input: "I hate Labubu.",
      expectedIntent: "explicit-dislike",
      expectedRoute: "intent:explicit-dislike",
      expectedText: "Got it - Labubu is not your thing.",
    },
    {
      input: "I don't want to buy one.",
      expectedIntent: "refusal",
      expectedRoute: "intent:refusal",
      expectedText: "you are saying you do not want one",
    },
    {
      input: "Stop trying to convince me.",
      expectedIntent: "frustration-correction",
      expectedRoute: "intent:frustration-correction",
      expectedText: "I should not have reframed that as interest",
    },
    {
      input: "I said I DON'T like it.",
      expectedIntent: "frustration-correction",
      expectedRoute: "intent:frustration-correction",
      expectedText: "I should not have reframed that as interest",
    },
  ];

  const rows = cases.map((item) => {
    const actual = describeIntentHandling(item.input, "en");
    assert.equal(actual.intent, item.expectedIntent);
    assert.equal(actual.expectedRoute, item.expectedRoute);
    assert.match(actual.actualOutput, new RegExp(item.expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    return {
      input: item.input,
      expected: {
        intent: item.expectedIntent,
        route: item.expectedRoute,
        outputContains: item.expectedText,
      },
      actual: {
        intent: actual.intent,
        route: actual.expectedRoute,
        output: actual.actualOutput,
      },
    };
  });

  console.log(JSON.stringify(rows, null, 2));
});
