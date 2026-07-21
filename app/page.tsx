"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Lang = "zh" | "en";
type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  image?: string;
};

const copy = {
  zh: {
    title: "LABUBU 种草 Chatbox",
    subtitle: "像和朋友聊天一样，说说你为什么被 Labubu 吸引。",
    status: "在线模拟",
    lang: "中文",
    switchLang: "EN",
    reset: "清空",
    userAvatar: "你",
    input: "比如：为什么我会突然想买 Labubu？",
    send: "发送",
    panelTitle: "对话主题",
    profile: "当前画像",
    profileValue: "正在被内容种草的浏览者",
    hint: "你可以随便聊：想买、犹豫、跟风、喜欢可爱东西，或者只是好奇。我会帮你把这种感觉拆开看。",
    thinking: "正在想怎么回你",
    starters: ["我是不是被种草了？", "盲盒开箱为什么上头？", "Lisa 和网红为什么有影响？", "我想买但又有点犹豫"],
    welcome: [
      "嗨，先说清楚：这里不是商店，也不是让 Labubu 本人跟你聊天。",
      "你可以直接讲你的真实想法，比如“我好像被种草了”“我只是觉得它可爱”“我怕买不到”。我会像朋友一样陪你拆一下：这份想要是从哪里来的。",
    ],
  },
  en: {
    title: "LABUBU Seeding Chatbox",
    subtitle: "Talk through why Labubu is starting to feel tempting.",
    status: "Live simulation",
    lang: "English",
    switchLang: "中文",
    reset: "Reset",
    userAvatar: "You",
    input: "Example: Why do I suddenly want a Labubu?",
    send: "Send",
    panelTitle: "Conversation themes",
    profile: "Current profile",
    profileValue: "Viewer being influenced by media content",
    hint: "You can be honest here: curious, tempted, unsure, influenced by friends, or just into cute things. I will help unpack the feeling.",
    thinking: "Thinking about that",
    starters: ["Am I getting influenced?", "Why are unboxings so satisfying?", "Why do Lisa and influencers matter?", "I want one but feel unsure"],
    welcome: [
      "Hey, quick note: this is not a shop, and you are not chatting with Labubu as a character.",
      "Just say what you actually feel, like “I think I’m being influenced,” “it’s just cute,” or “I’m scared it’ll sell out.” I’ll help unpack where that feeling is coming from.",
    ],
  },
};

const themes = [
  { name: "Emotion", zh: "情绪安慰", en: "Cute content can feel like stress relief, so desire starts as comfort instead of shopping." },
  { name: "Identity", zh: "身份认同", en: "Personal style makes the toy feel like a way to describe yourself." },
  { name: "Community", zh: "社群影响", en: "Seeing others post, save, and discuss it makes the trend feel normal and shared." },
  { name: "FOMO", zh: "错失焦虑", en: "Scarcity cues make waiting feel risky, even before you decide whether you truly like it." },
];

function makeInitialMessages(lang: Lang): Message[] {
  return copy[lang].welcome.map((text, index) => ({
    id: `welcome-${lang}-${index}`,
    role: "assistant",
    text,
    image: index === 1 ? "/labubu/product-3.jpg" : undefined,
  }));
}

function pickLine(lines: string[], input: string, turnCount: number) {
  let total = turnCount;
  for (const char of input) total += char.charCodeAt(0);
  return lines[total % lines.length];
}

function createReply(input: string, lang: Lang, turnCount: number): string {
  const value = input.toLowerCase();
  const isZh = lang === "zh";

  if (value.includes("fomo") || value.includes("错失") || value.includes("稀缺") || value.includes("限量")) {
    return pickLine(isZh ? [
      "嗯，这个就是最典型的“怕晚一步”。你可能不是突然更喜欢它了，而是看到限量、售罄、隐藏款之后，大脑开始把“想要”翻译成“再不下手就没了”。\n\n可以先问自己一句：如果它明天还买得到，我还会这么急吗？",
      "我懂，这种感觉很像刷到别人开箱后心里一紧：好像大家都已经进场了，只剩自己还没跟上。FOMO 厉害的地方就在这里，它让你害怕错过的不只是玩具，还有那种“我也参与了”的感觉。",
      "这不一定说明你不理性。稀缺提示本来就很会制造紧张感。先把“我怕买不到”和“我真的喜欢这个款”分开看，会清楚很多。"
    ] : [
      "Yeah, that sounds like classic “what if I miss it?” pressure. You may not suddenly like it more; the sold-out drops and rare variants make your brain treat waiting as a risk.\n\nA useful test: if it were still available tomorrow, would you feel this urgent?",
      "I get it. Seeing other people unbox or save one can make it feel like everyone already joined the moment except you. FOMO works because it is not only about the object; it is about being part of the moment.",
      "That does not mean you are irrational. Scarcity cues are designed to feel tense. Try separating “I’m afraid it’ll disappear” from “I truly love this exact one.”"
    ], input, turnCount);
  }

  if (value.includes("盲盒") || value.includes("开箱") || value.includes("隐藏") || value.includes("抽") || value.includes("blind") || value.includes("unbox") || value.includes("rare") || value.includes("secret")) {
    return pickLine(isZh ? [
      "对，开箱真的很容易上头，因为它不是普通购物，更像拆一个小悬念。你买到的不是“确定的 Labubu”，而是“也许会抽到特别款”的可能性。\n\n所以视频才好看：观众也在等那个揭晓瞬间。",
      "盲盒厉害的地方是，它把结果延迟了。你还没看到里面是什么，大脑就已经开始想象“万一是隐藏款呢”。这份想象本身就很有吸引力。",
      "我觉得开箱内容最会种草的一点是：就算你本来没想买，看多了也会开始想体验一次那个揭晓瞬间。它卖的是玩具，也是反应。"
    ] : [
      "Exactly. Unboxing is satisfying because it is not just shopping; it is a tiny suspense story. You are buying the possibility of getting something special.\n\nThat is why the videos work: viewers wait for the reveal too.",
      "Blind boxes delay the answer. Before you even know what is inside, your brain starts imagining the rare pull. That little “maybe” is powerful.",
      "The strongest part of unboxing content is that even if you did not plan to buy one, you may start wanting to experience the reveal yourself. It sells the toy and the reaction."
    ], input, turnCount);
  }

  if (value.includes("lisa") || value.includes("明星") || value.includes("网红") || value.includes("博主") || value.includes("celebrity") || value.includes("influencer")) {
    return pickLine(isZh ? [
      "Lisa 或博主的影响不是“她买了所以你必须买”，更像是她们先帮 Labubu 赋予了一种氛围：酷、可爱、有品味、懂潮流。\n\n你看到的其实不是一个挂件，是一种被示范出来的生活方式。",
      "网红种草最自然的地方是，它看起来不像广告。Labubu 挂在包上、出现在 vlog 里、被轻轻带过，反而更像真实生活里的审美选择。",
      "我懂你说的这种影响。朋友或明星一戴，它就从“奇怪小玩具”变成“原来这样搭还挺好看”。这就是品味转移。"
    ] : [
      "Lisa or creators do not influence people by saying “buy this.” They give Labubu a mood first: stylish, cute, playful, in-the-know.\n\nYou are not only seeing a charm; you are seeing a lifestyle being modeled.",
      "Influencer seeding works best when it does not feel like an ad. A Labubu clipped to a bag in a vlog can feel like a real taste choice, which is more persuasive.",
      "I get what you mean. Once a friend or celebrity wears it well, it stops looking like a random toy and starts looking like a style signal."
    ], input, turnCount);
  }

  if (value.includes("真假") || value.includes("假") || value.includes("lafufu") || value.includes("fake") || value.includes("real")) {
    return isZh
      ? "真假这个话题也挺有意思。表面上大家是在防踩雷，实际上也在建立“圈内知识”：数牙齿、看脚底 logo、分辨 Lafufu。\n\n当一个东西需要学习怎么辨认，它就更像一个小圈子了。你是在买玩具，也是在学习暗号。"
      : "The real-vs-fake topic is interesting. On the surface, people are avoiding scams; underneath, they are building insider knowledge: counting teeth, checking logos, spotting Lafufu.\n\nWhen a product needs a decoding guide, it starts feeling like a community with secret rules.";
  }

  if (value.includes("成人") || value.includes("可爱") || value.includes("童年") || value.includes("kidult") || value.includes("kidulthood") || value.includes("cute")) {
    return pickLine(isZh ? [
      "这个我觉得很真实。Labubu 的可爱不是那种完美、乖巧的可爱，它有点怪、有点坏笑，所以成年人喜欢它也不尴尬。像是在说：我很累，但我还想保留一点玩心。",
      "你被“可爱”吸引很正常。很多人不是想回到小孩状态，而是想在很紧绷的生活里放一个软软的小出口。Labubu 刚好可以挂出来，被别人看到。",
      "它像一个公开的小安慰物。不是藏在房间里的玩偶，而是挂在包上跟你一起出门。这种“我愿意被看见的可爱”很有吸引力。"
    ] : [
      "That feels very real. Labubu is not perfectly sweet cuteness; it is a little weird and mischievous, so adults can like it without feeling too precious. It says: I’m tired, but I still want a playful corner.",
      "Being drawn to cuteness is normal. For many people, it is not about becoming childish; it is about having a soft outlet in a tense life. Labubu is cute in a public, wearable way.",
      "It works like a visible comfort object. Not a plush hidden at home, but something clipped to your bag and carried into the day. That public cuteness is part of the pull."
    ], input, turnCount);
  }

  if (value.includes("社交") || value.includes("朋友") || value.includes("大家") || value.includes("trend") || value.includes("everyone") || value.includes("social")) {
    return pickLine(isZh ? [
      "对，最容易让人动心的不是“这个东西多好”，而是“好像大家都懂它”。当朋友、博主、评论区都在聊，它就从商品变成了社交话题。",
      "你看到的不是单个 Labubu，而是一整套氛围：开箱、穿搭、包挂、隐藏款、评论区尖叫。它会让人觉得自己也想加入那个热闹。",
      "这就是社交货币的感觉。拥有它不只是拥有一个玩偶，也像是在说：我知道这个梗，我在这个圈子里。"
    ] : [
      "Yes. The persuasive part is often not “this object is amazing,” but “everyone seems to understand it.” When friends, creators, and comments all talk about it, it becomes a social topic, not just a toy.",
      "You are not only seeing one Labubu. You are seeing a whole atmosphere: unboxings, outfits, bag charms, rare pulls, excited comments. It makes you want to join the scene.",
      "That is the social currency part. Owning it is not only owning a plush; it can signal: I know the reference, I’m part of this moment."
    ], input, turnCount);
  }

  if (value.includes("为什么") || value.includes("喜欢") || value.includes("want") || value.includes("like") || value.includes("buy")) {
    return pickLine(isZh ? [
      "我猜你不是某一秒突然“必须买”，更像是被一点点推过去的：先觉得它怪可爱的，再看到别人搭得很好看，然后开始想“是不是我也可以有一个”。\n\n你现在更像是喜欢它本身，还是喜欢它带来的那种氛围？",
      "这很像被慢慢种草：第一眼可能只是好奇，第二次看到开箱，第三次看到朋友挂包上，就开始觉得它和自己有关了。",
      "我会把这种想买拆成三层：它可爱；它代表一种风格；它现在很热闹。你可以想想，哪一层最打中你？"
    ] : [
      "My guess is that you did not suddenly need one. It probably built slowly: first it looked weird-cute, then you saw people style it well, then it started feeling like maybe it could fit you too.\n\nDo you like the object itself, or the atmosphere around it?",
      "That sounds like gradual seeding: first curiosity, then unboxings, then seeing it on someone’s bag, and eventually it starts feeling personally relevant.",
      "I would split the desire into three layers: it is cute, it signals a style, and it is socially alive right now. Which layer feels strongest for you?"
    ], input, turnCount);
  }

  if (value.includes("理性") || value.includes("判断") || value.includes("decision") || value.includes("rational") || value.includes("should")) {
    return pickLine(isZh ? [
      "可以，不用逼自己立刻决定。先把它放进“等 48 小时再看”的盒子里。如果两天后你还记得具体喜欢哪个款、为什么喜欢，那比较像真实偏好；如果只是怕错过，可能就是热度在推你。",
      "我会建议你别问“该不该买”，先问“我想要的是哪个部分”：可爱？稀缺？朋友也有？开箱刺激？如果答案主要是后面三个，就先缓一缓。",
      "理性一点不等于不能喜欢。你可以喜欢它，同时先不立刻买。给自己一个小规则：只买具体喜欢的款，不为隐藏款和热度连续加购。"
    ] : [
      "You do not have to decide immediately. Put it in a 48-hour waiting box. If two days later you still remember the exact style and why you like it, that is closer to real preference. If it is mostly fear of missing out, pause.",
      "Instead of asking “should I buy it,” ask what part you want: cuteness, scarcity, friends having it, or the unboxing thrill. If it is mostly the last three, slowing down is probably smart.",
      "Being rational does not mean you cannot like it. You can enjoy it and still wait. A good rule: buy only a specific style you truly like, not repeated boxes chasing hype."
    ], input, turnCount);
  }

  if (value.includes("消费") || value.includes("环保") || value.includes("浪费") || value.includes("plastic") || value.includes("waste") || value.includes("sustainable")) {
    return isZh
      ? "这个角度很重要，而且不用变成自责。喜欢可爱的东西没问题，但如果它只是被热度推着买、很快又闲置，那就值得停一下。\n\n我会问：它半年后还会让我开心吗？还是只是在帮我追上这周的流行？"
      : "That matters, and it does not have to become self-blame. Liking cute things is fine. But if the purchase is mostly hype-driven and likely to sit unused, it is worth pausing.\n\nAsk: will this still make me happy in six months, or is it helping me catch this week’s trend?";
  }

  if (value.includes("身份") || value.includes("风格") || value.includes("identity") || value.includes("style")) {
    return isZh
      ? "对，Labubu 很会变成“风格的一部分”。它不是安静放在柜子里的玩偶，而是可以挂在包上、出现在照片里、和穿搭一起被别人看到。\n\n所以你想要的可能不是玩具本身，而是“我也可以拥有这种风格”的感觉。"
      : "Yes, Labubu easily becomes part of a style. It is not only a toy sitting on a shelf; it can hang on a bag, show up in photos, and be seen with an outfit.\n\nSo the desire may not only be for the toy, but for the feeling of having that style too.";
  }

  return isZh
    ? "我懂。你可以再讲具体一点：是看到别人挂包上心动，还是刷到开箱视频，还是单纯觉得它丑萌得很可爱？\n\n你说得越像真实感受，我越能帮你拆出是哪种种草在起作用。"
    : "I get it. Tell me a little more: was it someone styling it on a bag, an unboxing video, or just the weird-cute look?\n\nThe more honestly you describe the feeling, the better I can unpack what kind of influence is working.";
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("zh");
  const [messages, setMessages] = useState<Message[]>(() => makeInitialMessages("zh"));
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const pendingReply = useRef<number | null>(null);
  const t = copy[lang];

  useEffect(() => {
    return () => {
      if (pendingReply.current !== null) window.clearTimeout(pendingReply.current);
    };
  }, []);

  const latestScore = useMemo(() => {
    const userMessages = messages.filter((message) => message.role === "user").length;
    return Math.min(92, 28 + userMessages * 13);
  }, [messages]);

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
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${now}`,
          role: "assistant",
          text: createReply(trimmed, lang, turnCount),
          image: turnCount % 3 === 1 ? "/labubu/product-8.jpg" : undefined,
        },
      ]);
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
              <strong>{t.profileValue}</strong>
            </div>
          </div>
          <div className="score-card">
            <span>Interest signal</span>
            <strong>{latestScore}%</strong>
            <i><b style={{ width: `${latestScore}%` }} /></i>
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
