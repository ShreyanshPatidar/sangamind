export type Brand = {
  name: string;
  tagline: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  motion: Record<string, number>;
  /** "drone": tense | always | off; enter/steps: opt-in default sounds (resolved by export.py) */
  sfx?: {drone?: string; droneFile?: string; enter?: Record<string, string>; steps?: Record<string, string>};
  /** the paper look (scenes "paper" and "dive"); see scenes/Paper.tsx */
  paper?: Paper;
};

export type Paper = {
  color: string;
  ink: string;
  accent: string;
  soft: string;
  line: string;
  glow: string;
  tape: string;
  highlight?: string;
  /** verdict stamps (NO EVIDENCE, ALLEGED, DENIED): the default colour of the "stamp" text style */
  danger?: string;
  shadow: string;
  grain: number;
  waterLines: number;
  photoWarmth: number;
  drift: number;
  surfaceY: number;
  diveSeconds: number;
  mono_family: string;
  mono_file: string;
  monoSize: number;
  /** number of sections below the surface, their readout names (index 0 = the surface) and depths */
  sections: number;
  sectionNames: string[];
  depths: number[];
  /** what the ruler prints at each mark (default 0..sections) */
  rulerLabels?: string[];
  /** readout status words: at the surface, moving, holding */
  status: [string, string, string];
  /** typewriter text (enter "type"): a keyboard sound in public/sfx, its volume, characters per second */
  typeSfx?: string;
  typeVolume?: number;
  typeCps?: number;
};

/** One thing on a paper page. x/y/w are in 1920x1080 page pixels; time/until are filled in by export.py from "at"/"out" cues. */
export type Item = {
  kind: "photo" | "svg" | "text" | "line" | "coin" | "glow" | "guide";
  src?: string;
  imgSize?: [number, number];
  x?: number;
  y?: number;
  w?: number;
  r?: number;
  rot?: number;
  text?: string;
  by?: string;
  caption?: string;
  tape?: boolean;
  style?: "headline" | "big" | "mono" | "kicker" | "note" | "stamp";
  size?: number;
  color?: string;
  align?: "left" | "center" | "right";
  from?: [number, number];
  to?: [number, number];
  arrow?: boolean;
  dashed?: boolean;
  width?: number;
  enter?: "drop" | "fade" | "stamp" | "pop" | "write" | "type" | "sink" | "fall";
  /** false = no keyboard sound for this typed item */
  sound?: boolean;
  seconds?: number;
  settle?: number;
  sway?: number;
  lantern?: boolean;
  flip?: boolean;
  at?: string;
  out?: string;
  time?: number;
  until?: number;
};

export type Word = {text: string; start: number; end: number; sentence: number; beat: number};
export type Sentence = {text: string; start: number; end: number; beat: number};

export type Step = {
  do: "marker" | "draw" | "car" | "callout" | "flash" | "shake" | "light" | "arrow" | "point" | "focus" | "date";
  time: number;
  delay?: number;
  marker?: string;
  route?: string;
  with?: string;
  style?: "planned" | "wrong" | "danger" | "central" | "allied" | "neutral";
  text?: string;
  sfx?: string;
  /** the sound file export.py picked (a variant of sfx) */
  sfxFile?: string;
  region?: string;
  from?: string;
  to?: string;
  point?: string;
  zoom?: number;
};

export type Scene = {
  type: "kinetic" | "counter" | "photo" | "title" | "map" | "geo" | "stamp" | "endcard" | "paper" | "dive";
  /** paper look: which section this scene is in (0 = surface), the waterline's y on surface pages, items */
  section?: number;
  from?: number;
  rise?: boolean;
  waterline?: number;
  items?: Item[];
  hud?: boolean;
  start: number;
  end: number;
  text?: string;
  to?: number;
  suffix?: string;
  label?: string;
  /** image, or a footage clip (.mp4/.webm/.mov from tools/footage.py) */
  img?: string;
  /** image behind a text scene */
  bg?: string;
  /** pixel size of img / bg, filled in by export.py */
  imgSize?: [number, number];
  /** camera push to a point of the image: [x, y, zoom], x and y as fractions of the image */
  focus?: [number, number, number];
  /** circle drawn on the image: [x, y, radius], as fractions of the image width/height */
  ring?: [number, number, number];
  note?: string;
  headline?: string;
  kicker?: string;
  enter?: "wipe" | "zoom" | "slide" | "fade";
  move?: "in" | "out" | "left" | "right";
  lines?: string[];
  map?: string;
  steps?: Step[];
  under?: string;
  title?: string;
  sfx?: string;
  sfxFile?: string;
  /** the drone plays under tense scenes only (brand sfx.drone = "tense") */
  tense?: boolean;
};

export type Timeline = {
  duration: number;
  /** per-video values from scenes.json "meta" (e.g. {"file": "FILE 004"}) */
  meta?: Record<string, string>;
  audio: string;
  brand: Brand;
  sentences: Sentence[];
  words: Word[];
  scenes: Scene[];
};

export type GeoData = {
  size: [number, number];
  attribution: string;
  land: string[];
  regions: Record<string, {label: string; center: [number, number]; paths: string[]}>;
  points: Record<string, {label: string; x: number; y: number}>;
};

export type MapData = {
  size: [number, number];
  attribution: string;
  water: string[];
  roads: Record<string, string[]>;
  routes: Record<string, [number, number][]>;
  markers: Record<string, {x: number; y: number; label: string}>;
  labels: {text: string; x: number; y: number; angle: number}[];
};
