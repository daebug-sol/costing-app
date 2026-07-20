"use client";

import { motion, useReducedMotion } from "motion/react";
import { DemoShell } from "./demo-shell";

export function CreateProjectDemo() {
  const reduce = useReducedMotion();

  return (
    <DemoShell label="Demo buat proyek costing">
      <div className="flex gap-3">
        <div className="flex w-28 flex-col gap-2 border-r border-border pr-3">
          <div className="bg-muted h-3 w-16 rounded" />
          <div className="bg-muted/70 h-8 w-full rounded-md" />
          <div className="bg-muted/50 h-8 w-full rounded-md" />
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col gap-2">
          <div className="bg-muted h-3 w-24 rounded" />
          <div className="bg-muted/60 h-20 w-full rounded-md" />
          <motion.div
            className="absolute top-8 right-2 rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground"
            animate={
              reduce
                ? undefined
                : {
                    scale: [1, 1.06, 1],
                    boxShadow: [
                      "0 0 0 0 rgba(0,0,0,0)",
                      "0 0 0 6px rgba(0,0,0,0.08)",
                      "0 0 0 0 rgba(0,0,0,0)",
                    ],
                  }
            }
            transition={
              reduce
                ? undefined
                : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            }
          >
            Tambah proyek
          </motion.div>
          {!reduce ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute size-3 rounded-full border-2 border-foreground/70 bg-foreground/20"
              animate={{
                top: ["72%", "28%", "28%"],
                right: ["40%", "12%", "12%"],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
        </div>
      </div>
    </DemoShell>
  );
}
