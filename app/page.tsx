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
    profileValue: "已经心动了，但还在嘴硬",
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
    profileValue: "Tempted, pretending not to be",
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
  const has = (words: string[]) => words.some((word) => value.includes(word));

  if (has(["贵", "价格", "钱", "买不起", "expensive", "price", "cost", "money", "overpriced"])) {
    return pickLine(isZh ? [
      "贵但又想要，真的最折磨。先别急着骂自己被种草了，我会先问一个有点扎心的问题：如果买了以后没人知道，你还愿意花这笔钱吗？",
      "我懂。它贵，所以你才会开始怀疑自己到底是真喜欢，还是只是被那股热闹推了一把。\n\n可以先想一个很小的问题：你是喜欢那只本身，还是喜欢“我也终于有一个”的感觉？",
      "先别马上付款。真的。把它放进愿望清单，过两天再看一次。如果到时候你还能说出具体喜欢哪一款、哪一点，那就比现在被视频推着买靠谱多了。"
    ] : [
      "Pricey but still tempting is the worst little mental loop. Before you judge yourself, try this: if nobody ever saw you with it, would you still want to pay for it?",
      "I get it. The price makes the feeling louder. You are probably trying to figure out whether you want the toy, or whether you want that tiny “I have one too” feeling.",
      "Do not buy it in the same mood that made you open the checkout page. Wishlist it, wait two days, then see if you still remember the exact one you wanted."
    ], input, turnCount);
  }

  if (has(["犹豫", "纠结", "要不要", "不知道", "unsure", "confused", "hesitant", "not sure"])) {
    return pickLine(isZh ? [
      "纠结挺真实的。你不是完全没感觉，也不是已经失去理智，就是卡在中间。\n\n先不说买不买。你第一次心动，是看到图片、开箱，还是别人挂在包上？",
      "这状态我懂：想要是真的，怀疑自己被影响也是真的。先别急着给答案，先抓住那个最早让你停下来的画面。",
      "不用把自己逼得像在写消费决策报告。你就回忆一下，哪一刻你突然觉得：等一下，这东西好像有点意思？"
    ] : [
      "That in-between feeling is pretty real. You want it, but you also know the internet may have nudged you there.\n\nForget buying for a second. Where did the first pull come from: a picture, an unboxing, or seeing it on a bag?",
      "I get this mood. Part of you wants it, part of you is side-eyeing yourself. Start with the first image that stuck in your head.",
      "You do not need a spreadsheet brain for this. Just remember the moment you thought, wait, why am I still looking at this?"
    ], input, turnCount);
  }

  if (has(["抢不到", "排队", "售罄", "sold out", "drop", "queue", "line", "restock"])) {
    return pickLine(isZh ? [
      "“抢不到”这三个字真的很会把人推急。你本来在想喜不喜欢，下一秒就变成我会不会错过。\n\n先慢一下：你是在喜欢它，还是在和库存赛跑？",
      "排队、补货提醒、售罄截图，会把一个小玩具搞得像考试名额一样紧张。紧张是真的，但不一定等于喜欢也是真的。",
      "售罄会自动给东西加滤镜。越难买，越像值得买。把这个滤镜拿掉试试：如果它一直有货，你还会想要同一只吗？"
    ] : [
      "“What if I can’t get it?” is exactly the thought that speeds everything up. Suddenly it is not do I like this, it is am I too late?",
      "Drops and restock alerts can make a tiny toy feel weirdly urgent. The stress is real. It just may not be the same thing as taste.",
      "Sold out adds a filter. The harder it is to get, the more it starts looking worth getting. If it were always available, would you still want this exact one?"
    ], input, turnCount);
  }

  if (value.includes("fomo") || value.includes("错失") || value.includes("稀缺") || value.includes("限量")) {
    return pickLine(isZh ? [
      "嗯，这就是那种“怕晚一步”的感觉。可能不是你突然更喜欢它了，是限量、隐藏款、售罄把你的大脑按到了加速键。\n\n如果它明天还买得到，你还会这么急吗？",
      "我懂那一下。刷到别人开箱，心里突然紧一下，好像大家都已经进场了，就你还在门口。",
      "这不代表你不理性。稀缺本来就会制造紧张感。先把“怕买不到”和“真的喜欢这个款”分开放，脑子会清楚一点。"
    ] : [
      "Yeah, that sounds like the “what if I miss it?” button got pressed. Maybe you do like it. The scarcity just makes the liking feel louder.\n\nIf it were still available tomorrow, would you feel this urgent?",
      "I know that little stomach drop from watching someone else unbox it. It can feel like everyone already got into the moment and you are still outside.",
      "This does not mean you are being irrational. Scarcity is supposed to make waiting feel risky. Split the thought in two: I like this one, and I am scared it will disappear."
    ], input, turnCount);
  }

  if (value.includes("盲盒") || value.includes("开箱") || value.includes("隐藏") || value.includes("抽") || value.includes("blind") || value.includes("unbox") || value.includes("rare") || value.includes("secret")) {
    return pickLine(isZh ? [
      "开箱很容易上头，因为它不像普通购物，更像拆一个小悬念。你买的不是一只确定的 Labubu，是“万一呢”。\n\n视频好看也在这儿，大家都等那一下揭晓。",
      "盲盒厉害就厉害在答案来得很晚。盒子还没开，大脑已经开始替你幻想隐藏款了。",
      "我觉得开箱最会种草的地方是，看多了以后你会想亲自体验一次那个揭晓瞬间。哪怕你一开始根本没打算买。"
    ] : [
      "Unboxing works because it is a tiny suspense story. You are not only buying a Labubu. You are buying the maybe.\n\nThat reveal moment is doing a lot of work.",
      "Blind boxes delay the answer. Before the box is even open, your brain is already whispering, what if it is the rare one?",
      "The sneaky part is that after enough unboxings, you may want the reveal more than the object. You want to feel that little pop of surprise yourself."
    ], input, turnCount);
  }

  if (value.includes("lisa") || value.includes("明星") || value.includes("网红") || value.includes("博主") || value.includes("celebrity") || value.includes("influencer")) {
    return pickLine(isZh ? [
      "Lisa 或博主最厉害的不是说“快去买”。她们只是把它挂在那里，拍得很好看，然后你心里就会冒一句：原来这东西还能这么搭。",
      "这种种草最自然，因为它不像广告。Labubu 在 vlog 里一闪而过，挂在包上晃一下，反而更像真实审美。",
      "朋友或明星一戴，它就从“奇怪小玩具”变成“好像还挺有风格”。你不一定是在复制她们，可能只是被那个搭配方式说服了。"
    ] : [
      "The celebrity effect is not always “she has it, so I need it.” Sometimes it is quieter. She clips it on a bag, it looks good, and suddenly the object makes sense.",
      "Creator seeding works best when it barely looks like selling. A Labubu swinging from a bag in a vlog can feel more convincing than a full ad.",
      "Once someone stylish wears it well, it stops looking like a random toy and starts looking like a style move. You may not want her exact life. You may just like the styling."
    ], input, turnCount);
  }

  if (value.includes("真假") || value.includes("假") || value.includes("lafufu") || value.includes("fake") || value.includes("real")) {
    return isZh
      ? "真假这个话题也很会把人带进去。你本来只是想看看，结果开始学怎么数牙齿、看脚底 logo、分 Lafufu。\n\n一旦你开始懂这些暗号，就很容易觉得自己已经半只脚进圈了。"
      : "The fake-versus-real rabbit hole pulls people in fast. You start out casually looking, then suddenly you know about teeth counts, foot logos, and Lafufu tells.\n\nOnce you learn the little codes, it starts feeling like you are halfway inside the community.";
  }

  if (has(["丑", "怪", "丑萌", "ugly", "weird", "strange"])) {
    return pickLine(isZh ? [
      "对，它就是那种第一眼“什么东西”，第二眼“有点意思”，第三眼开始认真看颜色的丑萌。",
      "哈哈我懂。它不是甜甜乖乖的可爱，所以反而有记忆点。那个小坏笑很容易让人越看越顺眼。",
      "你可能不是被“漂亮”打动，是被它那个有点怪、有点欠欠的性格感打动。太完美的可爱有时候真的会无聊。"
    ] : [
      "Exactly. First look: what is that. Second look: wait, kind of interesting. Third look: which color would I get?",
      "I get it. It is not sweet in a perfect way, which is why it sticks. That mischievous little face does more than it should.",
      "You may not be drawn to prettiness. You may be drawn to the weird personality of it, which is honestly the whole trick."
    ], input, turnCount);
  }

  if (value.includes("成人") || value.includes("可爱") || value.includes("童年") || value.includes("kidult") || value.includes("kidulthood") || value.includes("cute")) {
    return pickLine(isZh ? [
      "这个我觉得很真实。它不是那种乖乖甜甜的可爱，所以成年人喜欢也不太尴尬。像是在说：我很累，但我还想留一点玩心。",
      "你被可爱吸引很正常。很多人不是想装小孩，只是想在紧绷的生活里留个软一点的出口。",
      "它有点像能带出门的小安慰物。不是藏在房间里的玩偶，而是挂在包上跟你一起走。这个差别蛮大的。"
    ] : [
      "That feels real. It is not perfectly sweet, so liking it as an adult does not feel too precious. It is more like, I am tired, but I still want one playful corner.",
      "Being drawn to cute stuff does not mean you are trying to be childish. Sometimes you just want a soft little outlet in an otherwise tense day.",
      "It is almost a comfort object you can take outside. Not a plush hidden at home, but something clipped to your bag. That public part matters."
    ], input, turnCount);
  }

  if (value.includes("社交") || value.includes("朋友") || value.includes("大家") || value.includes("trend") || value.includes("everyone") || value.includes("social")) {
    return pickLine(isZh ? [
      "对，最容易让人动心的有时候不是“它多好”，而是“大家好像都懂”。朋友、博主、评论区都在聊，它就不只是玩偶了。",
      "你看到的不是一只 Labubu，是一整套氛围：开箱、包挂、隐藏款、评论区尖叫。看久了真的会想进去凑个热闹。",
      "这有点像社交暗号。拥有它不只是拥有一个玩偶，也像是在说：我知道这个梗，我在这个场子里。"
    ] : [
      "Yes. Sometimes the pull is not “this object is amazing.” It is more like, everyone seems to get it, and now I want to get it too.",
      "You are not seeing one Labubu. You are seeing unboxings, bag charms, rare pulls, excited comments, the whole little scene. After a while, joining it starts to feel fun.",
      "It can become a social signal. Not in a serious way, but enough to say: I know the reference, I am in on the moment."
    ], input, turnCount);
  }

  if (has(["被种草", "种草", "influenced", "influence"])) {
    return pickLine(isZh ? [
      "我觉得是有点被种草了，但这不丢人。内容本来就是这样工作的：先让你看见，再让你记住，最后让你觉得“要不我也”。",
      "像是慢慢被推过去的。不是某一秒突然想买，是刷到几次、记住了、又看到别人有，然后它开始变得跟你有关。",
      "有种草的成分。但我不会直接说你只是跟风，因为你可能也是真的喜欢。更准确的问题是：你喜欢它多少，喜欢那个热闹又是多少？"
    ] : [
      "I think yes, a little. But being influenced is not some personal failure. Content works by making you see something, remember it, then quietly think, maybe me too.",
      "It sounds gradual. You saw it, remembered it, saw other people with it, and then it started feeling weirdly relevant to you.",
      "There is influence here. I would not call it mindless trend-following, though, because you may genuinely like it. The useful question is how much is the toy, and how much is the buzz around it?"
    ], input, turnCount);
  }

  if (value.includes("为什么") || value.includes("喜欢") || value.includes("want") || value.includes("like") || value.includes("buy")) {
    return pickLine(isZh ? [
      "我猜你不是突然“必须买”。更像是先觉得怪可爱，再看到别人搭得好看，最后开始想：是不是我也可以有一个？\n\n你更想要那只本身，还是想要它带来的氛围？",
      "这很像慢慢被种草。第一眼只是好奇，第二次看到开箱，第三次看到朋友挂包上，它就开始跟你有关系了。",
      "这个想买大概有三层：它可爱，它有风格，它现在很热闹。你可以不急着决定，先看哪一层最戳你。"
    ] : [
      "My guess is you did not suddenly need one. It probably built slowly: weird-cute at first, then styled well on someone else, then somehow it started feeling like it could fit you too.\n\nDo you want the object, or the mood around it?",
      "That sounds like slow seeding. First curiosity, then unboxings, then seeing it on someone’s bag, and eventually it starts feeling personal.",
      "The wanting has a few layers: cute, style, and the fact that everyone is talking about it. Which one is actually doing the most work on you?"
    ], input, turnCount);
  }

  if (value.includes("理性") || value.includes("判断") || value.includes("decision") || value.includes("rational") || value.includes("should")) {
    return pickLine(isZh ? [
      "可以理性，但不用装作自己完全不喜欢。先等 48 小时。两天后你还记得具体想要哪只、为什么想要，那就比较像真的喜欢。",
      "别先问该不该买，先问你想要的是哪一部分：可爱、稀缺、朋友也有，还是开箱那一下？如果主要是后面几个，就先缓缓。",
      "理性不等于不能喜欢。可以喜欢，也可以先不买。给自己一个小规则：只买具体喜欢的款，不为了隐藏款一直加购。"
    ] : [
      "You can be rational without pretending you do not like it. Wait 48 hours. If you still remember the exact one and why you want it, that is a much cleaner signal.",
      "Do not start with should I buy it. Ask what part you want: the cuteness, the scarcity, your friends having it, or the unboxing hit. If it is mostly the last few, slow down.",
      "Being rational does not mean killing the fun. You can like it and still wait. A decent rule: buy a specific one you actually want, not endless boxes chasing a rare pull."
    ], input, turnCount);
  }

  if (value.includes("消费") || value.includes("环保") || value.includes("浪费") || value.includes("plastic") || value.includes("waste") || value.includes("sustainable")) {
    return isZh
      ? "这个角度挺重要，但也别一下变成自责。喜欢可爱的东西没问题，只是如果买完很快闲置，那就可以先停一下。\n\n问自己一句：半年后它还会让我开心吗？还是它只是帮我追上这周的流行？"
      : "That is worth thinking about, but do not turn it into self-blame. Liking cute things is fine. If it is likely to sit unused after the hype fades, pause.\n\nAsk yourself: will this still make me happy in six months, or is it just helping me catch this week’s trend?";
  }

  if (value.includes("身份") || value.includes("风格") || value.includes("identity") || value.includes("style")) {
    return isZh
      ? "对，Labubu 很容易变成风格的一部分。它不是安静放在柜子里的玩偶，是会挂在包上、出现在照片里、和穿搭一起被看到的东西。\n\n所以你想要的可能不只是玩具，也可能是“我也可以有这种风格”的感觉。"
      : "Yes, Labubu can become part of a style. It is not only a toy on a shelf. It hangs on a bag, shows up in photos, and gets seen with the outfit.\n\nSo you may want more than the toy. You may want the feeling of having that style too.";
  }

  return isZh
    ? "我懂。你再说具体一点：是别人挂包上让你心动，还是开箱视频看多了，还是单纯觉得它丑萌到有点可爱？\n\n不用说得很理性，说真实一点就好。"
    : "I get it. Tell me the more specific version: was it someone styling it on a bag, too many unboxing videos, or just the weird-cute face getting to you?\n\nIt does not have to sound rational. It just has to sound honest.";
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
