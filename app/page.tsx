"use client";

import { FormEvent, useMemo, useState } from "react";

type Lang = "zh" | "en";
type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  image?: string;
};

const copy = {
  zh: {
    title: "LABUBU 种草 Chatbox",
    subtitle: "输入你的想法，观察媒体内容如何一步步影响兴趣、身份认同和 FOMO。",
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
    hint: "这是本地规则回复版本，不需要 API key。之后可以把回复函数替换成真实 AI 接口。",
    starters: ["为什么大家都喜欢 Labubu？", "盲盒开箱为什么上头？", "Lisa 和网红为什么有影响？", "我该怎么理性判断？"],
    welcome: [
      "欢迎进入 Labubu 种草 Chatbox。这里不是商店，也不是和 Labubu 本人聊天。",
      "你可以把它当作一个媒体素养模拟器：输入你的感受，我会解释你是如何被内容、社群和稀缺感逐步影响的。",
    ],
  },
  en: {
    title: "LABUBU Seeding Chatbox",
    subtitle: "Type your thoughts and see how media content shapes interest, identity, and FOMO.",
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
    hint: "This is a local rule-based reply version. It does not need an API key. You can replace the reply function with a real AI API later.",
    starters: ["Why does everyone like Labubu?", "Why are blind-box unboxings addictive?", "Why do Lisa and influencers matter?", "How can I decide rationally?"],
    welcome: [
      "Welcome to the Labubu Seeding Chatbox. This is not a shop, and you are not chatting with Labubu as a character.",
      "Think of it as a media literacy simulator: type what you feel, and I will explain how content, community, and scarcity can gradually shape desire.",
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
    id: index + 1,
    role: "assistant",
    text,
    image: index === 1 ? "/labubu/product-3.jpg" : undefined,
  }));
}

function createReply(input: string, lang: Lang): string {
  const value = input.toLowerCase();
  const isZh = lang === "zh";

  if (value.includes("fomo") || value.includes("错失") || value.includes("稀缺") || value.includes("限量")) {
    return isZh
      ? "FOMO 的意思是“害怕错过”。当页面告诉你很多人收藏、朋友也喜欢、某个款式很少见时，你会开始担心以后买不到。重点不是它真的适不适合你，而是“现在不行动会不会后悔”。"
      : "FOMO means fear of missing out. When a feed shows saves, friends, limited releases, or low-stock cues, waiting starts to feel risky. The pressure is not only about liking the object; it is about avoiding future regret.";
  }

  if (value.includes("盲盒") || value.includes("开箱") || value.includes("隐藏") || value.includes("抽") || value.includes("blind") || value.includes("unbox") || value.includes("rare") || value.includes("secret")) {
    return isZh
      ? "盲盒和开箱会让 Labubu 不只是“买一个玩具”，而像一次小型抽奖。你期待隐藏款、拍下反应、分享结果，这些都会把购买变成内容。真正让人上头的，是“我下一次会不会抽到更特别的”。"
      : "Blind boxes turn Labubu from a simple purchase into a mini lottery. The suspense, reveal reaction, rare variant, and shareable unboxing all become part of the product. The addictive thought is: maybe the next box will be the special one.";
  }

  if (value.includes("lisa") || value.includes("明星") || value.includes("网红") || value.includes("博主") || value.includes("celebrity") || value.includes("influencer")) {
    return isZh
      ? "明星和网红的作用不是直接命令你购买，而是把 Labubu 放进一种“理想生活方式”里。你看到 Lisa、博主或朋友把它挂在包上，会觉得它代表品味、圈层和风格，这叫 opinion leadership 和 taste transfer。"
      : "Celebrities and influencers do not simply tell people to buy. They place Labubu inside an aspirational lifestyle. When Lisa, creators, or friends clip it to a bag, the toy starts signaling taste, belonging, and style. That is opinion leadership and taste transfer.";
  }

  if (value.includes("真假") || value.includes("假") || value.includes("lafufu") || value.includes("fake") || value.includes("real")) {
    return isZh
      ? "真假货本身也会强化热度：当大家开始讨论 Lafufu、数牙齿、查脚底 logo，Labubu 就变成了一套需要学习的圈内知识。越需要辨认，越像一个有门槛的社群。"
      : "Real-vs-fake talk can actually strengthen the trend. When people discuss Lafufu, count teeth, or check the logo under the foot, Labubu becomes a body of insider knowledge. The more there is to verify, the more it feels like a community with rules.";
  }

  if (value.includes("成人") || value.includes("可爱") || value.includes("童年") || value.includes("kidult") || value.includes("kidulthood") || value.includes("cute")) {
    return isZh
      ? "Labubu 的可爱不只是小朋友式的可爱。很多成年人把它当成压力里的小小安慰，也是一种公开表达童趣的方式。它挂在包上、桌上、通勤路上，像是在说：我可以成熟，但也可以保留一点玩心。"
      : "Labubu's cuteness is not only childlike. Many adults use it as comfort, play, and a public display of softness. On a bag, desk, or commute, it says: I can be grown-up and still keep a playful side.";
  }

  if (value.includes("社交") || value.includes("朋友") || value.includes("大家") || value.includes("trend") || value.includes("everyone") || value.includes("social")) {
    return isZh
      ? "社交媒体会把个人兴趣包装成群体氛围。你看到很多人晒图、开箱、挂在包上，就会感觉“这不是一个商品，而是一个圈子”。这就是 social proof 和 bandwagon effect。"
      : "Social media turns a private interest into a group atmosphere. When you see unboxings, bag charms, saves, and comments, it feels less like a product and more like joining a shared scene. That is social proof and the bandwagon effect.";
  }

  if (value.includes("为什么") || value.includes("喜欢") || value.includes("want") || value.includes("like") || value.includes("buy")) {
    return isZh
      ? "你可能不是突然想买，而是被几个步骤慢慢带进去：先被可爱外观吸引，再把它和自己的风格联系起来，然后看到别人也在讨论，最后被稀缺提示推高兴趣。"
      : "You may not want it suddenly. The desire often builds in steps: cute visuals attract attention, styling connects it to identity, community posts make it feel popular, and scarcity cues raise urgency.";
  }

  if (value.includes("理性") || value.includes("判断") || value.includes("decision") || value.includes("rational") || value.includes("should")) {
    return isZh
      ? "可以问自己四个问题：我是不是真的喜欢这个具体款式？如果没有社交媒体热度我还会想要吗？我是否已经有类似东西？我是一周后仍然想要，还是只被当下情绪影响？"
      : "Ask four questions: Do I truly like this specific style? Would I still want it without the trend? Do I already own something similar? Would I still want it next week, or is this mostly a current emotional reaction?";
  }

  if (value.includes("消费") || value.includes("环保") || value.includes("浪费") || value.includes("plastic") || value.includes("waste") || value.includes("sustainable")) {
    return isZh
      ? "这也是值得反思的一面。Labubu 可以带来快乐，但它也可能变成快速微趋势和塑料消费。比较好的判断方式不是羞辱自己，而是问：它会带来长期快乐吗？我是真喜欢，还是只想追上这波热度？"
      : "That is the reflective side. Labubu can bring joy, but it can also become a fast microtrend and plastic consumption cycle. The goal is not to shame yourself; ask whether it will bring lasting joy, or whether you mostly want to catch the current wave.";
  }

  if (value.includes("身份") || value.includes("风格") || value.includes("identity") || value.includes("style")) {
    return isZh
      ? "身份认同是种草里很关键的一步。当 Labubu 出现在穿搭、桌面、包挂场景里，它就不只是玩具，而像是在表达“我是什么风格的人”。"
      : "Identity is a major step in desire. When Labubu appears in outfits, desks, bags, and room setups, it stops feeling like just a toy and starts feeling like a signal of personal style.";
  }

  return isZh
    ? "我理解你的想法。可以继续告诉我：你是被可爱外观吸引、被朋友影响、担心买不到，还是觉得它符合你的风格？我会帮你拆解这个种草过程。"
    : "I get what you mean. Tell me whether the pull comes from cuteness, friends, scarcity, or personal style, and I will break down the seeding process.";
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("zh");
  const [messages, setMessages] = useState<Message[]>(() => makeInitialMessages("zh"));
  const [draft, setDraft] = useState("");
  const t = copy[lang];

  const latestScore = useMemo(() => {
    const userMessages = messages.filter((message) => message.role === "user").length;
    return Math.min(92, 28 + userMessages * 13);
  }, [messages]);

  function toggleLang() {
    const nextLang = lang === "zh" ? "en" : "zh";
    setLang(nextLang);
    setMessages(makeInitialMessages(nextLang));
    setDraft("");
  }

  function reset() {
    setMessages(makeInitialMessages(lang));
    setDraft("");
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => {
      const nextId = current.length + 1;
      return [
        ...current,
        { id: nextId, role: "user", text: trimmed },
        {
          id: nextId + 1,
          role: "assistant",
          text: createReply(trimmed, lang),
          image: nextId % 4 === 1 ? "/labubu/product-8.jpg" : undefined,
        },
      ];
    });
    setDraft("");
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
            <button type="submit">{t.send}</button>
          </form>
        </section>
      </section>
    </main>
  );
}
