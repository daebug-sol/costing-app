"use client";

import { motion, useReducedMotion } from "motion/react";
import { DemoShell } from "./demo-shell";

export function ExportQuotationDemo() {
  const reduce = useReducedMotion();

  return (
    <DemoShell label="Demo ekspor quotation">
      <div className="flex flex-col gap-3">
        <div className="bg-muted/50 h-16 rounded-md border border-border" />
        <div className="flex justify-end gap-2">
          <div className="bg-muted rounded-md px-2.5 py-1 text-[10px] text-muted-foreground">
            Excel
          </div>
          <motion.div
            className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground"
            animate={
              reduce
                ? undefined
                : {
                    scale: [1, 1.06, 1],
                    y: [0, -1, 0],
                  }
            }
            transition={
              reduce
                ? undefined
                : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
            }
          >
            PDF
          </motion.div>
        </div>
        {!reduce ? (
          <motion.div
            aria-hidden
            className="text-muted-foreground text-center text-[10px]"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            Mengunduh…
          </motion.div>
        ) : (
          <p className="text-muted-foreground text-center text-[10px]">
            File siap diunduh
          </p>
        )}
      </div>
    </DemoShell>
  );
}
