"use client";
import { useState } from "react";

const colors = ["cocoa", "berry", "cream", "mint", "lavender"];

function Labubu({ color, index }: { color: string; index: number }) {
  return <div className={`labubu labubu--${color}`} style={{ "--i": index } as React.CSSProperties} aria-hidden="true">
    <span className="ear ear--left" /><span className="ear ear--right" />
    <span className="head"><span className="face">
      <span className="eye eye--left" /><span className="eye eye--right" /><span className="nose" />
      <span className="grin"><i /><i /><i /><i /><i /><i /><i /><i /><i /></span>
      <span className="cheek cheek--left" /><span className="cheek cheek--right" />
    </span></span>
    <span className="body" /><span className="foot foot--left" /><span className="foot foot--right" />
    <span className="arm arm--left" /><span className="arm arm--right" />
  </div>;
}

export default function Home() {
  const [replay, setReplay] = useState(0);
  return <main className="welcome" key={replay}>
    <div className="grain" aria-hidden="true" /><div className="sun sun--one" aria-hidden="true" /><div className="sun sun--two" aria-hidden="true" />
    <header className="topbar">
      <a className="brand" href="#welcome" aria-label="Labubu Chatbox home"><span className="brand-mark">L</span><span>LABUBU CHATBOX</span></a>
      <span className="live-pill"><i /> BURROW OPEN</span>
    </header>
    <section className="hero" id="welcome" aria-labelledby="welcome-title">
      <p className="eyebrow"><span>✦</span> A TINY, TOOTHY WELCOME <span>✦</span></p>
      <h1 id="welcome-title" aria-label="Aaaaa! Hello, you!"><span className="scream">AAAAAA!</span><span className="hello">HELLO, YOU!</span></h1>
      <p className="intro">Five little monsters have been waiting very patiently.<br />Well… <em>mostly</em> patiently.</p>
      <button className="replay" type="button" onClick={() => setReplay(value => value + 1)}><span>SCREAM AGAIN</span><b aria-hidden="true">↻</b></button>
      <div className="sound-lines sound-lines--left" aria-hidden="true"><i /><i /><i /></div><div className="sound-lines sound-lines--right" aria-hidden="true"><i /><i /><i /></div>
    </section>
    <section className="monster-stage" aria-label="A cheerful group of five animated Labubus">
      <div className="confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--n": index } as React.CSSProperties} />)}</div>
      <div className="labubu-row">{colors.map((color, index) => <Labubu color={color} index={index} key={color} />)}</div><div className="ground" aria-hidden="true" />
    </section>
    <footer><span>MADE WITH MISCHIEF</span><span className="footer-star">✷</span><span>BEST ENJOYED LOUDLY</span></footer>
  </main>;
}
