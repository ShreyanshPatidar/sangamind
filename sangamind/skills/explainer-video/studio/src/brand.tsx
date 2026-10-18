import React, {createContext, useContext} from "react";
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {Picture} from "./scenes/Picture";
import type {Brand, Scene} from "./types";

export const BrandContext = createContext<Brand | null>(null);

export const useBrand = (): Brand => {
  const b = useContext(BrandContext);
  if (!b) throw new Error("BrandContext missing");
  return b;
};

/** 0 -> 1 over the brand's enter time, with a soft overshoot-free ease. */
export const useEnter = (delaySeconds = 0) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const {motion} = useBrand();
  return interpolate(frame, [delaySeconds * fps, (delaySeconds + motion.enterSeconds) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
};

/** A springy 0 -> 1 (with overshoot) starting at delaySeconds. */
export const usePop = (delaySeconds = 0, damping = 12) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delaySeconds * fps, fps, config: {damping, mass: 0.6}});
};

/**
 * Full-frame background: the scene's `bg` picture (dimmed, moving) or the brand's deep gradient.
 * `drift` slowly pushes in so text never sits frozen.
 */
export const Backdrop: React.FC<{children?: React.ReactNode; drift?: boolean; scene?: Scene}> = ({children, drift, scene}) => {
  const {colors, motion} = useBrand();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at 50% 40%, ${colors.background} 0%, ${colors.backgroundDeep} 100%)`,
        overflow: "hidden",
      }}
    >
      {scene?.bg ? <Picture scene={scene} src={scene.bg} dim={motion.bgDim} /> : null}
      <div style={{position: "absolute", inset: 0, scale: drift ? String(1 + (frame / fps) * motion.textDrift) : "1"}}>
        {children}
      </div>
    </div>
  );
};
