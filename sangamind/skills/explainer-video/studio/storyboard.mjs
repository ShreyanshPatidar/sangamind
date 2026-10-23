// Render one still per scene (no audio, no full render) so the video can be approved before rendering.
//   node storyboard.mjs <video> <outDir> [scale]
// Writes <outDir>/NN.jpg and <outDir>/frames.json; tools/storyboard.py calls this and draws the sheet.
import {bundle} from "@remotion/bundler";
import {renderStill, selectComposition} from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [video, outDir, scaleArg] = process.argv.slice(2);
if (!video || !outDir) {
  console.error("usage: node storyboard.mjs <video> <outDir> [scale]");
  process.exit(1);
}
const scale = Number(scaleArg ?? 0.33);
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const timeline = JSON.parse(fs.readFileSync(path.join(here, "public", video, "timeline.json"), "utf8"));
fs.mkdirSync(outDir, {recursive: true});

const serveUrl = await bundle({entryPoint: path.join(here, "src", "index.ts"), publicDir: path.join(here, "public")});
const inputProps = {video};
const browserExecutable = process.env.REMOTION_BROWSER ?? null; // usually unset: Remotion uses its own
const composition = await selectComposition({serveUrl, id: "Explainer", inputProps, browserExecutable});
const fps = composition.fps;
const frames = [];
for (const [i, s] of timeline.scenes.entries()) {
  // 70% into the scene: entrances finished, camera mostly arrived, rings drawn
  const t = s.start + (s.end - s.start) * 0.7;
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * fps));
  const file = path.join(outDir, `${String(i).padStart(2, "0")}.jpg`);
  await renderStill({composition, serveUrl, inputProps, frame, output: file, imageFormat: "jpeg", jpegQuality: 80, scale, browserExecutable});
  frames.push({i, file, t, start: s.start, end: s.end, type: s.type});
  process.stdout.write(`\rstill ${i + 1}/${timeline.scenes.length}`);
}
fs.writeFileSync(path.join(outDir, "frames.json"), JSON.stringify(frames, null, 1));
console.log(`\n${frames.length} stills -> ${outDir}`);
