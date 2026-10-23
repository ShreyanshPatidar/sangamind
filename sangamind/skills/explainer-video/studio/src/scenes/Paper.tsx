import React, {useContext} from "react";
import {
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {useBrand} from "../brand";
import type {Brand, Item, Paper, Scene, Timeline} from "../types";
import {isClip, VideoContext} from "./Picture";

/**
 * The "paper" look: a printed page (cream by default) with taped real photos and clips, ink drawings,
 * notes and numbers, a section ruler in the margin and a dive between sections. Everything about how it
 * looks comes from brand.json "paper"; nothing here is specific to one channel.
 */

const W = 1920;
const H = 1080;
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const usePaper = (): Paper => {
  const b = useBrand();
  if (!b.paper) throw new Error('brand.json has no "paper" block');
  return b.paper;
};

const colorOf = (p: Paper, c?: string) =>
  !c ? p.ink : c === "ink" ? p.ink : c === "accent" ? p.accent : c === "soft" ? p.soft : c === "highlight" ? p.highlight ?? p.accent : c;

/** Faint wavy water lines across the page (below the waterline only when `from` is set). */
export const PaperGround: React.FC<{from?: number; shift?: number}> = ({from = 0, shift = 0}) => {
  const p = usePaper();
  const id = `wl${Math.round(shift)}`;
  return (
    <svg width={W} height={H} style={{position: "absolute", inset: 0}}>
      <defs>
        <pattern id={id} width={240} height={34} patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${-shift % 34})`}>
          <path d="M0 17 q 30 -6 60 0 t 60 0 t 60 0 t 60 0" fill="none" stroke={p.line} strokeWidth={1.3} />
        </pattern>
      </defs>
      <rect x={0} y={from} width={W} height={Math.max(0, H - from)} fill={`url(#${id})`} opacity={p.waterLines} />
    </svg>
  );
};

/** The ink waterline: a wobbling charcoal line with a thin second line under it. */
export const Waterline: React.FC<{y: number}> = ({y}) => {
  const p = usePaper();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  let d = "";
  let d2 = "";
  for (let x = 0; x <= W; x += 20) {
    const w = Math.sin(x / 90 + t * 3) * 6 + Math.sin(x / 37 - t * 5) * 3;
    d += `${x ? "L" : "M"}${x} ${y + w}`;
    d2 += `${x ? "L" : "M"}${x} ${y + 7 + w * 0.6}`;
  }
  return (
    <svg width={W} height={H} style={{position: "absolute", inset: 0, overflow: "visible"}}>
      <path d={d} fill="none" stroke={p.ink} strokeWidth={4} />
      <path d={d2} fill="none" stroke={p.line} strokeWidth={2} opacity={0.6} />
    </svg>
  );
};

/** How far into an item's entrance we are (0 -> 1), and how far out (1 -> 0) if it has an exit. */
const useItemTime = (it: Item) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps - (it.time ?? 0);
  const exit = it.until !== undefined ? interpolate(frame / fps - it.until, [0, 0.35], [1, 0], clamp) : 1;
  return {t, fps, frame, exit};
};

const Entrance: React.FC<{it: Item; children: React.ReactNode; w?: number; h?: number}> = ({it, children, w = 0, h = 0}) => {
  const {t, fps, frame, exit} = useItemTime(it);
  if (t < 0 || exit <= 0) return null;
  const how = it.enter ?? "drop";
  let dx = 0;
  let dy = 0;
  let rot = it.rot ?? 0;
  let scale = 1;
  let opacity = 1;
  let clip: string | undefined;
  if (how === "drop") {
    const s = spring({frame: t * fps, fps, config: {damping: 14, mass: 0.7}});
    dy = (1 - s) * -70;
    rot += (1 - s) * 7;
    opacity = Math.min(1, t / 0.15);
  } else if (how === "fade") {
    opacity = interpolate(t, [0, 0.4], [0, 1], clamp);
  } else if (how === "stamp") {
    const s = interpolate(t, [0, 0.18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    scale = 1.5 - 0.5 * s;
    opacity = s;
  } else if (how === "pop") {
    scale = spring({frame: t * fps, fps, config: {damping: 11, mass: 0.6}});
  } else if (how === "write") {
    const s = interpolate(t, [0, it.seconds ?? 0.6], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
    clip = `inset(-20% ${(1 - s) * 100}% -20% -5%)`;
  } else if (how === "sink" || how === "fall") {
    opacity = Math.min(1, t / 0.3);
    const speed = how === "fall" ? 260 : 18;
    const settle = it.settle ?? Infinity;
    const travel = Math.min(t * speed, settle);
    dy = how === "fall" ? -300 + travel : travel;
    rot += Math.sin(t * 1.3 + (it.x ?? 0)) * (how === "fall" ? 6 : 2);
  }
  if (it.sway) {
    dy += Math.sin(frame / fps / 1.7 + (it.x ?? 0)) * it.sway;
    rot += Math.sin(frame / fps / 2.3 + (it.y ?? 0)) * it.sway * 0.2;
  }
  return (
    <div
      style={{
        position: "absolute",
        left: it.x ?? 0,
        top: it.y ?? 0,
        transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${scale})`,
        transformOrigin: `${w / 2}px ${h / 2}px`,
        opacity: opacity * exit,
        clipPath: clip,
      }}
    >
      {children}
    </div>
  );
};

const Tape: React.FC<{w: number}> = ({w}) => {
  const p = usePaper();
  const tw = Math.min(160, w * 0.35);
  return (
    <div
      style={{
        position: "absolute",
        top: -16,
        left: w / 2 - tw / 2,
        width: tw,
        height: 34,
        background: p.tape,
        transform: "rotate(-4deg)",
      }}
    />
  );
};

/** A real photo or clip, printed and taped onto the page, with a caption on the white border. */
const TapedPhoto: React.FC<{it: Item}> = ({it}) => {
  const p = usePaper();
  const video = useContext(VideoContext);
  const w = it.w ?? 500;
  const [iw, ih] = it.imgSize ?? [16, 9];
  const h = Math.round((w * ih) / iw);
  const pad = 14;
  const url = staticFile(`${video}/img/${it.src}`);
  const grade = `contrast(0.92) brightness(1.04) saturate(0.85) sepia(${p.photoWarmth})`;
  return (
    <Entrance it={it} w={w + pad * 2} h={h + pad + 44}>
      <div style={{position: "relative", padding: `${pad}px ${pad}px 44px`, background: "#FFFFFF", boxShadow: p.shadow}}>
        {isClip(it.src ?? "") ? (
          <OffthreadVideo src={url} muted style={{display: "block", width: w, height: h, objectFit: "cover", filter: grade}} />
        ) : (
          <Img src={url} style={{display: "block", width: w, height: h, objectFit: "cover", filter: grade}} />
        )}
        {it.caption ? (
          <div style={{position: "absolute", left: pad + 4, bottom: 11, font: `600 ${p.monoSize}px ${p.mono_family}`, letterSpacing: "0.12em", color: p.soft}}>
            {it.caption}
          </div>
        ) : null}
        {it.tape === false ? null : <Tape w={w + pad * 2} />}
      </div>
    </Entrance>
  );
};

/** An ink drawing (an SVG file in the video's assets), sized by width. */
const InkDrawing: React.FC<{it: Item}> = ({it}) => {
  const video = useContext(VideoContext);
  const w = it.w ?? 400;
  return (
    <Entrance it={it} w={w} h={w}>
      <Img src={staticFile(`${video}/img/${it.src}`)} style={{display: "block", width: w, filter: "drop-shadow(0 12px 14px rgba(60,45,20,.18))"}} />
    </Entrance>
  );
};

/** Typewriter: the text appears letter by letter (the full text keeps its space, so nothing reflows). */
const Typed: React.FC<{text: string; it: Item}> = ({text, it}) => {
  const p = usePaper();
  const {t} = useItemTime(it);
  const cps = p.typeCps ?? 18;
  const n = Math.max(0, Math.floor(t * cps));
  const done = n >= text.length;
  const caretOn = !done || Math.floor(t * 2) % 2 === 0;
  return (
    <>
      {text.slice(0, n)}
      <span style={{opacity: caretOn && t < text.length / cps + 1.2 ? 1 : 0}}>|</span>
      <span style={{opacity: 0}}>{text.slice(n)}</span>
    </>
  );
};

/** The keyboard sound under a typed item, for as long as it types. */
const TypeSound: React.FC<{it: Item}> = ({it}) => {
  const p = usePaper();
  const {fps} = useVideoConfig();
  if (it.enter !== "type" || !p.typeSfx || it.sound === false) return null;
  const secs = (it.text ?? "").length / (p.typeCps ?? 18);
  return (
    <Sequence from={Math.round((it.time ?? 0) * fps)} durationInFrames={Math.max(1, Math.round(secs * fps))} layout="none">
      <Audio src={staticFile(`sfx/${p.typeSfx}`)} volume={p.typeVolume ?? 0.45} />
    </Sequence>
  );
};

const TextItem: React.FC<{it: Item}> = ({it}) => {
  const p = usePaper();
  const {fonts} = useBrand();
  const color = colorOf(p, it.color);
  const body: React.ReactNode = it.enter === "type" ? <Typed text={it.text ?? ""} it={it} /> : it.text;
  const style = it.style ?? "headline";
  const size = it.size ?? (style === "headline" ? 92 : style === "big" ? 170 : style === "mono" ? 26 : style === "note" ? 34 : 30);
  const base: React.CSSProperties = {color, whiteSpace: "pre-line", textAlign: it.align ?? "left", maxWidth: it.w, width: it.align && it.align !== "left" && it.w ? it.w : undefined, lineHeight: 1.05};
  let el: React.ReactNode;
  if (style === "headline" || style === "big") {
    el = <div style={{...base, fontFamily: fonts.title_family, fontWeight: 800, fontSize: size}}>{body}</div>;
  } else if (style === "mono" || style === "kicker") {
    el = (
      <div style={{...base, font: `600 ${size}px ${p.mono_family}`, letterSpacing: style === "kicker" ? "0.3em" : "0.12em", textTransform: "uppercase", lineHeight: 1.45}}>
        {body}
      </div>
    );
  } else if (style === "note") {
    el = (
      <div style={{position: "relative", background: "#FFFDF7", padding: "26px 30px", boxShadow: p.shadow, maxWidth: it.w ?? 620}}>
        <div style={{fontFamily: fonts.title_family, fontStyle: "italic", fontWeight: 600, fontSize: size, color: p.ink, lineHeight: 1.2}}>{body}</div>
        {it.by ? <div style={{marginTop: 14, font: `600 ${Math.round(size * 0.55)}px ${p.mono_family}`, letterSpacing: "0.08em", color: p.soft}}>{it.by}</div> : null}
        <Tape w={it.w ?? 620} />
      </div>
    );
  } else {
    el = (
      <div style={{...base, display: "inline-block", border: `5px solid ${color}`, padding: "6px 18px", font: `900 ${size}px ${fonts.body_family}`, letterSpacing: "0.06em", textTransform: "uppercase"}}>
        {body}
      </div>
    );
  }
  return (
    <>
      <Entrance it={{...it, enter: it.enter ?? (style === "stamp" ? "stamp" : "fade")}} w={it.w ?? 400} h={size}>
        {el}
      </Entrance>
      <TypeSound it={it} />
    </>
  );
};

/** A drawn line, arrow or strike-through: it draws itself from start to end. */
const LineItem: React.FC<{it: Item}> = ({it}) => {
  const p = usePaper();
  const {t, exit} = useItemTime(it);
  if (t < 0 || exit <= 0) return null;
  const [x1, y1] = it.from ?? [0, 0];
  const [x2, y2] = it.to ?? [100, 0];
  const s = interpolate(t, [0, it.seconds ?? 0.35], [0, 1], {...clamp, easing: Easing.inOut(Easing.quad)});
  const color = colorOf(p, it.color);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = it.arrow
    ? `M${x2 - 26 * Math.cos(a - 0.45)} ${y2 - 26 * Math.sin(a - 0.45)} L${x2} ${y2} L${x2 - 26 * Math.cos(a + 0.45)} ${y2 - 26 * Math.sin(a + 0.45)}`
    : "";
  return (
    <svg width={W} height={H} style={{position: "absolute", inset: 0, overflow: "visible", opacity: exit}}>
      <path
        d={`M${x1} ${y1} L${x2} ${y2}`}
        stroke={color}
        strokeWidth={it.width ?? 8}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={it.dashed ? "4 16" : `${len} ${len}`}
        strokeDashoffset={it.dashed ? 0 : len * (1 - s)}
        opacity={it.dashed ? s : 1}
      />
      {head && s > 0.95 ? <path d={head} stroke={color} strokeWidth={it.width ?? 8} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
    </svg>
  );
};

/** An amber coin with a number, falling into place with a soft glow. */
const Coin: React.FC<{it: Item}> = ({it}) => {
  const p = usePaper();
  const {fonts} = useBrand();
  const r = it.r ?? 46;
  return (
    <Entrance it={{...it, enter: it.enter ?? "fall", settle: it.settle ?? 300}} w={r * 2} h={r * 2}>
      <svg width={r * 4} height={r * 4} style={{position: "absolute", left: -r, top: -r, overflow: "visible"}}>
        <defs>
          <radialGradient id={`cg${it.text}`}>
            <stop offset="0" stopColor={p.glow} stopOpacity={0.9} />
            <stop offset="0.45" stopColor={p.accent} stopOpacity={0.3} />
            <stop offset="1" stopColor={p.accent} stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={r * 2} cy={r * 2} r={r * 1.9} fill={`url(#cg${it.text})`} />
        <circle cx={r * 2} cy={r * 2} r={r} fill={p.accent} stroke={p.ink} strokeWidth={6} />
        <circle cx={r * 2} cy={r * 2} r={r * 0.72} fill="none" stroke={p.ink} strokeWidth={2} opacity={0.45} />
        <text x={r * 2} y={r * 2 + r * 0.36} textAnchor="middle" fontFamily={fonts.body_family} fontWeight={900} fontSize={r} fill={p.ink}>
          {it.text}
        </text>
      </svg>
    </Entrance>
  );
};

/** A soft amber glow behind whatever matters. */
const Glow: React.FC<{it: Item}> = ({it}) => {
  const p = usePaper();
  const {t, exit, frame, fps} = useItemTime(it);
  if (t < 0 || exit <= 0) return null;
  const r = it.r ?? 220;
  const breathe = 1 + Math.sin(frame / fps * 2) * 0.04;
  return (
    <div
      style={{
        position: "absolute",
        left: (it.x ?? 0) - r,
        top: (it.y ?? 0) - r,
        width: r * 2,
        height: r * 2,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${p.glow}cc 0%, ${p.accent}55 40%, ${p.accent}00 70%)`,
        opacity: interpolate(t, [0, 0.5], [0, 1], clamp) * exit,
        scale: String(breathe),
      }}
    />
  );
};

/** The channel's guide character (a cut-out PNG), floating gently, optionally carrying a lantern. */
const Guide: React.FC<{it: Item}> = ({it}) => {
  const p = usePaper();
  const video = useContext(VideoContext);
  const w = it.w ?? 240;
  return (
    <Entrance it={{...it, enter: it.enter ?? "drop", sway: it.sway ?? 8}} w={w} h={w}>
      {it.lantern ? (
        <>
          <div
            style={{
              position: "absolute",
              left: -w * 0.35,
              top: w * 0.1,
              width: w * 0.9,
              height: w * 0.9,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${p.glow}aa 0%, ${p.accent}00 65%)`,
            }}
          />
          <svg width={60} height={110} style={{position: "absolute", left: -12, top: w * 0.32, overflow: "visible"}}>
            <path d="M30 0 v26" stroke={p.ink} strokeWidth={3} />
            <rect x={10} y={26} width={40} height={10} rx={3} fill={p.ink} />
            <rect x={14} y={36} width={32} height={50} rx={7} fill={p.glow} stroke={p.ink} strokeWidth={3} />
            <rect x={10} y={86} width={40} height={10} rx={3} fill={p.ink} />
          </svg>
        </>
      ) : null}
      <Img
        src={staticFile(`${video}/img/${it.src}`)}
        style={{display: "block", width: w, transform: it.flip ? "scaleX(-1)" : undefined, filter: "drop-shadow(0 14px 18px rgba(60,45,20,.2))"}}
      />
    </Entrance>
  );
};

const ItemView: React.FC<{it: Item}> = ({it}) => {
  switch (it.kind) {
    case "photo":
      return <TapedPhoto it={it} />;
    case "svg":
      return <InkDrawing it={it} />;
    case "text":
      return <TextItem it={it} />;
    case "line":
      return <LineItem it={it} />;
    case "coin":
      return <Coin it={it} />;
    case "glow":
      return <Glow it={it} />;
    case "guide":
      return <Guide it={it} />;
    default:
      return null;
  }
};

const PageItems: React.FC<{scene: Scene}> = ({scene}) => (
  <>
    {(scene.items ?? []).map((it, i) => (
      <ItemView key={i} it={it} />
    ))}
  </>
);

/** One page: the paper, an optional waterline (surface pages), and the items in order. Slow camera drift. */
export const PaperPage: React.FC<{scene: Scene}> = ({scene}) => {
  const p = usePaper();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const secs = scene.end - scene.start;
  const z = interpolate(frame / fps, [0, secs], [1, 1 + p.drift], clamp);
  const wl = scene.waterline;
  return (
    <div style={{position: "absolute", inset: 0, background: p.color, overflow: "hidden"}}>
      <div style={{position: "absolute", inset: 0, scale: String(z), transformOrigin: "50% 45%"}}>
        <PaperGround from={wl ?? 0} />
        {wl !== undefined ? <Waterline y={wl} /> : null}
        {(scene.items ?? []).map((it, i) => (
          <ItemView key={i} it={it} />
        ))}
      </div>
    </div>
  );
};

/**
 * The move between sections: the camera sinks about one screen (the waterline passes up and out the
 * first time), light ink bubbles rise, then the section kicker and title rise in. `rise: true` plays it
 * upwards (back to the surface).
 */
export const Dive: React.FC<{scene: Scene; prev?: Scene}> = ({scene, prev}) => {
  const p = usePaper();
  const {fonts} = useBrand();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const move = interpolate(t, [0, p.diveSeconds], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const dir = scene.rise ? -1 : 1;
  const travel = move * H * dir;
  const fromSurface = (scene.from ?? (scene.section ?? 1) - 1) === 0 && !scene.rise;
  const toSurface = scene.rise && (scene.section ?? 0) === 0;
  const wlY = fromSurface ? p.surfaceY - travel : toSurface ? p.surfaceY + H - move * H : undefined;
  const title = interpolate(t, [p.diveSeconds * 0.75, p.diveSeconds * 0.75 + 0.6], [0, 1], {...clamp, easing: ease});
  const rush = interpolate(t, [0, 0.3, p.diveSeconds, p.diveSeconds + 0.8], [0, 1, 1, 0], clamp);
  // the page we're leaving keeps playing and slides out with the camera (up when diving, down when rising)
  const prevLeft = prev && prev.type === "paper" ? prev : undefined;
  const lag = prevLeft ? Math.round((scene.start - prevLeft.start) * fps) : 0;
  return (
    <div style={{position: "absolute", inset: 0, background: p.color, overflow: "hidden"}}>
      <PaperGround shift={travel} from={wlY !== undefined ? Math.max(0, wlY) : 0} />
      {prevLeft && move < 1 ? (
        <div style={{position: "absolute", inset: 0, translate: `0 ${-travel}px`}}>
          <Sequence from={-lag} layout="none">
            <PageItems scene={prevLeft} />
          </Sequence>
        </div>
      ) : null}
      {wlY !== undefined && wlY > -40 && wlY < H + 40 ? <Waterline y={wlY} /> : null}
      <svg width={W} height={H} style={{position: "absolute", inset: 0}}>
        {Array.from({length: 46}, (_, i) => {
          const x = random(`bx${i}`) * W;
          const speed = 500 + random(`bv${i}`) * 700;
          const y = ((((random(`by${i}`) * 1400 - t * speed * dir) % 1400) + 1400) % 1400) - 160;
          const r = 2 + random(`br${i}`) * 9;
          return <circle key={i} cx={x + Math.sin(t * 3 + i) * 8} cy={y} r={r} fill="none" stroke={p.ink} strokeWidth={2} opacity={0.5 * rush} />;
        })}
      </svg>
      {scene.kicker || scene.title ? (
        <div style={{position: "absolute", left: 110, top: 420, opacity: title, translate: `0 ${(1 - title) * 40}px`}}>
          {scene.kicker ? (
            <div style={{font: `600 26px ${p.mono_family}`, letterSpacing: "0.32em", color: p.accent, marginBottom: 16}}>{scene.kicker}</div>
          ) : null}
          {scene.title ? (
            <div style={{fontFamily: fonts.title_family, fontWeight: 800, fontSize: 110, lineHeight: 1.02, color: p.ink, maxWidth: 1300, whiteSpace: "pre-line"}}>
              {scene.title}
            </div>
          ) : null}
        </div>
      ) : null}
      {(scene.items ?? []).map((it, i) => (
        <ItemView key={i} it={it} />
      ))}
    </div>
  );
};

/** Which section we're in at time t (fractional during a dive), from the timeline. */
const sectionAt = (timeline: Timeline, t: number, diveSeconds: number) => {
  let cur = 0;
  for (const s of timeline.scenes) {
    if (t < s.start) break;
    if (s.type === "dive") {
      const from = s.from ?? (s.rise ? (s.section ?? 0) + 1 : (s.section ?? 1) - 1);
      const k = interpolate(t - s.start, [0, diveSeconds], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
      cur = from + ((s.section ?? from) - from) * k;
    } else if (s.section !== undefined) {
      cur = s.section;
    }
  }
  return cur;
};

/** Always on: the FILE stamp (top left), the readout (top right) and the section ruler (right margin). */
export const PaperHUD: React.FC<{timeline: Timeline}> = ({timeline}) => {
  const p = usePaper();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const sec = sectionAt(timeline, t, p.diveSeconds);
  const n = p.sections;
  const scene = timeline.scenes.find((s) => t >= s.start && t < s.end);
  const idx = Math.round(sec);
  const moving = Math.abs(sec - idx) > 0.02;
  const depth = interpolate(sec, p.depths.map((_, i) => i), p.depths, clamp);
  const meta = timeline.meta ?? {};
  const names = meta.sections ? meta.sections.split("|") : p.sectionNames;  // per video (scenes.json meta), else brand
  const label = names[idx] ?? "";
  const status = moving ? p.status[1] : idx === 0 ? p.status[0] : p.status[2];
  const rulerTop = 150;
  const rulerH = 760;
  if (scene?.hud === false) return null;
  return (
    <div style={{position: "absolute", inset: 0, pointerEvents: "none"}}>
      {meta.file ? (
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 52,
            font: `600 22px ${p.mono_family}`,
            letterSpacing: "0.25em",
            color: p.ink,
            border: `2px solid ${p.ink}`,
            padding: "8px 14px",
            background: `${p.color}d9`,
          }}
        >
          {meta.file}
        </div>
      ) : null}
      <div style={{position: "absolute", right: 150, top: 52, textAlign: "right", font: `600 20px/1.6 ${p.mono_family}`, letterSpacing: "0.14em", color: p.soft}}>
        <div>{label}</div>
        <div style={{font: `600 56px/1 ${p.mono_family}`, color: p.accent, letterSpacing: "0.02em"}}>
          {Math.round(depth) === 0 ? "0 m" : `−${Math.abs(Math.round(depth))} m`}
        </div>
        <div>{status}</div>
      </div>
      <svg width={120} height={rulerH + 40} style={{position: "absolute", right: 30, top: rulerTop - 20, overflow: "visible"}}>
        <line x1={20} y1={20} x2={20} y2={20 + rulerH} stroke={p.ink} strokeWidth={2} />
        {Array.from({length: n * 4 + 1}, (_, i) => {
          const y = 20 + (i / (n * 4)) * rulerH;
          const major = i % 4 === 0;
          return <line key={i} x1={20} x2={major ? 46 : 32} y1={y} y2={y} stroke={p.ink} strokeWidth={major ? 2 : 1} opacity={major ? 1 : 0.5} />;
        })}
        {Array.from({length: n + 1}, (_, i) => (
          <text key={i} x={56} y={26 + (i / n) * rulerH} fontFamily={p.mono_family} fontWeight={600} fontSize={16} fill={i === idx ? p.accent : p.soft}>
            {p.rulerLabels?.[i] ?? i}
          </text>
        ))}
        <circle cx={20} cy={20 + (sec / n) * rulerH} r={11} fill={p.accent} stroke={p.ink} strokeWidth={3} />
      </svg>
    </div>
  );
};

/** Paper grain over everything (multiply). */
export const PaperGrain: React.FC = () => {
  const p = usePaper();
  const frame = useCurrentFrame();
  return (
    <svg width="100%" height="100%" style={{position: "absolute", inset: 0, opacity: p.grain, mixBlendMode: "multiply", pointerEvents: "none"}}>
      <filter id="pgrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed={Math.floor(frame / 3) % 8} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#pgrain)" />
    </svg>
  );
};

export type {Brand};
