"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const HEADING_TEXT = "Download YouTube Videos";
const CHAR_DELAY = 60;           // ms per character
const CURSOR_BLINKS_AFTER = 3;   // blinks after typing completes
const SUBTITLE_DELAY = 0.6;      // seconds after typing finishes

export function TypedHeading() {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Typing effect
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(HEADING_TEXT.slice(0, i));
      if (i >= HEADING_TEXT.length) {
        clearInterval(interval);
        // Blink cursor a few more times then hide
        let blinks = 0;
        const blinkInterval = setInterval(() => {
          blinks++;
          setCursorVisible((v) => !v);
          if (blinks >= CURSOR_BLINKS_AFTER * 2) {
            clearInterval(blinkInterval);
            setCursorVisible(false);
            setDone(true);
          }
        }, 400);
      }
    }, CHAR_DELAY);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {displayed}
        <span
          className={`ml-0.5 inline-block w-[3px] translate-y-[2px] bg-primary transition-opacity duration-100 ${
            cursorVisible ? "" : "opacity-0"
          }`}
          style={{ height: "1em" }}
        />
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={done ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: SUBTITLE_DELAY }}
        className="text-sm text-muted-foreground"
      >
        Free. No sign-up. High quality.
      </motion.p>
    </div>
  );
}
