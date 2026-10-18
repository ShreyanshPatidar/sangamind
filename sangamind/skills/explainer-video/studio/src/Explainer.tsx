import React, {useMemo} from "react";
import {Audio} from "@remotion/media";
import {loadFont} from "@remotion/fonts";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  interpolate,
  random,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {BrandContext, useBrand} from "./brand";
import {GeoScene} from "./scenes/GeoScene";
import {MapScene} from "./scenes/MapScene";
import {Photo} from "./scenes/Photo";
import {VideoContext} from "./scenes/Picture";
import {Counter, EndCard, Kinetic, Stamp, Title} from "./scenes/Text";
import type {GeoData, MapData, Scene, Timeline, Word} from "./types";

export type ExplainerProps = {
  video: string;
  timeline?: Timeline;
  maps?: Record<string, MapData | GeoData>;
};

export const calculateExplainerMetadata: CalculateMetadataFunction<ExplainerProps> = async ({props}) => {
  const timeline: Timeline = await fetch(staticFile(`${props.video}/timeline.json`)).then((r) => r.json());
  const maps: Record<string, MapData | GeoData> = {};
  for (const s of timeline.scenes) {
    if (s.map && !maps[s.map]) {
      maps[s.map] = await fetch(staticFile(`${props.video}/${s.map}`)).then((r) => r.json());
    }
  }
  return {durationInFrames: Math.ceil(timeline.duration * 30), props: {...props, timeline, maps}};
};

const loadedFonts = new Set<string>();
const ensureFont = (family: string, file: string) => {
  if (loadedFonts.has(family)) return;
  loadedFonts.add(family);
  loadFont({family, url: staticFile(file), weight: "100 900"});
};

/** Scenes whose own words are on screen: no captions over them. */
const NO_CAPTIONS: Scene["type"][] = ["kinetic", "counter", "stamp", "title", "endcard"];
export const Explainer: React.FC<ExplainerProps> = ({video, timeline, maps}) => {
  const {fps} = useVideoConfig();
  if (!timeline) return null;
  const {brand} = timeline;
  ensureFont(brand.fonts.title_family, brand.fonts.title_file);
  ensureFont(brand.fonts.body_family, brand.fonts.body_file);
  const overlap = Math.round(brand.motion.enterSeconds * fps);
  const total = Math.ceil(timeline.duration * fps);

  return (
    <VideoContext.Provider value={video}>
    <BrandContext.Provider value={brand}>
      <AbsoluteFill style={{background: brand.colors.backgroundDeep}}>
        {timeline.scenes.map((scene, i) => {
          const from = Math.max(0, Math.round(scene.start * fps) - (i === 0 ? 0 : overlap));
          const dur = Math.max(1, Math.round(scene.end * fps) - from + overlap);
          return (
            <Sequence key={i} from={from} durationInFrames={dur} premountFor={fps} name={`${i} ${scene.type}`}>
              <SceneView scene={scene} index={i} maps={maps ?? {}} />
            </Sequence>
          );
        })}
        <Overlays />
        <Captions words={timeline.words} scenes={timeline.scenes} />
        <Audio src={staticFile(`${video}/${timeline.audio}`)} volume={brand.motion.narrationVolume} />
        <Audio
          src={staticFile("sfx/drone.wav")}
          durationInFrames={total}
          volume={(f) => brand.motion.droneVolume * droneLevel(f / fps, timeline, brand.sfx?.drone ?? "tense", brand.motion.droneFade)}
        />
        {timeline.scenes.map((scene, i) => {
          const name = scene.sfxFile;
          return name ? (
            <Sequence key={`sfx${i}`} from={Math.round(scene.start * fps)} durationInFrames={2 * fps} premountFor={fps}>
              <Audio src={staticFile(`sfx/${name}`)} volume={brand.motion.sfxVolume} />
            </Sequence>
          ) : null;
        })}
        {timeline.scenes.flatMap((scene, i) =>
          (scene.steps ?? [])
            .filter((st) => st.sfxFile)
            .map((st, j) => (
              <Sequence
                key={`step${i}-${j}`}
                from={Math.round((scene.start + st.time + (st.delay ?? 0)) * fps)}
                durationInFrames={2 * fps}
                premountFor={fps}
              >
                <Audio src={staticFile(`sfx/${st.sfxFile}`)} volume={brand.motion.sfxVolume} />
              </Sequence>
            )),
        )}
      </AbsoluteFill>
    </BrandContext.Provider>
    </VideoContext.Provider>
  );
};

const SceneView: React.FC<{scene: Scene; index: number; maps: Record<string, MapData | GeoData>}> = ({
  scene,
  index,
  maps,
}) => {
  switch (scene.type) {
    case "kinetic":
      return <Kinetic scene={scene} />;
    case "counter":
      return <Counter scene={scene} />;
    case "title":
      return <Title scene={scene} />;
    case "stamp":
      return <Stamp scene={scene} />;
    case "endcard":
      return <EndCard scene={scene} />;
    case "photo":
      return <Photo scene={scene} index={index} />;
    case "map":
      return scene.map && maps[scene.map] ? <MapScene scene={scene} map={maps[scene.map] as MapData} /> : null;
    case "geo":
      return scene.map && maps[scene.map] ? <GeoScene scene={scene} map={maps[scene.map] as GeoData} /> : null;
    default:
      return null;
  }
};

/**
 * How loud the drone is at time t (0-1). "tense": only under scenes marked `tense`, fading in and out;
 * "always": the whole video; "off": never.
 */
const droneLevel = (t: number, timeline: Timeline, mode: string, fade: number) => {
  if (mode === "off") return 0;
  const edges = [0, fade, timeline.duration - fade, timeline.duration];
  if (mode === "always") return interpolate(t, edges, [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return Math.max(
    0,
    ...timeline.scenes
      .filter((s) => s.tense)
      .map((s) =>
        interpolate(t, [s.start - fade, s.start, s.end, s.end + fade], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      ),
  );
};

/** Film grain, vignette and slow dust over everything. */
const Overlays: React.FC = () => {
  const frame = useCurrentFrame();
  const {colors, motion} = useBrand();
  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      <AbsoluteFill
        style={{background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${motion.vignette}) 100%)`}}
      />
      <svg width="100%" height="100%" style={{position: "absolute", inset: 0, opacity: motion.grain, mixBlendMode: "overlay"}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 12} />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <svg width="100%" height="100%" style={{position: "absolute", inset: 0}}>
        {Array.from({length: motion.dust}, (_, i) => {
          const x = random(`x${i}`) * 1920 + Math.sin(frame / 90 + i) * 30;
          const y = (((random(`y${i}`) * 1080 - frame * (0.3 + random(`s${i}`) * 0.6)) % 1080) + 1080) % 1080;
          const flicker = 0.5 + 0.5 * Math.sin(frame / 20 + i * 1.7);
          return <circle key={i} cx={x} cy={y} r={1 + random(`r${i}`) * 2.2} fill={colors.text} opacity={motion.dustOpacity * flicker} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

type Chunk = {words: Word[]; start: number; end: number};

/** Word-by-word captions: the spoken word lights up in the accent colour. */
const Captions: React.FC<{words: Word[]; scenes: Scene[]}> = ({words, scenes}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {colors, fonts, motion} = useBrand();
  const t = frame / fps;
  const chunks = useMemo(() => {
    const out: Chunk[] = [];
    const bySentence = new Map<number, Word[]>();
    words.forEach((w) => bySentence.set(w.sentence, [...(bySentence.get(w.sentence) ?? []), w]));
    for (const ws of bySentence.values()) {
      const n = Math.ceil(ws.length / motion.captionMaxWords);
      const size = Math.ceil(ws.length / n);
      for (let i = 0; i < ws.length; i += size) {
        const part = ws.slice(i, i + size);
        out.push({words: part, start: part[0].start, end: part[part.length - 1].end});
      }
    }
    return out.map((c, i) => ({...c, end: Math.min(out[i + 1]?.start ?? c.end + 0.4, c.end + 0.4)}));
  }, [words, motion.captionMaxWords]);
  const scene = scenes.find((s) => t >= s.start && t < s.end);
  if (!motion.captions) return null;
  if (scene && (NO_CAPTIONS.includes(scene.type) || scene.headline || scene.bg)) return null;
  const chunk = chunks.find((c) => t >= c.start && t < c.end);
  if (!chunk) return null;
  return (
    <AbsoluteFill style={{justifyContent: "flex-end", alignItems: "center", paddingBottom: motion.captionBottom}}>
      <div
        style={{
          padding: "6px 18px",
          fontFamily: fonts.body_family,
          fontWeight: 700,
          textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.9)",
          fontSize: motion.captionSize,
          color: colors.text,
          maxWidth: "80%",
          textAlign: "center",
          lineHeight: 1.25,
        }}
      >
        {chunk.words.map((w, i) => {
          const active = t >= w.start && t < (chunk.words[i + 1]?.start ?? chunk.end);
          return (
            <span
              key={i}
              style={{
                color: active ? colors.accent : colors.text,
              }}
            >
              {w.text}
              {i < chunk.words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
