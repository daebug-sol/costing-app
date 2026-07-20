"use client";

import { motion, useReducedMotion } from "motion/react";
import { DemoShell } from "./demo-shell";

export function EditCellDemo() {
  const reduce = useReducedMotion();

  return (
    <DemoShell label="Demo edit sel costing">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
          <span>Item</span>
          <span>Qty</span>
          <span>Harga</span>
          <span>Total</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-xs">
          <div className="bg-muted/40 rounded px-1.5 py-1">Panel</div>
          <div className="bg-muted/40 rounded px-1.5 py-1">2</div>
          <motion.div
            className="rounded border border-primary bg-primary/10 px-1.5 py-1 font-medium tabular-nums"
            animate={
              reduce
                ? undefined
                : {
                    boxShadow: [
                      "0 0 0 0 rgba(0,0,0,0)",
                      "0 0 0 4px rgba(0,0,0,0.08)",
                      "0 0 0 0 rgba(0,0,0,0)",
                    ],
                  }
            }
            transition={
              reduce
                ? undefined
                : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
            }
          >
            {reduce ? "1.250.000" : (
              <motion.span
                key="price"
                initial={false}
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                1.250.000
              </motion.span>
            )}
          </motion.div>
          <div className="bg-muted/40 rounded px-1.5 py-1 tabular-nums">2.500.000</div>
        </div>
        <p className="text-muted-foreground text-[10px]">
          Sel aktif — tekan Tab untuk pindah
        </p>
      </div>
    </DemoShell>
  );
}
