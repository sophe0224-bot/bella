export type Lang = "zh" | "en";

export type UserIntent =
  | "positive-interest"
  | "neutral-curiosity"
  | "uncertainty"
  | "explicit-dislike"
  | "refusal"
  | "frustration-correction"
  | "other";

const rejectionIntents = new Set<UserIntent>([
  "explicit-dislike",
  "refusal",
  "frustration-correction",
]);

function normalizeInput(input: string) {
  return input
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

export function classifyUserIntent(input: string): UserIntent {
  const value = normalizeInput(input);

  if (!value) return "other";

  if (matchesAny(value, [
    /\bi said\b.*\b(don't|do not|dont|didn't|did not)\b.*\b(like|want|care|interested)\b/,
    /\bi already said\b/,
    /\byou (misread|misunderstood|got it wrong)\b/,
    /\bstop (trying to )?(convince|persuade|sell)\b/,
    /我说了.*不(喜欢|想要|想买|感兴趣)/,
    /你(误会|理解错|看错)了/,
    /别(劝|说服|推销)/,
    /不要(劝|说服|推销)/,
  ])) {
    return "frustration-correction";
  }

  if (matchesAny(value, [
    /\b(i )?(don't|do not|dont) want\b/,
    /\b(i )?(won't|will not|would not) (buy|get|purchase)\b/,
    /\b(i am|i'm) not buying\b/,
    /\bnot (buying|purchasing|get(?:ting)?)\b/,
    /\bno thanks\b/,
    /\bnot for me\b/,
    /不(想|要)?买/,
    /不要了/,
    /不想要/,
  ])) {
    return "refusal";
  }

  if (matchesAny(value, [
    /\b(i )?(don't|do not|dont) like\b/,
    /\b(i )?(hate|dislike)\b/,
    /\b(i am|i'm) not interested\b/,
    /\bnot interested\b/,
    /\bnot my thing\b/,
    /\b(i )?(don't|do not|dont) care\b/,
    /不喜欢/,
    /讨厌/,
    /没兴趣/,
    /不感兴趣/,
    /无感/,
  ])) {
    return "explicit-dislike";
  }

  if (matchesAny(value, [
    /\bnot sure\b/,
    /\bunsure\b/,
    /\bconfused\b/,
    /\bhesitant\b/,
    /\bmaybe\b/,
    /\bi don't know\b/,
    /不知道/,
    /不确定/,
    /犹豫/,
    /纠结/,
    /要不要/,
  ])) {
    return "uncertainty";
  }

  if (matchesAny(value, [
    /\bwhy\b/,
    /\bwhat\b/,
    /\bhow\b/,
    /\btell me\b/,
    /\bexplain\b/,
    /为什么/,
    /是什么/,
    /怎么/,
    /讲讲/,
  ])) {
    return "neutral-curiosity";
  }

  if (matchesAny(value, [
    /\b(i )?(like|love|want)\b/,
    /\binterested\b/,
    /\bwant to (buy|get|purchase)\b/,
    /\bi need one\b/,
    /喜欢/,
    /想买/,
    /想要/,
    /心动/,
    /种草/,
  ])) {
    return "positive-interest";
  }

  return "other";
}

export function shouldBlockPersuasion(intent: UserIntent) {
  return rejectionIntents.has(intent);
}

export function shouldSuppressProductImage(intent: UserIntent) {
  return rejectionIntents.has(intent);
}

export function makeIntentGuardReply(intent: UserIntent, lang: Lang, input: string): string | null {
  const isZh = lang === "zh";

  if (intent === "frustration-correction") {
    return isZh
      ? "你说得对，是我刚才读错了。你说的是不喜欢 Labubu，不是嘴硬心动。\n\n那我们就不往“想买”那边聊了。你想吐槽它也行，换个话题也行。"
      : "You are right - I read that wrong. You said you do not like Labubu. That is not secretly interest.\n\nI will stop pushing it that way. We can talk about what annoys you, or just move on.";
  }

  if (intent === "refusal") {
    return isZh
      ? "明白，你不是在纠结，你就是不想买。\n\n那我不劝你。我们可以聊它为什么这么火，也可以直接换话题。"
      : "Got it. You are not debating it. You just do not want one.\n\nI will not try to convince you. We can talk about why it got so popular, or we can move on.";
  }

  if (intent === "explicit-dislike") {
    return isZh
      ? "收到，Labubu 不是你的菜。\n\n那就不硬聊喜欢了。你是不喜欢它的长相，还是烦它到处都在刷屏？"
      : "Got it - Labubu is not your thing.\n\nI will not twist that into hidden interest. Is it the look that puts you off, or are you just tired of seeing it everywhere?";
  }

  return null;
}

export function describeIntentHandling(input: string, lang: Lang = "en") {
  const intent = classifyUserIntent(input);
  const guardReply = makeIntentGuardReply(intent, lang, input);
  return {
    input,
    intent,
    expectedRoute: shouldBlockPersuasion(intent) ? `intent:${intent}` : "retrieval-or-fallback",
    actualOutput: guardReply ?? "No rejection guard. Continue to retrieval/fallback with the detected intent.",
  };
}
