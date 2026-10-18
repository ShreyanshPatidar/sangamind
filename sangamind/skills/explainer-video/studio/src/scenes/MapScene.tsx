import React from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {Backdrop, useBrand, useEnter} from "../brand";
import type {MapData, Scene, Step} from "../types";

type Pt = [number, number];

const length = (pts: Pt[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

/** Point and heading at distance d along a polyline. */
const along = (pts: Pt[], d: number): {x: number; y: number; angle: number} => {
  let left = Math.max(0, d);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    if (left <= seg || i === pts.length - 1) {
      const f = seg === 0 ? 0 : Math.min(1, left / seg);
      return {x: ax + (bx - ax) * f, y: ay + (by - ay) * f, angle};
    }
    left -= seg;
  }
  return {x: pts[0][0], y: pts[0][1], angle: 0};
};

const d = (pts: Pt[]) => "M" + pts.map((p) => p.join(",")).join(" L");

/** Animated map: routes draw themselves, a car drives, markers pulse, callouts pop. */
export const MapScene: React.FC<{scene: Scene; map: MapData}> = ({scene, map}) => {
  const {colors, fonts, motion} = useBrand();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const steps = scene.steps ?? [];
  const at = (s: Step) => s.time + (s.delay ?? 0);
  const since = (s: Step) => t - at(s);
  const prog = (s: Step | undefined, secs: number) =>
    s ? interpolate(since(s), [0, secs], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)}) : 0;
  const find = (pred: (s: Step) => boolean) => steps.find(pred);
  const enter = useEnter(0);

  // the car: along the approach route, into the wrong turn, then backing up when it stalls
  const carStep = find((s) => s.do === "car");
  const wrongStep = find((s) => s.do === "draw" && s.style === "wrong");
  const stallStep = find((s) => s.do === "shake");
  const approach = carStep?.route ? map.routes[carStep.route] : undefined;
  const wrong = wrongStep?.route ? map.routes[wrongStep.route] : undefined;
  let car: {x: number; y: number; angle: number} | null = null;
  let trail: {pts: Pt[]; drawn: number} | null = null;
  if (approach && carStep && t >= at(carStep)) {
    const la = length(approach);
    const full: Pt[] = wrong ? [...approach, ...wrong.slice(1)] : approach;
    let dist = la * prog(carStep, 3.2);
    if (wrong && wrongStep) dist += length(wrong) * 0.7 * prog(wrongStep, 2.2);
    const furthest = dist;
    if (wrong && stallStep) dist -= length(wrong) * 0.45 * prog(stallStep, 1.0);
    car = along(full, dist);
    trail = {pts: full, drawn: furthest};
  }

  // camera: whole area first, then push in on the corner when the car sets off
  const corner = map.markers.corner ?? {x: map.size[0] / 2, y: map.size[1] / 2};
  const push = carStep ? prog(carStep, 2.5) : 0;
  const zoom = interpolate(push, [0, 1], [1.05, 2.1]);
  const cx = interpolate(push, [0, 1], [map.size[0] / 2, corner.x]);
  const cy = interpolate(push, [0, 1], [map.size[1] / 2, corner.y]);
  let shakeX = 0;
  if (stallStep && since(stallStep) > 0 && since(stallStep) < 0.6) {
    const k = since(stallStep) * fps;
    shakeX = Math.sin(k * 2.4) * (18 - k);
  }

  const routeStroke = (style?: string) =>
    style === "wrong" ? colors.danger : style === "planned" ? colors.text : colors.accent;

  return (
    <Backdrop>
      <svg
        viewBox={`0 0 ${map.size[0]} ${map.size[1]}`}
        style={{position: "absolute", inset: 0, width: "100%", height: "100%", opacity: enter}}
      >
        <g
          transform={`translate(${map.size[0] / 2 + shakeX} ${map.size[1] / 2}) scale(${zoom}) translate(${-cx} ${-cy})`}
        >
          {map.water.map((w, i) => (
            <path key={i} d={w} fill={colors.mapWater} />
          ))}
          {map.roads.minor?.map((r, i) => (
            <path key={i} d={r} stroke={colors.mapRoadMinor} strokeWidth={2.5 / zoom} fill="none" />
          ))}
          {map.roads.major?.map((r, i) => (
            <path key={i} d={r} stroke={colors.mapRoadMajor} strokeWidth={6 / zoom} fill="none" strokeLinecap="round" />
          ))}
          {map.labels.map((l, i) => (
            <text
              key={i}
              x={l.x}
              y={l.y}
              transform={`rotate(${l.angle} ${l.x} ${l.y})`}
              fill={colors.text}
              opacity={0.55}
              fontFamily={fonts.body_family}
              fontWeight={700}
              fontSize={22 / Math.sqrt(zoom)}
              letterSpacing="0.25em"
              textAnchor="middle"
            >
              {l.text}
            </text>
          ))}
          {steps
            .filter((s) => s.do === "draw" && s.route)
            .flatMap((s) => [s.route!, ...(s.with ? [s.with] : [])].map((r) => ({s, r})))
            .map(({s, r}, i) => {
              const pts = map.routes[r];
              const len = length(pts);
              const p = prog(s, 1.6);
              return (
                <path
                  key={i}
                  d={d(pts)}
                  fill="none"
                  stroke={routeStroke(s.style)}
                  strokeOpacity={s.style === "planned" ? 0.6 : 1}
                  strokeWidth={(s.style === "planned" ? 7 : 10) / zoom}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={len}
                  strokeDashoffset={len * (1 - p)}
                />
              );
            })}
          {steps
            .filter((s) => s.do === "marker" && s.marker && map.markers[s.marker])
            .map((s, i) => {
              const m = map.markers[s.marker!];
              const pop = spring({frame: frame - at(s) * fps, fps, config: {damping: 10}});
              const pulse = ((t - at(s)) % 1.4) / 1.4;
              const col = s.style === "danger" ? colors.danger : colors.accent;
              return t < at(s) ? null : (
                <g key={i}>
                  <circle cx={m.x} cy={m.y} r={(16 + pulse * 40) / zoom} fill="none" stroke={col} strokeWidth={4 / zoom} opacity={1 - pulse} />
                  <circle cx={m.x} cy={m.y} r={(14 * pop) / zoom} fill={col} stroke={colors.text} strokeWidth={4 / zoom} />
                  <text
                    x={s.style === "danger" ? m.x - 30 / zoom : m.x}
                    y={s.style === "danger" ? m.y + 10 / zoom : m.y - 34 / zoom}
                    fill={colors.text}
                    fontFamily={fonts.body_family}
                    fontWeight={800}
                    fontSize={30 / zoom}
                    textAnchor={s.style === "danger" ? "end" : "middle"}
                    opacity={pop}
                    paintOrder="stroke"
                    stroke={colors.backgroundDeep}
                    strokeWidth={8 / zoom}
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
          {trail ? (
            <path
              d={d(trail.pts)}
              fill="none"
              stroke={colors.accent}
              strokeWidth={9 / zoom}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={length(trail.pts)}
              strokeDashoffset={length(trail.pts) - trail.drawn}
            />
          ) : null}
          {car ? (
            <g transform={`translate(${car.x} ${car.y}) rotate(${car.angle})`}>
              <rect x={-22 / zoom} y={-11 / zoom} width={44 / zoom} height={22 / zoom} rx={6 / zoom} fill={colors.text} stroke={colors.backgroundDeep} strokeWidth={3 / zoom} />
              <rect x={6 / zoom} y={-8 / zoom} width={10 / zoom} height={16 / zoom} rx={2 / zoom} fill={colors.accent} />
            </g>
          ) : null}
        </g>
      </svg>
      {steps
        .filter((s) => s.do === "callout" && since(s) >= 0 && since(s) < 2.6)
        .map((s, i) => {
          const pop = spring({frame: frame - at(s) * fps, fps, config: {damping: 11}});
          const out = interpolate(since(s), [2.2, 2.6], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 110,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                opacity: out,
              }}
            >
              <div
                style={{
                  background: s.text?.includes("!") ? colors.danger : colors.accent,
                  color: colors.dark,
                  fontFamily: fonts.body_family,
                  fontWeight: 900,
                  fontSize: motion.subtitleSize,
                  letterSpacing: "0.08em",
                  padding: "14px 34px",
                  borderRadius: 10,
                  scale: String(interpolate(pop, [0, 1], [0.6, 1])),
                  rotate: s.text?.includes("!") ? "-3deg" : "0deg",
                }}
              >
                {s.text}
              </div>
            </div>
          );
        })}
      {steps
        .filter((s) => s.do === "flash")
        .map((s, i) => {
          const o = interpolate(since(s), [0, 0.04, 0.22], [0, 0.9, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
          return o > 0 ? <div key={i} style={{position: "absolute", inset: 0, background: colors.text, opacity: o}} /> : null;
        })}
      <div
        style={{
          position: "absolute",
          right: 24,
          bottom: 16,
          fontFamily: fonts.body_family,
          fontSize: motion.attributionSize,
          color: colors.text,
          opacity: 0.5,
        }}
      >
        {map.attribution}
      </div>
    </Backdrop>
  );
};
