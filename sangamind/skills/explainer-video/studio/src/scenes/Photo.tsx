import React from "react";
import {interpolate} from "remotion";
import {useBrand, useEnter} from "../brand";
import type {Scene} from "../types";
import {Picture} from "./Picture";

const ENTERS: NonNullable<Scene["enter"]>[] = ["wipe", "zoom", "slide", "fade"];

/** Archive photo: moving camera (drift or push to a point), optional ring and headline, label top left. */
export const Photo: React.FC<{scene: Scene; index: number}> = ({scene, index}) => {
  const {colors, fonts, motion} = useBrand();
  const p = useEnter(0);
  const label = useEnter(0.35);
  const enter = scene.enter ?? ENTERS[index % ENTERS.length];
  const style: React.CSSProperties =
    enter === "wipe"
      ? {clipPath: `inset(0 0 0 ${(1 - p) * 100}%)`}
      : enter === "slide"
        ? {translate: `${(1 - p) * 100}% 0`}
        : enter === "zoom"
          ? {scale: String(interpolate(p, [0, 1], [1.25, 1])), opacity: p, filter: `blur(${(1 - p) * 14}px)`}
          : {opacity: p};
  return (
    <div style={{position: "absolute", inset: 0, ...style}}>
      <Picture scene={scene} src={scene.img ?? ""} />
      {scene.label ? (
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 70,
            display: "flex",
            alignItems: "stretch",
            opacity: label,
            translate: `${(label - 1) * 60}px 0`,
          }}
        >
          <div style={{width: 8, background: colors.accent}} />
          <div
            style={{
              background: colors.background,
              color: colors.text,
              fontFamily: fonts.body_family,
              fontWeight: 700,
              fontSize: motion.labelSize,
              padding: "12px 22px",
              letterSpacing: "0.02em",
            }}
          >
            {scene.label}
          </div>
        </div>
      ) : null}
    </div>
  );
};
