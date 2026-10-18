import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {Backdrop, useBrand, useEnter} from "../brand";
import type {GeoData, Scene} from "../types";

type Cam = {x: number; y: number; z: number};

/**
 * Country map: regions light up, arrows draw from one to another, points pulse, a date chip
 * changes, and the camera moves between `focus` steps.
 */
export const GeoScene: React.FC<{scene: Scene; map: GeoData}> = ({scene, map}) => {
  const {colors, fonts, motion} = useBrand();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const [W, H] = map.size;
  const steps = (scene.steps ?? []).map((s) => ({...s, at: s.time + (s.delay ?? 0)}));
  const done = (s: {at: number}, secs: number) =>
    interpolate(t - s.at, [0, secs], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
  const enter = useEnter(0);
  const place = (id?: string): [number, number] => {
    if (id && map.regions[id]) return map.regions[id].center;
    if (id && map.points[id]) return [map.points[id].x, map.points[id].y];
    return [W / 2, H / 2];
  };

  // camera: starts slightly wide, eases between focus steps, always drifting a little
  let cam: Cam = {x: W / 2, y: H / 2, z: 1.0};
  for (const s of steps.filter((x) => x.do === "focus")) {
    const [x, y] = place(s.region ?? s.point);
    const target = {x, y, z: s.zoom ?? 1};
    const p = done(s, motion.geoCameraSeconds);
    cam = {x: cam.x + (target.x - cam.x) * p, y: cam.y + (target.y - cam.y) * p, z: cam.z + (target.z - cam.z) * p};
  }
  const z = cam.z * (1 + t * motion.textDrift);
  const transform = `translate(${W / 2 - cam.x * z}px, ${H / 2 - cam.y * z}px) scale(${z})`;

  // lit regions: last light step for each region wins
  const lit: Record<string, {style: string; p: number; at: number}> = {};
  for (const s of steps.filter((x) => x.do === "light" && x.region && t >= x.at)) {
    lit[s.region!] = {style: s.style ?? "danger", p: done(s, 0.6), at: s.at};
  }
  const fillFor = (style: string) =>
    style === "allied" ? colors.mapAllied : style === "neutral" ? colors.mapNeutral : colors.mapCentral;

  const date = [...steps].reverse().find((s) => s.do === "date" && t >= s.at);

  return (
    <Backdrop>
      <div style={{position: "absolute", inset: 0, opacity: enter, background: colors.mapSea}}>
        <svg width={W} height={H} style={{position: "absolute", inset: 0}}>
          <g transform={transform}>
            {map.land.map((d, i) => (
              <path key={`l${i}`} d={d} fill={colors.mapLand} stroke={colors.mapBorder} strokeWidth={1.2 / z} />
            ))}
            {Object.entries(map.regions).map(([id, r]) => {
              const l = lit[id];
              return r.paths.map((d, i) => (
                <path
                  key={`${id}${i}`}
                  d={d}
                  fill={l ? mix(colors.mapLand, fillFor(l.style), l.p) : colors.mapLand}
                  stroke={colors.mapBorder}
                  strokeWidth={1.2 / z}
                />
              ));
            })}
            {steps
              .filter((s) => s.do === "arrow" && t >= s.at)
              .map((s, i) => (
                <Arrow key={`a${i}`} from={place(s.from)} to={place(s.to)} p={done(s, 0.9)} z={z} danger={s.style !== "allied"} />
              ))}
            {steps
              .filter((s) => s.do === "point" && s.point && t >= s.at)
              .map((s, i) => (
                <Pulse key={`p${i}`} at={place(s.point)} since={t - s.at} z={z} label={map.points[s.point!]?.label} />
              ))}
            {Object.entries(lit).map(([id, l]) => (
              <RegionLabel key={`t${id}`} at={map.regions[id].center} text={map.regions[id].label} since={t - l.at} z={z} />
            ))}
          </g>
        </svg>
        {date ? <DateChip key={date.text} text={date.text ?? ""} since={t - date.at} /> : null}
        <div
          style={{
            position: "absolute",
            right: 24,
            bottom: 16,
            fontFamily: fonts.body_family,
            fontSize: motion.attributionSize,
            color: colors.text,
            opacity: 0.55,
          }}
        >
          {map.attribution}
        </div>
      </div>
    </Backdrop>
  );
};

/** Blend two #rrggbb colours. */
const mix = (a: string, b: string, p: number) => {
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${ca.map((v, i) => Math.round(v + (cb[i] - v) * p)).join(",")})`;
};

const Arrow: React.FC<{from: [number, number]; to: [number, number]; p: number; z: number; danger: boolean}> = ({
  from,
  to,
  p,
  z,
  danger,
}) => {
  const {colors, motion} = useBrand();
  const [ax, ay] = from;
  const [bx, by] = to;
  // bend the arrow sideways a little so it reads as movement
  const cx = (ax + bx) / 2 - (by - ay) * 0.2;
  const cy = (ay + by) / 2 + (bx - ax) * 0.2;
  const q = (u: number) => ({
    x: (1 - u) ** 2 * ax + 2 * (1 - u) * u * cx + u ** 2 * bx,
    y: (1 - u) ** 2 * ay + 2 * (1 - u) * u * cy + u ** 2 * by,
  });
  const tip = q(Math.max(0.02, p));
  const back = q(Math.max(0, p - 0.02));
  const angle = (Math.atan2(tip.y - back.y, tip.x - back.x) * 180) / Math.PI;
  const color = danger ? colors.danger : colors.accent;
  const w = motion.arrowWidth / z;
  return (
    <g>
      <path
        d={`M${ax},${ay} Q${cx},${cy} ${bx},${by}`}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={1 - p}
      />
      <polygon
        points={`0,${-w * 1.8} ${w * 3},0 0,${w * 1.8}`}
        fill={color}
        transform={`translate(${tip.x},${tip.y}) rotate(${angle})`}
      />
    </g>
  );
};

const Pulse: React.FC<{at: [number, number]; since: number; z: number; label?: string}> = ({at, since, z, label}) => {
  const {colors, fonts, motion} = useBrand();
  const {fps} = useVideoConfig();
  const pop = spring({frame: since * fps, fps, config: {damping: 10, mass: 0.6}});
  const wave = (since % 1.4) / 1.4;
  const r = 10 / z;
  return (
    <g transform={`translate(${at[0]},${at[1]})`}>
      <circle r={r * (1 + wave * 3)} fill="none" stroke={colors.accent} strokeWidth={2 / z} opacity={1 - wave} />
      <circle r={r * pop} fill={colors.accent} />
      {label ? (
        <text
          x={r * 1.8}
          y={-r * 1.4}
          fill={colors.text}
          fontFamily={fonts.body_family}
          fontWeight={800}
          fontSize={motion.labelSize / z}
          opacity={pop}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

const RegionLabel: React.FC<{at: [number, number]; text: string; since: number; z: number}> = ({at, text, since, z}) => {
  const {colors, fonts, motion} = useBrand();
  const {fps} = useVideoConfig();
  const pop = spring({frame: since * fps - 6, fps, config: {damping: 12, mass: 0.6}});
  return (
    <text
      x={at[0]}
      y={at[1]}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={colors.text}
      fontFamily={fonts.body_family}
      fontWeight={900}
      letterSpacing="0.08em"
      fontSize={(motion.geoLabelSize / z) * (0.6 + 0.4 * pop)}
      opacity={Math.min(1, pop)}
      style={{paintOrder: "stroke", stroke: colors.backgroundDeep, strokeWidth: 6 / z}}
    >
      {text}
    </text>
  );
};

/** Date in the top-left corner; each new date slides up over the last. */
const DateChip: React.FC<{text: string; since: number}> = ({text, since}) => {
  const {colors, fonts, motion} = useBrand();
  const p = interpolate(since, [0, motion.enterSeconds], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <div style={{position: "absolute", left: 70, top: 60, overflow: "hidden", paddingBottom: 6}}>
      <div
        style={{
          translate: `0 ${(1 - p) * 110}%`,
          fontFamily: fonts.title_family,
          fontWeight: 800,
          fontSize: motion.dateSize,
          color: colors.text,
          borderLeft: `8px solid ${colors.accent}`,
          paddingLeft: 22,
          background: colors.backgroundDeep,
          paddingRight: 26,
        }}
      >
        {text}
      </div>
    </div>
  );
};
