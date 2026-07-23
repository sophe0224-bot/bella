import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const appRequire = createRequire(new URL("../app/page.tsx", import.meta.url));
const testRequire = createRequire(import.meta.url);
const ts = testRequire("typescript");

async function transpileCommonJs(url, sourceTransform = (source) => source) {
  const source = sourceTransform(await readFile(url, "utf8"));
  return ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

async function loadPageReplyFunction() {
  const guardCode = await transpileCommonJs(new URL("../app/chatbot-guards.ts", import.meta.url));
  const guardSandbox = {
    exports: {},
    module: { exports: {} },
    require: appRequire,
  };
  guardSandbox.exports = guardSandbox.module.exports;
  vm.runInNewContext(guardCode, guardSandbox, { filename: "chatbot-guards.ts" });

  const pageCode = await transpileCommonJs(
    new URL("../app/page.tsx", import.meta.url),
    (source) => source.replace("function createReply(", "export function createReply("),
  );
  const pageSandbox = {
    exports: {},
    module: { exports: {} },
    require: (id) => {
      if (id === "./chatbot-guards") return guardSandbox.module.exports;
      return appRequire(id);
    },
  };
  pageSandbox.exports = pageSandbox.module.exports;
  vm.runInNewContext(pageCode, pageSandbox, { filename: "page.tsx" });
  return pageSandbox.module.exports.createReply;
}

test("createReply routes current intent before retrieval and reports retrieved context", async () => {
  const createReply = await loadPageReplyFunction();
  const cases = [
    {
      input: "My friends all have one",
      expectedRoute: "text-base",
      expectRetrieved: true,
    },
    {
      input: "I keep seeing Labubu unboxing videos",
      expectedRoute: "text-base",
      expectRetrieved: true,
    },
    {
      input: "What is labubu? I don't know anything about it",
      expectedRoute: "labubu-intro",
      expectRetrieved: false,
      expectedReply: "Labubu is a little monster character",
      noRetrievalReason: "none, intro route wins",
    },
    {
      input: "I don't like Labubu.",
      expectedRoute: "intent:explicit-dislike",
      expectRetrieved: false,
    },
    {
      input: "Stop trying to convince me.",
      expectedRoute: "intent:frustration-correction",
      expectRetrieved: false,
    },
  ];

  const rows = cases.map((item, index) => {
    const actual = createReply(item.input, "en", index, []);
    assert.equal(actual.route, item.expectedRoute);
    assert.ok(actual.retrieved.length <= 3);
    if (item.expectRetrieved) assert.ok(actual.retrieved.length > 0);
    else assert.equal(actual.retrieved.length, 0);
    if (item.expectedReply) assert.match(actual.text, new RegExp(item.expectedReply.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    return {
      input: item.input,
      expected: {
        route: item.expectedRoute,
        retrieved: item.expectRetrieved ? "one or more text-base matches" : item.noRetrievalReason ?? "none, intent guard wins",
      },
      actual: {
        route: actual.route,
        intent: actual.intent,
        retrieved: actual.retrieved.map((context) => ({
          id: context.id,
          score: context.score,
          question: context.question,
          matchedSignals: context.matchedSignals,
        })),
        replyPreview: actual.text.slice(0, 220),
      },
    };
  });

  console.log(JSON.stringify(rows, null, 2));
});

test("createReply accepts expressed interest without looping into repeated questions", async () => {
  const createReply = await loadPageReplyFunction();
  const cases = [
    {
      input: "I want to buy one",
      lang: "en",
      expectedIntent: "positive-interest",
      expectedText: /(interested now|started to get your attention|shown interest)/,
      previousIntent: "other",
    },
    {
      input: "我有点心动了",
      lang: "zh",
      expectedIntent: "positive-interest",
      expectedText: /(不用再硬问自己是不是感兴趣|确实被它吸引到了|已经表现出兴趣)/,
      previousIntent: "other",
    },
    {
      input: "yes",
      lang: "en",
      expectedIntent: "positive-interest",
      expectedText: /(interested now|started to get your attention|shown interest)/,
      previousIntent: "positive-interest",
    },
    {
      input: "I want one but it is pricey",
      lang: "en",
      expectedIntent: "positive-interest",
      expectedText: /(interested now|started to get your attention|shown interest)/,
      previousIntent: "other",
    },
  ];

  const rows = cases.map((item, index) => {
    const actual = createReply(item.input, item.lang, index, [], item.previousIntent);
    assert.equal(actual.intent, item.expectedIntent);
    assert.match(actual.text, item.expectedText);
    assert.doesNotMatch(actual.text, /[?？]/);
    assert.doesNotMatch(actual.text, /why do you think|which one feels closer|what made you pause/i);
    return {
      input: item.input,
      lang: item.lang,
      previousIntent: item.previousIntent,
      actual: {
        route: actual.route,
        intent: actual.intent,
        replyPreview: actual.text.slice(0, 220),
      },
    };
  });

  console.log(JSON.stringify(rows, null, 2));
});
