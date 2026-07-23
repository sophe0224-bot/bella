"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  classifyUserIntent,
  makeIntentGuardReply,
  shouldSuppressProductImage,
  type UserIntent,
} from "./chatbot-guards";
import textBase from "./labubu-text-base.json";

type Lang = "zh" | "en";
type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  image?: string;
  retrieved?: RetrievedContext[];
  route?: string;
  intent?: UserIntent;
};
type TextBaseItem = {
  id: number;
  question: Record<Lang, string>;
  answer: Record<Lang, string>;
  source_basis?: string;
};
type RetrievedContext = {
  id: number;
  score: number;
  question: string;
  answer: string;
  matchedSignals: string[];
};
type ReplyResult = {
  text: string;
  retrieved: RetrievedContext[];
  route: string;
  intent: UserIntent;
};

const labubuTextBase = textBase as TextBaseItem[];
const RETRIEVAL_TOP_K = 3;
const RETRIEVAL_THRESHOLD = 4;

const copy = {
  zh: {
    title: "LABUBU 种草 Chatbox",
    subtitle: "像和朋友吐槽一样聊就行。",
    status: "在线模拟",
    lang: "中文",
    switchLang: "EN",
    reset: "清空",
    userAvatar: "你",
    input: "比如：为什么我会突然想买 Labubu？",
    send: "发送",
    panelTitle: "对话主题",
    profile: "当前画像",
    profileValue: "还在观察自己的感觉",
    baseLabel: "背景知识",
    baseValue: "300 条双语笔记",
    baseHint: "用来理解为什么一个小玩偶会突然刷得到、聊得到、想得起来。",
    hint: "不用问得很标准。直接说“我朋友都有”“它有点丑萌”“贵是贵但我想买”“我怕抢不到”都行。",
    thinking: "我回一下",
    starters: ["我是不是被种草了？", "它好丑但我老想看", "我朋友都有一个", "我想买但真的贵"],
    welcome: [
      "先别急着给自己扣“跟风”的帽子。",
      "你就说实话：它到底是哪一下戳到你了？是开箱视频，朋友挂包上，还是刷多了以后突然觉得，欸，好像还挺可爱。",
    ],
  },
  en: {
    title: "LABUBU Seeding Chatbox",
    subtitle: "Text it like you would text a friend.",
    status: "Live simulation",
    lang: "English",
    switchLang: "中文",
    reset: "Reset",
    userAvatar: "You",
    input: "Example: Why do I suddenly want a Labubu?",
    send: "Send",
    panelTitle: "Conversation themes",
    profile: "Current profile",
    profileValue: "Reading the current signal",
    baseLabel: "Background notes",
    baseValue: "300 bilingual notes",
    baseHint: "Helps explain why a little toy can suddenly be everywhere: feeds, friends, videos, and bags.",
    hint: "No perfect prompt needed. Try: “my friends all have one,” “it’s ugly-cute,” “it’s expensive but I still want it,” or “I’m scared it’ll sell out.”",
    thinking: "typing",
    starters: ["Am I being influenced?", "It’s ugly but I keep looking", "My friends all have one", "I want one but it’s pricey"],
    welcome: [
      "Do not worry about sounding rational yet.",
      "Just tell me the messy version. Was it an unboxing, someone wearing it on a bag, or did it just wear you down after the fifth video?",
    ],
  },
};

const themes = [
  { name: "Feeling", zh: "先承认，心动是真的。", en: "The pull is probably real." },
  { name: "Scene", zh: "再看它是怎么反复出现的。", en: "Then notice how it kept showing up." },
  { name: "Pressure", zh: "分清喜欢，和怕晚一步。", en: "Separate liking from panic." },
  { name: "Choice", zh: "可以喜欢，也可以先不买。", en: "You can like it and still wait." },
];

const signalTerms = [
  "全渠道", "触点", "线下", "门店", "展会", "社群", "小红书", "微信", "晒图", "换款", "二级市场",
  "盲盒", "开箱", "开盒", "隐藏款", "抽", "限量", "售罄", "稀缺", "fomo", "截图", "保存", "配色",
  "明星", "网红", "博主", "同款", "lisa", "名人", "可信", "匹配", "人设",
  "情绪", "陪伴", "治愈", "投射", "身份", "风格", "挂包", "丑萌", "怪可爱", "顺眼",
  "算法", "推荐", "反复", "刷到", "种草", "跟风", "朋友", "都有",
  "omni", "channel", "touchpoint", "offline", "community", "posting", "trading", "resale",
  "blind", "unbox", "unboxing", "hidden", "rare", "scarcity", "sold", "limited", "expensive", "price",
  "celebrity", "influencer", "creator", "same", "same-item", "same item", "credibility", "trust", "match", "parasocial",
  "emotion", "comfort", "projection", "identity", "style", "bag", "bag charm", "bag-charm", "clip", "clips", "ugly", "cute", "weird",
  "algorithm", "feed", "repeated", "seeding", "trend", "friend", "friends", "everyone",
  "screenshot", "screenshots", "saving", "saved", "colorway", "colorways", "color", "colors",
];

const stopWords = new Set([
  "labubu", "the", "and", "you", "your", "that", "this", "with", "want", "like", "buy", "why",
  "what", "how", "does", "did", "can", "one", "all", "have", "feel", "feels", "thing",
  "still", "just", "keep", "keeps", "seeing", "videos", "video", "started", "start", "different",
  "after", "before", "there", "their", "they", "them", "more", "less", "really", "because",
]);

const signalSynonyms: Record<string, string[]> = {
  "开箱": ["开盒", "unboxing", "unbox"],
  "开盒": ["开箱", "unboxing", "unbox"],
  "盲盒": ["blind box", "blind-box"],
  "刷到": ["feed", "repeated exposure", "重复曝光"],
  "反复": ["repeated", "repeated exposure"],
  "朋友": ["friend", "friends", "peer"],
  "都有": ["friends", "everyone", "social identity"],
  "贵": ["expensive", "price"],
  "价格": ["price", "expensive", "resale"],
  "抢不到": ["sold out", "scarcity", "fomo"],
  "售罄": ["sold out", "scarcity"],
  "明星": ["celebrity", "same-item", "meaning transfer"],
  "博主": ["creator", "influencer", "credibility"],
  "网红": ["creator", "influencer", "credibility"],
  "挂包": ["bag", "bag charm", "bag-charm"],
  "情绪": ["emotion", "emotional projection"],
  "投射": ["projection", "emotional projection"],
  "截图": ["screenshot", "screenshots", "saving"],
  "保存": ["saved", "saving", "screenshots"],
  "配色": ["colorway", "colorways", "color"],
  "unbox": ["unboxing", "blind box"],
  "unboxing": ["unbox", "blind box", "开箱", "开盒"],
  "feed": ["repeated exposure", "刷到"],
  "friend": ["friends", "peer", "social identity"],
  "friends": ["friend", "peer", "social identity"],
  "expensive": ["price", "resale", "贵"],
  "price": ["expensive", "resale", "价格"],
  "celebrity": ["same-item", "meaning transfer", "明星"],
  "influencer": ["creator", "credibility", "博主"],
  "creator": ["influencer", "credibility", "博主"],
  "bag": ["bag charm", "bag-charm", "挂包"],
  "screenshot": ["screenshots", "saving", "截图"],
  "screenshots": ["screenshot", "saving", "截图"],
  "colorways": ["colorway", "color", "配色"],
};

function makeInitialMessages(lang: Lang): Message[] {
  return copy[lang].welcome.map((text, index) => ({
    id: `welcome-${lang}-${index}`,
    role: "assistant",
    text,
    image: index === 1 ? "/labubu/product-3.jpg" : undefined,
  }));
}

function hasRepeatedEnding(candidate: string, recentReplies: string[]) {
  const ending = candidate.split("\n\n").at(-1)?.trim() ?? candidate;
  if (ending.length < 14) return recentReplies.includes(candidate);
  return recentReplies.some((reply) => reply === candidate || reply.includes(ending));
}

function pickLine(lines: string[], input: string, turnCount: number, avoid: string[] = []) {
  let total = turnCount;
  for (const char of input) total += char.charCodeAt(0);
  const start = total % lines.length;
  for (let offset = 0; offset < lines.length; offset += 1) {
    const candidate = lines[(start + offset) % lines.length];
    if (!hasRepeatedEnding(candidate, avoid)) return candidate;
  }
  return lines[start];
}

function getUserSnippet(input: string, lang: Lang) {
  const cleaned = input.replace(/\s+/g, " ").trim();
  const limit = lang === "zh" ? 18 : 58;
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit)}...`;
}

function getInputSignals(input: string) {
  const lower = input.toLowerCase();
  const termSignals = signalTerms.filter((term) => lower.includes(term.toLowerCase()));
  const wordSignals = lower
    .match(/[a-z][a-z'-]{2,}/g)
    ?.filter((word) => !stopWords.has(word) && word.length > 3)
    .slice(0, 8) ?? [];
  const rawSignals = Array.from(new Set([...termSignals, ...wordSignals]));
  const expandedSignals = rawSignals.flatMap((signal) => [signal, ...(signalSynonyms[signal.toLowerCase()] ?? signalSynonyms[signal] ?? [])]);
  return Array.from(new Set(expandedSignals));
}

function getContextKey(question: string) {
  const englishScene = question.match(/^When (.*?), how can/i)?.[1];
  if (englishScene) return englishScene.toLowerCase();
  const chineseScene = question.match(/^当(.+?)时，/)?.[1];
  if (chineseScene) return chineseScene;
  return question.toLowerCase().replace(/[“”"'?.，。]/g, "").slice(0, 54);
}

function retrieveTextBaseContexts(input: string, lang: Lang) {
  const signals = getInputSignals(input);
  if (signals.length === 0) return [];

  const scored = labubuTextBase
    .map((item) => {
      const localQuestion = item.question[lang].toLowerCase();
      const localAnswer = item.answer[lang].toLowerCase();
      const localText = `${localQuestion} ${localAnswer}`;
      const allQuestion = `${item.question.zh} ${item.question.en}`.toLowerCase();
      const allText = `${localText} ${item.question.zh} ${item.answer.zh} ${item.question.en} ${item.answer.en}`.toLowerCase();
      let score = 0;
      const matchedSignals: string[] = [];
      for (const signal of signals) {
        const normalized = signal.toLowerCase();
        if (localQuestion.includes(normalized)) score += normalized.length > 4 ? 7 : 5;
        else if (localAnswer.includes(normalized)) score += normalized.length > 4 ? 5 : 3;
        else if (allQuestion.includes(normalized)) score += normalized.length > 4 ? 4 : 2;
        else if (allText.includes(normalized)) score += normalized.length > 4 ? 3 : 1;
        if (allText.includes(normalized)) matchedSignals.push(signal);
      }
      if (item.id >= 201) score += 2;
      else if (item.id >= 151) score += 1;
      return { item, score, matchedSignals: Array.from(new Set(matchedSignals)) };
    })
    .filter(({ score }) => score >= RETRIEVAL_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.item.id - b.item.id);

  const selected: typeof scored = [];
  const usedContextKeys = new Set<string>();
  for (const result of scored) {
    const key = getContextKey(result.item.question[lang]);
    if (usedContextKeys.has(key)) continue;
    selected.push(result);
    usedContextKeys.add(key);
    if (selected.length === RETRIEVAL_TOP_K) break;
  }
  if (selected.length < RETRIEVAL_TOP_K) {
    for (const result of scored) {
      if (selected.includes(result)) continue;
      selected.push(result);
      if (selected.length === RETRIEVAL_TOP_K) break;
    }
  }

  return selected.map(({ item, score, matchedSignals }) => ({
    id: item.id,
    score,
    question: item.question[lang],
    answer: item.answer[lang],
    matchedSignals,
  }));
}

function makeTextBaseReply(contexts: RetrievedContext[], input: string, lang: Lang, turnCount: number, recentReplies: string[]) {
  const isZh = lang === "zh";
  const said = getUserSnippet(input, lang);
  const primary = contexts[0];
  const secondary = contexts[1];
  const bridge = pickLine(isZh ? [
    `懂，你说的“${said}”不是一句空话。`,
    `我先不急着说你是不是想买。你这句“${said}”更像是在说一个具体画面。`,
    `这句我能接住。先不用给自己下结论。`,
  ] : [
    `I get what you mean by "${said}".`,
    `I would not jump straight to "you want one." "${said}" sounds more specific than that.`,
    `That makes sense. No need to decide what it means yet.`,
  ], input, turnCount, recentReplies);
  const followUp = pickLine(isZh ? [
    "你先想一个最早的画面就行：是刷到视频、看到朋友挂包上，还是某次开盒让你记住了？",
    "先别想买不买。哪一个画面让你停了一下？",
    "它是从哪里开始进你脑子的？一条视频，一个朋友，还是某张图？",
  ] : [
    "Start with the first scene you remember: a video, someone’s bag, or one unboxing that stuck?",
    "Forget buying for a second. What made you pause?",
    "Where did it first get into your head: a post, a friend, or one photo?",
  ], `${input}-${primary.id}`, turnCount, recentReplies);
  const mainPoint = makePlainContextPoint(primary, lang);
  const extraContext = secondary ? `\n\n${makePlainContextPoint(secondary, lang)}` : "";

  return `${bridge}\n\n${mainPoint}${extraContext}\n\n${followUp}`;
}

function contextIncludes(context: RetrievedContext, terms: string[]) {
  const haystack = `${context.question} ${context.answer} ${context.matchedSignals.join(" ")}`.toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function makePlainContextPoint(context: RetrievedContext, lang: Lang) {
  const isZh = lang === "zh";

  if (contextIncludes(context, ["friend", "friends", "peer", "social", "朋友", "都有", "同学", "同事"])) {
    return isZh
      ? "如果身边人都在晒，它就不只是一个玩偶了。它会变成一个大家都懂的小话题。你可能不是非要买，只是开始好奇：为什么他们都在聊这个？"
      : "If people around you keep showing it, it stops feeling like a random toy. It becomes a little shared topic. You may not want to buy one. You may just be wondering why everyone keeps talking about it.";
  }

  if (contextIncludes(context, ["unbox", "blind", "hidden", "rare", "开箱", "开盒", "盲盒", "隐藏款"])) {
    return isZh
      ? "开盒视频很容易让人看下去，因为它有一点点悬念。你可能本来只是想看看，结果看着看着就想知道下一盒会开出什么。"
      : "Unboxing videos are easy to keep watching because there is a tiny surprise built in. You may start out just looking, then end up wanting to see what comes out next.";
  }

  if (contextIncludes(context, ["sold", "limited", "scarcity", "fomo", "price", "expensive", "售罄", "限量", "抢不到", "贵", "价格"])) {
    return isZh
      ? "难买、涨价、售罄这些东西会把人弄急。原本只是“我喜不喜欢”，很容易变成“等一下，我是不是要错过了”。"
      : "When something looks hard to get, it can make the whole thing feel more urgent. The question can shift from “do I even like this?” to “wait, am I going to miss it?”";
  }

  if (contextIncludes(context, ["celebrity", "influencer", "creator", "lisa", "明星", "博主", "网红"])) {
    return isZh
      ? "明星或博主带它的时候，效果通常不是“快去买”。更像是：哦，原来这个小东西挂在包上还挺会搭。"
      : "When a celebrity or creator carries it, the effect is usually quieter than “go buy this.” It is more like: oh, that odd little thing actually works with an outfit.";
  }

  if (contextIncludes(context, ["algorithm", "feed", "repeated", "刷到", "推荐", "反复", "算法"])) {
    return isZh
      ? "一直刷到真的会改变感觉。第一次可能只是路过，后面越看越眼熟，就会开始觉得它好像已经在你的世界里了。"
      : "Seeing it again and again really can change the feeling. At first it is just there. After a while it starts to feel familiar, almost like it has already been in your world.";
  }

  if (contextIncludes(context, ["bag", "style", "identity", "挂包", "包上", "风格", "穿搭", "身份"])) {
    return isZh
      ? "它挂在包上以后，就不像一个放在柜子里的玩具了。它会变成穿搭的一部分，别人也会看见。"
      : "Once it is clipped to a bag, it is not just a toy on a shelf. It becomes part of someone’s look, and other people can see it.";
  }

  if (contextIncludes(context, ["ugly", "cute", "weird", "丑", "怪", "丑萌", "可爱"])) {
    return isZh
      ? "它就是怪得很明显。有人会觉得丑，有人会觉得越看越可爱。这个分裂感本身就让人记得住。"
      : "It is weird in a very obvious way. Some people think it is ugly. Some people start finding it cute. That split reaction is part of why it sticks.";
  }

  return isZh
    ? "简单说，它不是突然让人上头的。通常是先看见几次、记住一个画面、再看到别人怎么用，感觉才慢慢变了。"
    : "Put simply: it usually does not hit all at once. You see it a few times, remember one image, then notice how other people use it. The feeling changes slowly.";
}

function isLabubuIntroQuestion(input: string) {
  const value = input.toLowerCase();
  const mentionsLabubu = value.includes("labubu") || value.includes("拉布布");
  if (!mentionsLabubu) return false;

  return [
    /\bwhat\s+is\s+(a\s+)?labubu\b/,
    /\bwho\s+is\s+labubu\b/,
    /\btell me about labubu\b/,
    /\bexplain labubu\b/,
    /\bi (do not|don't|dont) know\b.*\blabubu\b/,
    /\bknow anything about (it|labubu)\b/,
    /labubu.*是什么/,
    /什么是.*labubu/,
    /介绍.*labubu/,
    /不了解.*labubu/,
    /不知道.*labubu/,
  ].some((pattern) => pattern.test(value));
}

function makeLabubuIntroReply(lang: Lang) {
  return lang === "zh"
    ? "Labubu（拉布布）是香港艺术家龙家升创作的小怪兽角色，属于 The Monsters 系列。后来 POP MART 把它做成盲盒、公仔和包挂，所以这两年在网上特别常见。\n\n它长得很有记忆点：大耳朵、尖牙、毛茸茸的身体，还有一点乱糟糟的表情。很多人第一眼会觉得：这是什么？但看多了开箱、包挂照片、明星同款或者朋友晒图，又会开始懂它为什么火。\n\n这个 chatbox 不是商店，也不是来劝你买。它只是陪你看一件事：一个人怎么从“完全不了解”，慢慢变成“怎么到处都是它”。"
    : "Labubu is a little monster character created by Hong Kong artist Kasing Lung. It is part of The Monsters series, and POP MART later turned it into blind boxes, figures, and bag charms. That is why it has been showing up everywhere online.\n\nThe look is hard to forget: big ears, sharp teeth, a furry body, and a messy little expression. A lot of people first react with, wait, what is that? But after seeing unboxings, bag photos, celebrity posts, or friends showing it off, it starts to make more sense.\n\nThis chatbox is not a store, and it is not trying to talk you into buying one. It is just here to follow the feeling of going from “I know nothing about this” to “why am I seeing it everywhere?”";
}

function createReply(input: string, lang: Lang, turnCount: number, recentReplies: string[] = []): ReplyResult {
  const intent = classifyUserIntent(input);
  const guardedReply = makeIntentGuardReply(intent, lang, input);
  if (guardedReply) {
    return {
      text: guardedReply,
      retrieved: [],
      route: `intent:${intent}`,
      intent,
    };
  }

  if (isLabubuIntroQuestion(input)) {
    return {
      text: makeLabubuIntroReply(lang),
      retrieved: [],
      route: "labubu-intro",
      intent,
    };
  }

  const retrieved = retrieveTextBaseContexts(input, lang);
  if (retrieved.length > 0) {
    return {
      text: makeTextBaseReply(retrieved, input, lang, turnCount, recentReplies),
      retrieved,
      route: "text-base",
      intent,
    };
  }

  return {
    text: createFallbackReply(input, lang, turnCount, recentReplies),
    retrieved,
    route: "hard-coded fallback",
    intent,
  };
}

function createFallbackReply(input: string, lang: Lang, turnCount: number, recentReplies: string[] = []): string {
  const value = input.toLowerCase();
  const isZh = lang === "zh";
  const said = getUserSnippet(input, lang);
  const has = (words: string[]) => words.some((word) => value.includes(word));
  const choose = (lines: string[]) => pickLine(lines, input, turnCount, recentReplies);

  if (has(["贵", "价格", "钱", "买不起", "expensive", "price", "cost", "money", "overpriced"])) {
    return choose(isZh ? [
      `你说“${said}”，那价格确实是一个很现实的阻力。\n\n先不用把它解释成喜欢或不喜欢。可以先问：这个价格让你在意的是预算，还是觉得热度把它抬得太高？`,
      `“${said}”这句更像是在做边界判断。\n\n可以先不付款，也不需要证明自己真的心动。过两天如果还想继续了解，再看是哪一只、哪种场景让你在意。`,
      `如果你的纠结点是“${said}”，那可以先把两件事分开：东西本身值不值得看，和现在的价格气氛是不是让人有压力。`
    ] : [
      `When you say "${said}", it sounds like the price is the annoying part.\n\nYou do not have to turn that into a deep meaning. Is it too expensive, or does it just feel overpriced because everyone is hyping it up?`,
      `"${said}" sounds like you are checking your limit.\n\nThat is fair. You can leave it alone for a couple days and see if you still care.`,
      `If "${said}" is the sticking point, keep it simple: maybe the toy is interesting, but the price still feels ridiculous. Both can be true.`
    ]);
  }

  if (has(["犹豫", "纠结", "要不要", "不知道", "unsure", "confused", "hesitant", "not sure"])) {
    return choose(isZh ? [
      `你说“${said}”，那就先把它放在“不确定”里，不急着推成心动。\n\n如果你愿意拆一下，可以看是哪个场景让你开始注意它。`,
      `“${said}”更像是在观察自己的反应。\n\n先抓一个最早的画面就行：哪一刻你停下来多看了一眼？`,
      `别把这件事搞成消费决策报告。就从“${said}”这句话往回看：它是从哪里进入你视线的？`
    ] : [
      `When you say "${said}", I would just call that unsure.\n\nWhat made you notice it first?`,
      `"${said}" sounds like you are watching your own reaction.\n\nStart with the first image or post that made you pause.`,
      `Do not turn "${said}" into a whole decision spreadsheet. Just trace it back: where did Labubu first show up for you?`
    ]);
  }

  if (has(["抢不到", "排队", "售罄", "sold out", "drop", "queue", "line", "restock"])) {
    return choose(isZh ? [
      `你提到“${said}”，这就不是单纯审美了，已经有一点和库存赛跑的感觉。\n\n先慢一拍：如果它一直有货，你还会这么急吗？`,
      `“${said}”这种话很容易把人推快。你本来在想喜不喜欢，下一秒就变成我会不会错过。冲动通常就是从这一步开始的。`,
      "售罄会自动给东西加滤镜。越难买，越像值得买。把这个滤镜拿掉试试：如果它一直有货，你还会想要同一只吗？"
    ] : [
      `When you say "${said}", it sounds less like pure taste and more like racing the stock.\n\nIf it were always available, would you still feel this rushed?`,
      `"${said}" is the kind of thought that speeds everything up. Suddenly it is not do I like this, it is am I too late?`,
      "Sold out adds a filter. The harder it is to get, the more it starts looking worth getting. If it were always available, would you still want this exact one?"
    ]);
  }

  if (value.includes("fomo") || value.includes("错失") || value.includes("稀缺") || value.includes("限量")) {
    return choose(isZh ? [
      "嗯，这就是那种“怕晚一步”的感觉。可能不是你突然更喜欢它了，是限量、隐藏款、售罄把你的大脑按到了加速键。\n\n如果它明天还买得到，你还会这么急吗？",
      "我懂那一下。刷到别人开箱，心里突然紧一下，好像大家都已经进场了，就你还在门口。",
      "这不代表你不理性。稀缺本来就会制造紧张感。先把“怕买不到”和“真的喜欢这个款”分开放，脑子会清楚一点。"
    ] : [
      "Yeah, that sounds like the \"what if I miss it?\" button got pressed. When something feels hard to get, your brain can rush before you even know if you like it.\n\nIf it were still easy to buy tomorrow, would you feel this rushed?",
      "I know that little stomach drop from watching someone else unbox it. It can feel like everyone already got into the moment and you are still outside.",
      "This does not mean you are being irrational. Hard-to-get stuff is designed to make waiting feel risky. Try splitting it in two: I like this one, and I am scared it will disappear."
    ]);
  }

  if (has(["刷到", "推荐", "算法", "小红书", "抖音", "视频", "信息茧房", "一直看到", "attention", "algorithm", "tiktok", "instagram", "reels", "feed", "recommended", "for you"])) {
    return choose(isZh ? [
      `你说“${said}”，这个就很像平台在替 Labubu 刷存在感。你点开一次、停留一下，后面它就更常出现。\n\n它不是突然变成你的兴趣，是你的注意力被它占了好几次。`,
      "反复刷到真的会改变感觉。第一次只是路过，第三次开始眼熟，第五次就像它已经在你的世界里待了一阵子了。",
      "算法最会做的一件事，就是把“我只是看了一眼”慢慢变成“我好像一直都挺感兴趣”。Labubu 很适合这种循环，因为它有图、有开箱、有稀缺，还有一堆人在评论区尖叫。"
    ] : [
      `When you say "${said}", it sounds like the app kept serving it to you. You pause once, maybe click once, and then it comes back again.\n\nThat does not mean it became your taste overnight. It just got more chances to sit in your head.`,
      "Repeated exposure changes the feeling. First time, you scroll past. Third time, it looks familiar. Fifth time, it feels like it has been in your world for a while.",
      "The app is good at turning \"I looked once\" into \"why is this everywhere now?\" Labubu works well for that because it has pictures, unboxings, and very loud comment sections."
    ]);
  }

  if (value.includes("盲盒") || value.includes("开箱") || value.includes("隐藏") || value.includes("抽") || value.includes("blind") || value.includes("unbox") || value.includes("rare") || value.includes("secret")) {
    return choose(isZh ? [
      `你说“${said}”，这就很像被开箱内容带进去了。它不是普通购物，是一个小悬念：盒子还没开，大脑已经开始想“万一呢”。`,
      "盲盒厉害就厉害在答案来得很晚。盒子还没开，大脑已经开始替你幻想隐藏款了。",
      `如果是“${said}”戳到你，那你想要的可能不只是玩偶，是那个揭晓瞬间。看多了真的会想亲自拆一次。`
    ] : [
      `When you say "${said}", the opening-the-box part matters. It is a tiny surprise, even before you care about the toy itself.`,
      "Blind boxes delay the answer. Before the box is even open, your brain is already whispering, what if it is the rare one?",
      `If "${said}" is what caught you, maybe the fun is the reveal as much as the toy.`
    ]);
  }

  if (has(["情绪价值", "陪伴", "安慰", "治愈", "ip", "角色", "挂包", "包上", "风格", "身份", "comfort", "emotional", "character", "identity", "style", "bag charm"])) {
    return choose(isZh ? [
      `你说“${said}”，这就不只是买一个玩偶了。它更像一个可以带出门的小情绪出口，挂在包上，别人也能看见。`,
      "Labubu 这种 IP 最会把“我喜欢一个东西”变成“这有点像我”。它不是安静放在柜子里，而是跟穿搭、包、照片一起出现。",
      "情绪价值这块很真实。很多人不是需要一个玩具，而是需要一个小小的、能被看见的可爱东西，证明自己还有一点玩心。"
    ] : [
      `When you say "${said}", it sounds less like “I need a toy” and more like “this little thing matches my mood.”`,
      "Labubu is not just sitting on a shelf for a lot of people. It shows up on bags, in outfits, and in photos, so it starts to feel personal.",
      "Sometimes people do not want a toy exactly. They want a small silly thing that makes a very normal day feel less boring."
    ]);
  }

  if (value.includes("lisa") || value.includes("明星") || value.includes("网红") || value.includes("博主") || value.includes("celebrity") || value.includes("influencer")) {
    return choose(isZh ? [
      "Lisa 或博主最厉害的不是说“快去买”。她们只是把它挂在那里，拍得很好看，然后你心里就会冒一句：原来这东西还能这么搭。",
      "这种种草最自然，因为它不像广告。Labubu 在 vlog 里一闪而过，挂在包上晃一下，反而更像真实审美。",
      "朋友或明星一戴，它就从“奇怪小玩具”变成“好像还挺有风格”。你不一定是在复制她们，可能只是被那个搭配方式说服了。"
    ] : [
      "The celebrity effect is not always “she has it, so I need it.” Sometimes it is quieter. She clips it on a bag, it looks good, and suddenly the object makes sense.",
      "It works best when it does not look like an ad. A Labubu swinging from a bag in a vlog can do more than a whole sales post.",
      "Once someone stylish wears it well, it stops looking like a random toy and starts looking like a style move. You may not want her exact life. You may just like the styling."
    ]);
  }

  if (value.includes("真假") || value.includes("假") || value.includes("lafufu") || value.includes("fake") || value.includes("real")) {
    return isZh
      ? "真假这个话题也很会把人带进去。你本来只是想看看，结果开始学怎么数牙齿、看脚底 logo、分 Lafufu。\n\n一旦你开始懂这些暗号，就很容易觉得自己已经半只脚进圈了。"
      : "The fake-versus-real rabbit hole pulls people in fast. You start out casually looking, then suddenly you know about teeth counts, foot logos, and Lafufu clues.\n\nOnce you know those little details, it starts feeling like you are halfway inside the world of it.";
  }

  if (has(["丑", "怪", "丑萌", "顺眼", "越看", "ugly", "weird", "strange", "growing on", "grew on"])) {
    return choose(isZh ? [
      "对，它就是那种第一眼“什么东西”，第二眼“有点意思”，第三眼开始认真看颜色的丑萌。",
      "哈哈我懂。它不是甜甜乖乖的可爱，所以反而有记忆点。那个小坏笑很容易让人越看越顺眼。",
      "你可能不是被“漂亮”打动，是被它那个有点怪、有点欠欠的性格感打动。太完美的可爱有时候真的会无聊。"
    ] : [
      "That reaction makes sense. Labubu is supposed to look a little strange. Some people find that cute, and some people just find it weird.",
      "I get the tension. It is not sweet in a perfect way, which is exactly why people either warm up to it or bounce off it.",
      "The weird face is doing a lot of the work. It can make people love it, but it can also be the exact reason someone hates it."
    ]);
  }

  if (value.includes("成人") || value.includes("可爱") || value.includes("童年") || value.includes("kidult") || value.includes("kidulthood") || value.includes("cute")) {
    return choose(isZh ? [
      "这个我觉得很真实。它不是那种乖乖甜甜的可爱，所以成年人喜欢也不太尴尬。像是在说：我很累，但我还想留一点玩心。",
      "你被可爱吸引很正常。很多人不是想装小孩，只是想在紧绷的生活里留个软一点的出口。",
      "它有点像能带出门的小安慰物。不是藏在房间里的玩偶，而是挂在包上跟你一起走。这个差别蛮大的。"
    ] : [
      "That feels real. It is not perfectly sweet, so liking it as an adult does not feel too precious. It is more like: I am tired, but I still want one playful little thing.",
      "Being drawn to cute stuff does not mean you are trying to be childish. Sometimes you just want a soft little outlet in an otherwise tense day.",
      "It is almost a comfort object you can take outside. Not a plush hidden at home, but something clipped to your bag."
    ]);
  }

  if (value.includes("社交") || value.includes("朋友") || value.includes("大家") || value.includes("都有") || value.includes("身边") || value.includes("trend") || value.includes("everyone") || value.includes("all have") || value.includes("social")) {
    return choose(isZh ? [
      `如果你说的是“${said}”这种感觉，那它已经不只是玩偶了，更像一个大家都在用的小暗号。你不一定是想跟风，可能是不想被留在话题外面。`,
      "身边人都有的时候，东西会突然变得很难忽略。它不是变好看了三倍，是你开始反复看到它，反复被提醒。",
      "这种心动有一部分来自热闹。别人挂在包上、聊天时提到、评论区一直刷，Labubu 就从商品变成了一个可以加入的话题。"
    ] : [
      `If "${said}" is the feeling, then it is not just about the toy. It is more like everyone has a tiny shared reference, and you do not want to be outside it.`,
      "When people around you all have one, it gets hard to ignore. The object did not magically become three times cuter; you are just seeing it everywhere.",
      "Part of the pull is the stuff around it: bags, unboxings, comments, friends mentioning it. After a while, having one can feel like joining the conversation."
    ]);
  }

  if (has(["被种草", "种草", "influenced", "influence"])) {
    return choose(isZh ? [
      "是有点被种草了，但这不丢人。内容本来就是这样工作的：先让你看见，再让你记住，最后让你觉得“要不我也”。",
      "像是慢慢被推过去的。不是某一秒突然想买，是刷到几次、记住了、又看到别人有，然后它开始变得跟你有关。",
      "有种草的成分。但我不会直接说你只是跟风，因为你可能也是真的喜欢。更准确的问题是：你喜欢它多少，喜欢那个热闹又是多少？"
    ] : [
      "Yes, maybe a little. But that is not some personal failure. You saw it, remembered it, saw it again, and at some point your brain went, wait, maybe me too.",
      "It sounds gradual. You saw it, remembered it, saw other people with it, and then it started feeling weirdly relevant to you.",
      "There is influence here. I would not call it mindless following, though. You might like the toy, and you might also like the buzz around it. Both can be happening."
    ]);
  }

  if (value.includes("为什么") || value.includes("喜欢") || value.includes("want") || value.includes("like") || value.includes("buy")) {
    return choose(isZh ? [
      `你说“${said}”，我会先看它是怎么从内容里出现的，而不是直接推到“必须买”。\n\n你是在问它为什么会有存在感，还是在说自己已经有点喜欢？`,
      `“${said}”可以拆成几个阶段：第一次注意到、反复看到、看到别人怎么用，然后才可能变成个人判断。你现在更像在哪一步？`,
      `如果从“${said}”往下看，可以先分清：你是在研究这个现象，还是确实被某个造型、视频或社交场景打动了？`
    ] : [
      `When you say "${said}", I would not jump straight to "you must want it."\n\nAre you asking why it is everywhere, or are you saying it has started to grow on you?`,
      `"${said}" might just mean you are noticing it more. Did it start with a video, a photo, or seeing someone actually use it?`,
      `With "${said}", there are two different things: being curious about the hype, and personally liking it. Which one feels closer?`
    ]);
  }

  if (value.includes("理性") || value.includes("判断") || value.includes("decision") || value.includes("rational") || value.includes("should")) {
    return choose(isZh ? [
      "可以理性，也可以不喜欢。先等 48 小时。两天后如果你还想继续了解，再看是哪个具体点留下来了。",
      "别先问该不该买，先问你在评估哪一部分：造型、稀缺、朋友也有，还是开箱那一下？如果主要是后面几个，就先缓缓。",
      "理性不等于不能喜欢。可以喜欢，也可以先不买。给自己一个小规则：只买具体喜欢的款，不为了隐藏款一直加购。"
    ] : [
      "You can be rational, and you can also simply dislike it. Wait 48 hours. If you still want to understand it, notice which specific part stayed with you.",
      "Do not start with should I buy it. Ask what part you are reacting to: the look, the hard-to-get feeling, your friends having it, or the unboxing videos.",
      "Being rational does not mean killing the fun. You can like it and still wait. A decent rule: buy a specific one you actually want, not endless boxes chasing a rare pull."
    ]);
  }

  if (value.includes("消费") || value.includes("环保") || value.includes("浪费") || value.includes("plastic") || value.includes("waste") || value.includes("sustainable")) {
    return isZh
      ? "这个角度挺重要，但也别一下变成自责。喜欢可爱的东西没问题，只是如果买完很快闲置，那就可以先停一下。\n\n问自己一句：半年后它还会让我开心吗？还是它只是帮我追上这周的流行？"
      : "That is worth thinking about, but do not turn it into self-blame. Liking cute things is fine. If it might just sit there after the hype fades, pause.\n\nAsk yourself: will this still make me happy in six months, or is it just helping me catch this week’s trend?";
  }

  if (value.includes("身份") || value.includes("风格") || value.includes("identity") || value.includes("style")) {
    return isZh
      ? "对，Labubu 很容易变成风格的一部分。它不是安静放在柜子里的玩偶，是会挂在包上、出现在照片里、和穿搭一起被看到的东西。\n\n所以你想要的可能不只是玩具，也可能是“我也可以有这种风格”的感觉。"
      : "Yes, Labubu can become part of a look. It is not only a toy on a shelf. It hangs on a bag, shows up in photos, and gets seen with the outfit.\n\nSo sometimes people are reacting to the styling, not just the toy.";
  }

  return choose(isZh ? [
    `“${said}”这句话里最有用的不是 Labubu 本身，是你被哪种场景戳到了。是刷到太多次，还是某个人带着它的时候特别好看？`,
    `我先顺着你这句“${said}”聊。你现在更像是在观察这个现象，还是在讲自己的反应？`,
    `这个我能接住。你不用先解释得很完整，直接想一下：它是从哪个内容场景进入你视线的？`
  ] : [
    `"${said}" gives me something to work with. Did it start from seeing it too many times, or from one person making it look good?`,
    `Going off "${said}", are you observing the media phenomenon, or describing your own reaction to it?`,
    `I can work with that. You do not have to explain it perfectly. Which content scene first put it in front of you?`
  ]);
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [messages, setMessages] = useState<Message[]>(() => makeInitialMessages("en"));
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const pendingReply = useRef<number | null>(null);
  const t = copy[lang];

  const latestIntent = useMemo<UserIntent>(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const intent = messages[index].intent;
      if (intent) return intent;
    }
    return "other";
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pendingReply.current !== null) window.clearTimeout(pendingReply.current);
    };
  }, []);

  const latestScore = useMemo(() => {
    if (latestIntent === "explicit-dislike" || latestIntent === "refusal" || latestIntent === "frustration-correction") {
      return 8;
    }
    const userMessages = messages.filter((message) => message.role === "user").length;
    return Math.min(92, 28 + userMessages * 13);
  }, [latestIntent, messages]);

  const profileValue = useMemo(() => {
    if (latestIntent === "frustration-correction") return lang === "zh" ? "收到：你不是心动" : "Got it: not into it";
    if (latestIntent === "explicit-dislike") return lang === "zh" ? "明确不喜欢" : "Clearly not into it";
    if (latestIntent === "refusal") return lang === "zh" ? "明确不想购买" : "Clearly not buying";
    if (latestIntent === "uncertainty") return lang === "zh" ? "不确定，正在观察" : "Unsure, still sorting it out";
    if (latestIntent === "positive-interest") return lang === "zh" ? "有兴趣，但不等于必须买" : "Interested, not automatically buying";
    return t.profileValue;
  }, [lang, latestIntent, t.profileValue]);

  function toggleLang() {
    if (pendingReply.current !== null) window.clearTimeout(pendingReply.current);
    const nextLang = lang === "zh" ? "en" : "zh";
    setLang(nextLang);
    setMessages(makeInitialMessages(nextLang));
    setDraft("");
    setIsTyping(false);
  }

  function reset() {
    if (pendingReply.current !== null) window.clearTimeout(pendingReply.current);
    setMessages(makeInitialMessages(lang));
    setDraft("");
    setIsTyping(false);
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    const turnCount = messages.filter((message) => message.role === "user").length;
    const now = Date.now();
    setMessages((current) => {
      return [
        ...current,
        { id: `user-${now}`, role: "user", text: trimmed },
      ];
    });
    setDraft("");
    setIsTyping(true);
    pendingReply.current = window.setTimeout(() => {
      setMessages((current) => {
        const reply = createReply(
            trimmed,
            lang,
            turnCount,
            current.filter((message) => message.role === "assistant").slice(-4).map((message) => message.text),
        );
        console.info("[Labubu retrieval]", {
          input: trimmed,
          intent: reply.intent,
          route: reply.route,
          retrieved: reply.retrieved.map((item) => ({
            id: item.id,
            score: item.score,
            matchedSignals: item.matchedSignals,
            question: item.question,
          })),
        });
        return [
          ...current,
          {
            id: `assistant-${now}`,
            role: "assistant",
            text: reply.text,
            retrieved: reply.retrieved,
            route: reply.route,
            intent: reply.intent,
            image: shouldSuppressProductImage(reply.intent) ? undefined : turnCount % 3 === 1 ? "/labubu/product-8.jpg" : undefined,
          },
        ];
      });
      setIsTyping(false);
      pendingReply.current = null;
    }, 520);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
  }

  return (
    <main className="chat-shell">
      <header className="chat-topbar">
        <a className="brand" href="#chat">
          <span className="brand-mark">L</span>
          <span>LABUBU CHATBOX</span>
        </a>
        <div className="topbar-actions">
          <span className="live-pill"><i /> {t.status}</span>
          <button type="button" onClick={toggleLang}>{t.switchLang}</button>
          <button type="button" onClick={reset}>{t.reset}</button>
        </div>
      </header>

      <section className="chat-layout" id="chat">
        <aside className="insight-panel" aria-label={t.panelTitle}>
          <div className="mini-hero">
            <img src="/labubu/product-11.jpg" alt="" />
            <div>
              <span>{t.profile}</span>
              <strong>{profileValue}</strong>
            </div>
          </div>
          <div className="score-card">
            <span>{lang === "zh" ? "当前感觉" : "Current pull"}</span>
            <strong>{latestScore}%</strong>
            <i><b style={{ width: `${latestScore}%` }} /></i>
          </div>
          <div className="score-card knowledge-card">
            <span>{t.baseLabel}</span>
            <strong>{labubuTextBase.length}</strong>
            <em>{t.baseValue}</em>
            <small>{t.baseHint}</small>
          </div>
          <h2>{t.panelTitle}</h2>
          <div className="theme-list">
            {themes.map((theme) => (
              <article key={theme.name}>
                <span>{theme.name}</span>
                <strong>{lang === "zh" ? theme.zh : theme.en}</strong>
              </article>
            ))}
          </div>
          <p className="hint">{t.hint}</p>
        </aside>

        <section className="chat-card" aria-label={t.title}>
          <div className="chat-heading">
            <div>
              <p>{t.lang}</p>
              <h1>{t.title}</h1>
              <span>{t.subtitle}</span>
            </div>
          </div>

          <div className="message-list">
            {messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <div className="avatar">{message.role === "assistant" ? "L" : t.userAvatar}</div>
                <div className="bubble">
                  {message.image ? <img src={message.image} alt="" /> : null}
                  <p>{message.text}</p>
                </div>
              </article>
            ))}
            {isTyping ? (
              <article className="message assistant typing">
                <div className="avatar">L</div>
                <div className="bubble typing-bubble" aria-label={t.thinking}>
                  <span>{t.thinking}</span>
                  <i />
                  <i />
                  <i />
                </div>
              </article>
            ) : null}
          </div>

          <div className="starter-row" aria-label="starter questions">
            {t.starters.map((starter) => (
              <button type="button" key={starter} onClick={() => sendMessage(starter)}>
                {starter}
              </button>
            ))}
          </div>

          <form className="composer" onSubmit={onSubmit}>
            <label htmlFor="chat-input">Message</label>
            <input
              id="chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t.input}
            />
            <button type="submit" disabled={isTyping}>{t.send}</button>
          </form>
        </section>
      </section>
    </main>
  );
}
