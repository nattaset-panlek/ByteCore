import { useLayoutEffect, useState, type ReactNode } from "react";
import { create } from "zustand";
import { useSettings } from "./settingsStore";

// Fixed-resolution stage. The whole OS renders at the chosen resolution and is scaled uniformly
// to fit the real window, with black bars on the spare sides. Nothing reflows when the window resizes.

export type Aspect = "16:9" | "16:10" | "21:9" | "4:3";

export const RESOLUTIONS: Record<Aspect, string[]> = {
  "16:9": ["1280x720", "1366x768", "1600x900", "1920x1080", "2560x1440"],
  "16:10": ["1280x800", "1440x900", "1680x1050", "1920x1200"],
  "21:9": ["2560x1080", "3440x1440"],
  "4:3": ["1024x768", "1280x960", "1600x1200"],
};

/** Resolution picked when the player switches to an aspect ratio. */
export const DEFAULT_RESOLUTION: Record<Aspect, string> = { "16:9": "1920x1080", "16:10": "1920x1200", "21:9": "2560x1080", "4:3": "1280x960" };

export function parseResolution(r: string): [number, number] {
  const [w, h] = r.split("x").map(Number);
  return w > 0 && h > 0 ? [w, h] : [1920, 1080];
}

interface StageState {
  w: number;
  h: number;
  scale: number;
  left: number;
  top: number;
}

export const useStage = create<StageState>(() => ({ w: 1920, h: 1080, scale: 1, left: 0, top: 0 }));

/** Current stage size in stage pixels (use instead of window.innerWidth/innerHeight). */
export const stageSize = () => {
  const { w, h } = useStage.getState();
  return { w, h };
};

/** Convert a screen point (clientX/clientY) to stage coordinates. */
export function toStage(x: number, y: number) {
  const s = useStage.getState();
  return { x: (x - s.left) / s.scale, y: (y - s.top) / s.scale };
}

/** Convert a screen distance to stage pixels. */
export const stageDelta = (d: number) => d / useStage.getState().scale;

function fit(w: number, h: number): StageState {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / w, vh / h);
  return { w, h, scale, left: Math.round((vw - w * scale) / 2), top: Math.round((vh - h * scale) / 2) };
}

export function Stage({ children }: { children: ReactNode }) {
  const resolution = useSettings((s) => s.resolution);
  const [w, h] = parseResolution(resolution);
  const [st, setSt] = useState(() => fit(w, h));

  useLayoutEffect(() => {
    const update = () => {
      const next = fit(w, h);
      useStage.setState(next);
      setSt(next);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [w, h]);

  return (
    <div className="stage-frame">
      <div className="stage" style={{ width: st.w, height: st.h, left: st.left, top: st.top, transform: `scale(${st.scale})` }}>
        {children}
      </div>
    </div>
  );
}
