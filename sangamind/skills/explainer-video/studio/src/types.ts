export type Brand = {
  name: string;
  tagline: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  motion: Record<string, number>;
  /** "drone": tense | always | off; enter/steps: opt-in default sounds (resolved by export.py) */
  sfx?: {drone?: string; enter?: Record<string, string>; steps?: Record<string, string>};
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
  type: "kinetic" | "counter" | "photo" | "title" | "map" | "geo" | "stamp" | "endcard";
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
