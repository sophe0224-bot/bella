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
      ? "你说得对，是我刚才读错了。你表达的是不喜欢 Labubu，我不应该把它改说成潜在兴趣。\n\n我们可以换个方向：聊你不喜欢它的地方，或者直接跳到别的话题。"
      : "You are right - I misread what you said. You do not like Labubu, and I should not have reframed that as interest.\n\nWe can talk about what puts you off, or move to another topic.";
  }

  if (intent === "refusal") {
    return isZh
      ? "明白。你不是在纠结要不要买，而是在说不想买。\n\n我不会继续劝你，也不会把这句话理解成隐藏的购买欲。我们可以聊它为什么会被炒起来，或者换个话题。"
      : "Got it. You are not debating whether to buy one - you are saying you do not want one.\n\nI will not try to persuade you or treat that as hidden purchase intent. We can talk about why the hype exists, or move on.";
  }

  if (intent === "explicit-dislike") {
    return isZh
      ? "收到，Labubu 不是你的菜。\n\n我不会把“不喜欢”解释成潜意识心动。你具体反感的是造型、热度，还是大家讨论它的方式？"
      : "Got it - Labubu is not your thing.\n\nI will not treat that as hidden interest. What specifically puts you off: the design, the hype, or the way people talk about it?";
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
