"use client";

import { motion, useReducedMotion } from "motion/react";
import { DemoShell } from "./demo-shell";

export function FolderFileDemo() {
  const reduce = useReducedMotion();

  return (
    <DemoShell label="Demo folder dan file database">
      <div className="flex gap-3">
        <div className="flex w-28 flex-col gap-2">
          <div className="text-muted-foreground text-[10px]">Folder</div>
          <motion.div
            className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-[10px] font-medium"
            animate={reduce ? undefined : { opacity: [0.7, 1, 0.7] }}
            transition={
              reduce
                ? undefined
                : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            }
          >
            Harga AHU
          </motion.div>
          <div className="bg-muted/50 rounded-md px-2 py-1.5 text-[10px] text-muted-foreground">
            Custom
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-muted-foreground text-[10px]">File</div>
            <motion.span
              className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground"
              animate={
                reduce
                  ? undefined
                  : { scale: [1, 1.05, 1] }
              }
              transition={
                reduce
                  ? undefined
                  : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
              }
            >
              File baru
            </motion.span>
          </div>
          <div className="bg-muted/50 h-8 rounded-md" />
          <motion.div
            className="h-8 rounded-md border border-dashed border-primary/50 bg-primary/5"
            animate={
              reduce
                ? undefined
                : { opacity: [0.35, 1, 0.35] }
            }
            transition={
              reduce
                ? undefined
                : { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
            }
          />
        </div>
      </div>
    </DemoShell>
  );
}
