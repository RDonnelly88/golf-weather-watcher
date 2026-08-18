"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * A number that arrives rather than appears.
 *
 * Counts from `from` the first time it is drawn and between values after that,
 * so a score that changes when the tee time moves travels the distance instead
 * of flicking to the new figure.
 */
export default function Counter({
  value,
  from = 0,
  duration = 0.9,
}: {
  value: number;
  from?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : from);
  // What is on screen, not what was last asked for: a value that changes
  // mid-count has to be picked up from where the count had got to, or the
  // number jumps backwards before setting off again.
  const at = useRef(reduced ? value : from);

  useEffect(() => {
    if (reduced) {
      at.current = value;
      setShown(value);
      return;
    }

    const controls = animate(at.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (next) => {
        at.current = next;
        setShown(next);
      },
    });

    return () => controls.stop();
  }, [value, duration, reduced]);

  return <>{Math.round(shown)}</>;
}
