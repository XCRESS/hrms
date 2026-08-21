import { useEffect, useState, ReactNode } from "react";
import clsx from "clsx";

interface AnimationConfig {
  configuration: number;
  roundness: number;
}

const combinations: AnimationConfig[] = [
  { configuration: 1, roundness: 1 },
  { configuration: 1, roundness: 2 },
  { configuration: 1, roundness: 4 },
  { configuration: 2, roundness: 2 },
  { configuration: 2, roundness: 3 },
  { configuration: 3, roundness: 3 },
];

const getRandomIndex = (prev: number): number => {
  let next = prev;
  while (next === prev) {
    next = Math.floor(Math.random() * combinations.length);
  }
  return next;
};

const shapeBase = "absolute transition-all duration-[750ms] ease-in-out";

const shapeColors = [
  "bg-[rgb(176,190,197)] z-[2]", // Shape 1: light gray-blue
  "bg-[rgb(245,245,245)] z-[2]", // Shape 2: very light gray/white
  "bg-[rgb(155,93,229)] z-[1]",  // Shape 3: purple
  "bg-[rgb(241,91,181)] z-[2]",  // Shape 4: pink
  "bg-[rgb(254,228,64)] z-[2]",  // Shape 5: yellow
  "bg-[rgb(0,187,249)] z-[2]",   // Shape 6: blue
  "bg-[rgb(0,245,212)] z-[2]",   // Shape 7: teal/cyan
];

interface LoaderGateProps {
  children: ReactNode;
}

// Held long enough that the 800ms shape interval lands one full transition —
// below this the loader reads as a flash rather than an intro.
const MIN_VISIBLE_MS = 900;
// Must match the duration-500 on the overlay below.
const FADE_OUT_MS = 500;

/**
 * Overlays the app while the first lazy route chunk loads.
 *
 * Deliberately an overlay and not a gate: `children` mount on the first render
 * so `lazy()` starts fetching immediately. Gating them behind a timer meant the
 * chunk request only began once the timer fired, which serialized this animation
 * against the Suspense fallback and showed the user two loaders back to back.
 */
const LoaderGate = ({ children }: LoaderGateProps) => {
  const [config, setConfig] = useState<AnimationConfig>(combinations[0]);
  // 'visible' -> 'fading' -> 'done'. Unmounts only after the fade finishes.
  const [phase, setPhase] = useState<"visible" | "fading" | "done">("visible");

  // Animate
  useEffect(() => {
    if (phase === "done") return;
    let prev = 0;
    const interval = setInterval(() => {
      const index = getRandomIndex(prev);
      setConfig(combinations[index]);
      prev = index;
    }, 800);
    return () => clearInterval(interval);
  }, [phase]);

  // Suspense resolves whenever the chunk lands — on a warm cache that can be a
  // few ms, so hold a floor before starting the fade to avoid a visible blink.
  useEffect(() => {
    const toFade = setTimeout(() => setPhase("fading"), MIN_VISIBLE_MS);
    return () => clearTimeout(toFade);
  }, []);

  useEffect(() => {
    if (phase !== "fading") return;
    const toDone = setTimeout(() => setPhase("done"), FADE_OUT_MS);
    return () => clearTimeout(toDone);
  }, [phase]);

  return (
    <>
      {children}
      {phase !== "done" && (
        <div
          className={clsx(
            // Backdrop is intentionally a fixed dark stage rather than a theme
            // token — the shapes are saturated brand colors that lose contrast
            // against a light background. Do not swap this for bg-background.
            "fixed inset-0 z-9999 grid place-items-center bg-[rgb(19,19,19)] overflow-hidden",
            "transition-opacity duration-500 ease-out",
            phase === "fading" ? "opacity-0" : "opacity-100"
          )}
          // Decorative: the app underneath is the real content.
          aria-hidden="true"
        >
          <div className="relative w-[90vmin] aspect-[1.618] max-w-md">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={clsx(
                  shapeBase,
                  shapeColors[i],
                  getShapeStyles(config.configuration, i + 1),
                  getRoundnessStyles(config.roundness, i + 1)
                )}
              ></div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// Dynamic layout (instead of CSS data attributes)
const getShapeStyles = (config: number, index: number): string => {
  const styles: Record<number, string[]> = {
    1: [
      "left-0 top-0 h-1/2 w-[20%]",
      "left-[20%] top-0 h-1/2 w-[30%]",
      "left-[50%] top-0 h-full w-1/2",
      "left-0 top-1/2 h-1/2 w-[30%]",
      "left-[30%] top-1/2 h-1/2 w-[20%]",
      "left-[70%] top-1/2 h-1/2 w-[30%]",
      "left-[85%] top-[75%] h-[25%] w-[15%]",
    ],
    2: [
      "left-[25%] top-[20%] h-[80%] w-[15%]",
      "left-[40%] top-[20%] h-1/2 w-[10%]",
      "left-[50%] top-0 h-full w-[25%]",
      "left-0 top-0 h-1/2 w-[10%]",
      "left-[10%] top-0 h-[70%] w-[15%]",
      "left-[75%] top-[10%] h-[80%] w-[15%]",
      "left-[90%] top-[40%] h-[60%] w-[10%]",
    ],
    3: [
      "left-0 top-[16.5%] h-[32%] w-[20%]",
      "left-[20%] top-[2.7%] h-[55%] w-[34%]",
      "left-[38%] top-0 h-full w-[62%]",
      "left-0 top-[47.3%] h-[55%] w-[34%]",
      "left-[34%] top-[56.4%] h-[32%] w-[20%]",
      "left-[66%] top-[45%] h-[55%] w-[34%]",
      "left-[80%] top-[68%] h-[32%] w-[20%]",
    ],
  };

  return styles[config]?.[index - 1] || "";
};

// Roundness styles
const getRoundnessStyles = (roundness: number, index: number): string => {
  const base: Record<number, string | Record<number, string>> = {
    1: "rounded-[6rem]",
    2: "rounded-none",
    3: "rounded-[30rem]",
    4: {
      1: "rounded-bl-[10rem]",
      2: "rounded-[20rem]",
      3: "rounded-tr-[12rem]",
      4: "rounded-tr-[10rem] rounded-br-[10rem]",
      5: "rounded-bl-[10rem]",
      6: "rounded-tl-[16rem]",
      7: "rounded-tl-[10rem]",
    },
  };

  if (roundness === 4) {
    const roundness4Styles = base[4] as Record<number, string>;
    return roundness4Styles[index] || "";
  }
  return (base[roundness] as string) || "";
};

export default LoaderGate;