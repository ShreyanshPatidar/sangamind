import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {Backdrop, useBrand, useEnter, usePop} from "../brand";
import type {Scene} from "../types";

/** Big words slamming in, one after another. */
export const Kinetic: React.FC<{scene: Scene}> = ({scene}) => {
  const {colors, fonts, motion} = useBrand();
  const words = (scene.text ?? "").split(" ");
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const drift = interpolate(frame, [0, (scene.end - scene.start) * fps], [1, 1.06]);
  return (
    <Backdrop drift scene={scene}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          gap: "0 0.32em",
          padding: "0 8%",
          scale: String(drift),
          fontFamily: fonts.title_family,
          fontWeight: 900,
          fontSize: motion.kineticSize,
          lineHeight: 1.05,
          color: colors.text,
          textAlign: "center",
        }}
      >
        {words.map((w, i) => (
          <Slam key={i} delay={i * 0.12}>
            {w}
          </Slam>
        ))}
        <div style={{flexBasis: "100%", height: 0}} />
        <Underline delay={words.length * 0.12 + 0.1} />
      </div>
    </Backdrop>
  );
};

/** Accent bar that sweeps in under kinetic text. */
const Underline: React.FC<{delay: number}> = ({delay}) => {
  const {colors, motion} = useBrand();
  const p = useEnter(delay);
  return (
    <div
      style={{
        width: motion.kineticSize * 1.8,
        height: motion.kineticSize * 0.07,
        marginTop: motion.kineticSize * 0.25,
        borderRadius: motion.kineticSize * 0.035,
        background: colors.accent,
        scale: `${p} 1`,
      }}
    />
  );
};

const Slam: React.FC<{delay: number; children: React.ReactNode}> = ({delay, children}) => {
  const p = usePop(delay, 14);
  return (
    <span
      style={{
        display: "inline-block",
        opacity: Math.min(1, p * 1.6),
        scale: String(interpolate(p, [0, 1], [1.8, 1])),
        filter: `blur(${interpolate(p, [0, 1], [12, 0], {extrapolateRight: "clamp"})}px)`,
      }}
    >
      {children}
    </span>
  );
};

/** A number counting up, with a label slamming under it. */
export const Counter: React.FC<{scene: Scene}> = ({scene}) => {
  const {colors, fonts, motion} = useBrand();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const target = scene.to ?? 0;
  const value = interpolate(frame, [0, 1.2 * fps], [0, target], {
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const label = usePop(1.0, 10);
  return (
    <Backdrop drift scene={scene}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.title_family,
          color: colors.accent,
        }}
      >
        <div style={{fontSize: motion.kineticSize * 1.3, fontWeight: 900, fontVariantNumeric: "tabular-nums"}}>
          {Math.round(value).toLocaleString("en-US")}
          {scene.suffix}
        </div>
        <div
          style={{
            fontSize: motion.kineticSize * 0.6,
            fontWeight: 900,
            letterSpacing: "0.2em",
            color: colors.text,
            opacity: label,
            scale: String(interpolate(label, [0, 1], [1.6, 1])),
          }}
        >
          {scene.label}
        </div>
      </div>
    </Backdrop>
  );
};

/** Lines rising out of a mask, with an accent rule between them. */
export const Title: React.FC<{scene: Scene}> = ({scene}) => {
  const {colors, fonts, motion} = useBrand();
  const lines = scene.lines ?? [];
  const rule = useEnter(0.25);
  return (
    <Backdrop drift scene={scene}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: motion.subtitleSize * 0.5,
          padding: "0 10%",
          textAlign: "center",
        }}
      >
        {lines.map((ln, i) => (
          <React.Fragment key={i}>
            <Rise delay={i * 0.18}>
              <div
                style={{
                  fontFamily: i === 0 ? fonts.title_family : fonts.body_family,
                  fontWeight: i === 0 ? 800 : 500,
                  fontSize: i === 0 ? motion.titleSize : motion.subtitleSize,
                  color: colors.text,
                  letterSpacing: i === 0 ? "0.02em" : "0.04em",
                  lineHeight: 1.1,
                }}
              >
                {ln}
              </div>
            </Rise>
            {i === 0 && lines.length > 1 ? (
              <div style={{width: 160 * rule, height: 6, background: colors.accent, borderRadius: 3}} />
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </Backdrop>
  );
};

const Rise: React.FC<{delay: number; children: React.ReactNode}> = ({delay, children}) => {
  const p = useEnter(delay);
  return (
    <div style={{overflow: "hidden", paddingBottom: 8}}>
      <div style={{translate: `0 ${interpolate(p, [0, 1], [110, 0])}%`, opacity: p}}>{children}</div>
    </div>
  );
};

/** A heading, then a word stamped over it with a shake. */
export const Stamp: React.FC<{scene: Scene}> = ({scene}) => {
  const {colors, fonts, motion} = useBrand();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const hit = 0.15;
  const p = usePop(hit, 9);
  const shakeT = frame - hit * fps;
  const shake = shakeT > 0 && shakeT < 10 ? Math.sin(shakeT * 2.2) * (10 - shakeT) * 1.6 : 0;
  return (
    <Backdrop drift scene={scene}>
      <div style={{position: "absolute", inset: 0, translate: `${shake}px ${shake * 0.6}px`}}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.title_family,
            fontWeight: 800,
            fontSize: motion.titleSize * 0.8,
            color: colors.text,
            opacity: 0.35,
          }}
        >
          {scene.under}
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: fonts.body_family,
              fontWeight: 900,
              fontSize: motion.kineticSize * 1.4,
              color: colors.danger,
              border: `14px solid ${colors.danger}`,
              borderRadius: 18,
              padding: "0 48px",
              letterSpacing: "0.12em",
              rotate: "-8deg",
              opacity: Math.min(1, p * 2),
              scale: String(interpolate(p, [0, 1], [3, 1])),
            }}
          >
            {scene.text}
          </div>
        </div>
      </div>
    </Backdrop>
  );
};

/** "NEXT" end card. */
export const EndCard: React.FC<{scene: Scene}> = ({scene}) => {
  const {colors, fonts, motion, name} = useBrand();
  const a = useEnter(0);
  const b = useEnter(0.3);
  return (
    <Backdrop drift scene={scene}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: fonts.body_family,
            fontWeight: 800,
            letterSpacing: "0.4em",
            fontSize: motion.subtitleSize,
            color: colors.accent,
            opacity: a,
            translate: `0 ${(1 - a) * 40}px`,
          }}
        >
          {scene.label}
        </div>
        <div
          style={{
            fontFamily: fonts.title_family,
            fontWeight: 800,
            fontSize: motion.titleSize * 0.85,
            color: colors.text,
            opacity: b,
            translate: `0 ${(1 - b) * 40}px`,
            padding: "0 8%",
            textWrap: "balance",
          }}
        >
          {scene.title}
        </div>
        <div
          style={{
            marginTop: 40,
            fontFamily: fonts.title_family,
            fontSize: motion.subtitleSize * 0.8,
            letterSpacing: "0.3em",
            color: colors.text,
            opacity: b * 0.6,
          }}
        >
          {name}
        </div>
      </div>
    </Backdrop>
  );
};
