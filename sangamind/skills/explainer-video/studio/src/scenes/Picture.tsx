import React, {createContext, useContext} from "react";
import {Easing, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {useBrand} from "../brand";
import type {Scene} from "../types";

/** Which video's public folder the images come from. */
export const VideoContext = createContext("");

/** A real footage clip (from tools/footage.py) instead of a still: same camera, ring and headline. */
export const isClip = (src: string) => /\.(mp4|webm|mov)$/i.test(src);

const Media: React.FC<{url: string; clip: boolean; style: React.CSSProperties}> = ({url, clip, style}) =>
  clip ? (
    <OffthreadVideo src={url} muted style={{...style, objectFit: "cover"}} />
  ) : (
    <Img src={url} style={style} />
  );

const W = 1920;
const H = 1080;

/**
 * A still image that never sits still: blurred fill behind, the picture covering (landscape) or
 * contained (portrait), and a camera that either drifts (`move`) or pushes in to a point (`focus`).
 * `ring` draws a circle on the picture and `note` labels it.
 */
export const Picture: React.FC<{scene: Scene; src: string; dim?: number}> = ({scene, src, dim = 0}) => {
  const {colors, motion} = useBrand();
  const video = useContext(VideoContext);
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const secs = scene.end - scene.start + motion.enterSeconds * 2;
  const t = interpolate(frame, [0, secs * fps], [0, 1], {extrapolateRight: "clamp"});
  const url = staticFile(`${video}/img/${src}`);
  const clip = isClip(src);

  // where the picture sits in the frame
  const [iw, ih] = scene.imgSize ?? [W, H];
  const cover = iw / ih >= motion.photoCoverAspect;
  const k = cover ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
  const bw = iw * k;
  const bh = ih * k;
  const bx = (W - bw) / 2;
  const by = (H - bh) / 2;

  // camera
  let transform: string;
  if (scene.focus) {
    const [fx, fy, zoom] = scene.focus;
    const e = interpolate(t, [0.05, 0.75], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    const z = 1 + (zoom - 1) * e + t * motion.photoZoom * 0.3;
    const cx = interpolate(e, [0, 1], [W / 2, bx + fx * bw]);
    const cy = interpolate(e, [0, 1], [H / 2, by + fy * bh]);
    transform = `translate(${W / 2 - cx * z}px, ${H / 2 - cy * z}px) scale(${z})`;
  } else {
    const z = motion.photoZoom;
    const moves = {
      in: {s: 1 + z * t, x: 0},
      out: {s: 1 + z * (1 - t), x: 0},
      left: {s: 1 + z * 0.6, x: interpolate(t, [0, 1], [2.5, -2.5])},
      right: {s: 1 + z * 0.6, x: interpolate(t, [0, 1], [-2.5, 2.5])},
    };
    const m = moves[scene.move ?? "in"];
    transform = `translate(${(m.x * W) / 100 + (W / 2) * (1 - m.s)}px, ${(H / 2) * (1 - m.s)}px) scale(${m.s})`;
  }

  // ring: drawn once the camera has mostly arrived
  const ringP = interpolate(t, [0.45, 0.65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ring = scene.ring
    ? {x: bx + scene.ring[0] * bw, y: by + scene.ring[1] * bh, r: scene.ring[2] * bw}
    : null;
  const zoomNow = scene.focus ? 1 + (scene.focus[2] - 1) * Math.min(1, t / 0.75) : 1;

  return (
    <div style={{position: "absolute", inset: 0, overflow: "hidden", background: colors.backgroundDeep}}>
      {!cover ? (
        <Media
          url={url}
          clip={clip}
          style={{
            position: "absolute",
            inset: -60,
            width: W + 120,
            height: H + 120,
            objectFit: "cover",
            filter: `blur(40px) brightness(${motion.fillBrightness}) sepia(0.4)`,
          }}
        />
      ) : null}
      <div style={{position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform}}>
        <Media
          url={url}
          clip={clip}
          style={{
            position: "absolute",
            left: bx,
            top: by,
            width: bw,
            height: bh,
            filter: clip ? "contrast(1.05) saturate(0.9)" : `sepia(${motion.photoSepia}) contrast(1.08)`,
            boxShadow: cover ? undefined : "0 30px 80px rgba(0,0,0,0.55)",
          }}
        />
        {ring ? (
          <svg width={W} height={H} style={{position: "absolute", inset: 0, overflow: "visible"}}>
            <circle
              cx={ring.x}
              cy={ring.y}
              r={ring.r}
              fill="none"
              stroke={colors.accent}
              strokeWidth={motion.ringStroke / zoomNow}
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={1 - ringP}
              transform={`rotate(-80 ${ring.x} ${ring.y})`}
              strokeLinecap="round"
            />
          </svg>
        ) : null}
      </div>
      {dim > 0 ? <div style={{position: "absolute", inset: 0, background: colors.backgroundDeep, opacity: dim}} /> : null}
      {ring && scene.note ? <Note text={scene.note} p={ringP} /> : null}
      {scene.headline ? <Headline kicker={scene.kicker} text={scene.headline} /> : null}
    </div>
  );
};

/** Small handwritten-style note under the ring, top right. */
const Note: React.FC<{text: string; p: number}> = ({text, p}) => {
  const {colors, fonts, motion} = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        right: 90,
        top: 90,
        fontFamily: fonts.body_family,
        fontWeight: 800,
        fontSize: motion.labelSize,
        letterSpacing: "0.08em",
        color: colors.backgroundDeep,
        background: colors.accent,
        padding: "10px 20px",
        opacity: p,
        translate: `0 ${(1 - p) * -20}px`,
      }}
    >
      {text}
    </div>
  );
};

/** Headline over the picture, bottom left, with a scrim so it reads. Words rise one by one. */
export const Headline: React.FC<{kicker?: string; text: string}> = ({kicker, text}) => {
  const {colors, fonts, motion} = useBrand();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rise = (delay: number) =>
    interpolate(frame, [(0.25 + delay) * fps, (0.25 + delay + motion.enterSeconds) * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  const words = text.split(" ");
  const bar = rise(0);
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to top, ${colors.backgroundDeep} 0%, transparent 55%)`,
          opacity: 0.92,
        }}
      />
      <div style={{position: "absolute", left: 110, right: 110, bottom: 120}}>
        {kicker ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontFamily: fonts.body_family,
              fontWeight: 800,
              fontSize: motion.kickerSize,
              letterSpacing: "0.25em",
              color: colors.accent,
              marginBottom: 18,
              opacity: bar,
            }}
          >
            <div style={{width: 60 * bar, height: 5, background: colors.accent}} />
            {kicker}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0 0.28em",
            fontFamily: fonts.title_family,
            fontWeight: 800,
            fontSize: motion.headlineSize,
            lineHeight: 1.05,
            color: colors.text,
            textShadow: "0 4px 30px rgba(0,0,0,0.6)",
          }}
        >
          {words.map((w, i) => {
            const p = rise(0.08 * i);
            return (
              <span key={i} style={{display: "inline-block", overflow: "hidden", paddingBottom: 6}}>
                <span style={{display: "inline-block", translate: `0 ${(1 - p) * 105}%`}}>{w}</span>
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
};
