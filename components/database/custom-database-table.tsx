"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { columnHeaderToVariableKey, FIXED_UOMS } from "@/lib/custom-db";
import { cn } from "@/lib/utils";
import { PAGE_SIZE, getGridCellInteractionClasses, getRefToneClasses, tokenizeFormulaBody, isLocked, isNumericKind, parseDropdownOptions, getCellRenderMode, normalizeNumericOnBlur, cellInputDisplay } from "./custom-database-shared";
import type { PanelCtx } from "./use-custom-database";

export function CustomDatabaseTable({ ed }: { ed: PanelCtx }) {
  const {
    table,
    setTable,
    setInsertRef,
    selectedCell,
    setSelectedCell,
    gridPage,
    fillPreview,
    focusedCell,
    setFocusedCell,
    formulaRefSelecting,
    setFormulaRefSelecting,
    formulaInputRef,
    skipBlurCommitRef,
    rows,
    columns,
    focusCellInput,
    activeFormulaRefs,
    visibleRows,
    getCell,
    insertVarKeyAtCursor,
    updateCell,
    renameColumn,
    clearCell,
    startFillDrag,
    openContextMenu,
  } = ed;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  onMouseDownCapture={(e) => {
                    if (!focusedCell || !table) return;
                    const fr = table.rows.find((r) => r.id === focusedCell.rowId);
                    if (!fr) return;
                    const fc = getCell(fr, focusedCell.columnId);
                    const raw = fc?.rawValue ?? "";
                    if (!String(raw).trimStart().startsWith("=")) return;
                    const key = columnHeaderToVariableKey(col.header);
                    if (!key) return;
                    e.preventDefault();
                    e.stopPropagation();
                    insertVarKeyAtCursor(key);
                  }}
                  onContextMenu={(e) => openContextMenu(e, { columnId: col.id })}
                  className={`sticky top-0 z-30 px-4 py-2.5 text-left font-medium ${
                    isLocked(col.id)
                      ? "border-2 border-primary bg-primary text-primary-foreground"
                      : "border-b border-r bg-muted"
                  }`}
                >
                  {isLocked(col.id) ? (
                    <span>{col.header}</span>
                  ) : (
                    <Input
                      value={col.header}
                      onChange={(e) =>
                        setTable((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            columns: prev.columns.map((c) =>
                              c.id === col.id ? { ...c, header: e.target.value } : c
                            ),
                          };
                        })
                      }
                      onBlur={(e) => void renameColumn(col.id, e.target.value)}
                      className="h-7 rounded-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, localRowIdx) => {
              const globalRowIndex = gridPage * PAGE_SIZE + localRowIdx;
              return (
                <tr
                  key={row.id}
                  data-custom-row-index={globalRowIndex}
                  onContextMenu={(e) => openContextMenu(e, { rowId: row.id })}
                >
                  {columns.map((col, colIdx) => {
                    const cell = getCell(row, col.id);
                    const focused =
                      focusedCell?.rowId === row.id && focusedCell?.columnId === col.id;
                    const display = cellInputDisplay(cell, col, focused);
                    const renderMode = getCellRenderMode(col);
                    const cellValue = cell?.rawValue ?? "";
                    const colKind = col.kind ?? "text";
                    const fp = fillPreview;
                    const inFill =
                      fp &&
                      globalRowIndex >= Math.min(fp.r0, fp.r1) &&
                      globalRowIndex <= Math.max(fp.r0, fp.r1) &&
                      colIdx >= Math.min(fp.c0, fp.c1) &&
                      colIdx <= Math.max(fp.c0, fp.c1);
                    const varKey = columnHeaderToVariableKey(col.header);
                    const refColorIndex =
                      activeFormulaRefs?.rowId === row.id
                        ? activeFormulaRefs.colorByKey.get(varKey.toLowerCase())
                        : undefined;
                    const refCellClass =
                      refColorIndex === undefined
                        ? ""
                        : getRefToneClasses(refColorIndex).cellClass;
                    const refCellBorderClass =
                      refColorIndex === undefined ? "" : getRefToneClasses(refColorIndex).borderClass;
                    const formulaTextColorClass =
                      refColorIndex === undefined
                        ? "text-primary"
                        : getRefToneClasses(refColorIndex).formulaTextClass;
                    const isFormulaCell =
                      activeFormulaRefs?.rowId === row.id &&
                      activeFormulaRefs.formulaColumnId === col.id;
                    const isActiveCell =
                      focused ||
                      (selectedCell?.rowId === row.id && selectedCell?.columnId === col.id);
                    const isFormulaRefTarget =
                      !isActiveCell &&
                      formulaRefSelecting?.rowId === row.id &&
                      formulaRefSelecting?.columnId === col.id;
                    const formulaRaw = String(cell?.rawValue ?? "");
                    const showFormulaTokenColors =
                      isFormulaCell && focused && formulaRaw.trimStart().startsWith("=");
                    return (
                      <td
                        key={col.id}
                        data-custom-col-index={colIdx}
                        title="Double-click untuk mengedit sel"
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          focusCellInput(row.id, col.id);
                        }}
                        onMouseDownCapture={(e) => {
                          const t = e.target as HTMLElement;
                          if (t.closest("[data-fill-handle]")) return;
                          if (!focusedCell || focusedCell.rowId !== row.id) return;
                          if (focusedCell.columnId === col.id) return;
                          if (!table) return;
                          const fr = table.rows.find((r) => r.id === focusedCell.rowId);
                          if (!fr) return;
                          const fc = getCell(fr, focusedCell.columnId);
                          const raw = fc?.rawValue ?? "";
                          if (!String(raw).trimStart().startsWith("=")) return;
                          const key = columnHeaderToVariableKey(col.header);
                          if (!key) return;
                          e.preventDefault();
                          e.stopPropagation();
                          insertVarKeyAtCursor(key);
                        }}
                        onContextMenu={(e) => openContextMenu(e, { rowId: row.id, columnId: col.id })}
                        className={cn(
                          "relative border-b border-r border-border/80 px-2 py-1",
                          getGridCellInteractionClasses({
                            isActive: isActiveCell,
                            isEditing: focused,
                            inFill: Boolean(inFill),
                            isFormulaRefTarget,
                            refCellClass: refColorIndex !== undefined ? refCellClass : "",
                            refCellBorderClass:
                              refColorIndex !== undefined ? refCellBorderClass : "",
                            hasRefHighlight: refColorIndex !== undefined,
                          })
                        )}
                      >
                        <div className="relative">
                          {showFormulaTokenColors ? (
                            <div
                              aria-hidden
                              className="pointer-events-none absolute inset-0 z-10 overflow-hidden px-1 py-1 font-mono text-sm whitespace-pre"
                            >
                              <span className="text-muted-foreground">=</span>
                              {tokenizeFormulaBody(formulaRaw.trimStart().slice(1)).map((token, i) => {
                                const key = token.toLowerCase();
                                const tokenColorIndex = activeFormulaRefs?.colorByKey.get(key);
                                const tokenClass =
                                  tokenColorIndex === undefined
                                    ? "text-muted-foreground"
                                    : getRefToneClasses(tokenColorIndex).formulaTextClass;
                                return (
                                  <span key={`${token}-${i}`} className={tokenClass}>
                                    {token}
                                  </span>
                                );
                              })}
                            </div>
                          ) : null}
                          {renderMode === "uom" || renderMode === "dropdown" ? (
                            <Select
                              value={cellValue || undefined}
                              onValueChange={(v) => void updateCell(row.id, col.id, v)}
                            >
                              <SelectTrigger
                                className="h-8 min-w-[120px] border-0 bg-transparent shadow-none focus:ring-0"
                                onMouseDown={(e) => {
                                  if (focusedCell) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedCell({ rowId: row.id, columnId: col.id });
                                  setInsertRef(null);
                                  setFormulaRefSelecting(null);
                                }}
                              >
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                {(renderMode === "uom"
                                  ? [...FIXED_UOMS]
                                  : parseDropdownOptions(col.kind)
                                ).map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                                {cellValue &&
                                !(renderMode === "uom"
                                  ? (FIXED_UOMS as readonly string[])
                                  : parseDropdownOptions(col.kind)
                                ).includes(cellValue) ? (
                                  <SelectItem value={cellValue}>{cellValue}</SelectItem>
                                ) : null}
                              </SelectContent>
                            </Select>
                          ) : (
                          <Input
                            ref={focused ? formulaInputRef : undefined}
                          data-grid-row-id={row.id}
                          data-grid-col-id={col.id}
                            value={display}
                            inputMode={isNumericKind(colKind) ? "decimal" : undefined}
                          onMouseDown={(e) => {
                            // Selection mode: when not typing, mouse click should select cell only.
                            if (focusedCell) return;
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedCell({ rowId: row.id, columnId: col.id });
                            setInsertRef(null);
                            setFormulaRefSelecting(null);
                          }}
                            onChange={(e) => {
                              const next = e.target.value;
                              if (isNumericKind(colKind) && next && !/^[\d.,\s-]*$/.test(next)) {
                                return;
                              }
                              setTable((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  rows: prev.rows.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          cells: r.cells.some((c) => c.columnId === col.id)
                                            ? r.cells.map((c) =>
                                                c.columnId === col.id ? { ...c, rawValue: next } : c
                                              )
                                            : [
                                                ...r.cells,
                                                {
                                                  rowId: row.id,
                                                  columnId: col.id,
                                                  rawValue: next,
                                                  computedValue: null,
                                                },
                                              ],
                                        }
                                      : r
                                  ),
                                };
                              });
                            }}
                            onFocus={() => {
                              setInsertRef({ rowId: row.id });
                              setSelectedCell({ rowId: row.id, columnId: col.id });
                              setFocusedCell({ rowId: row.id, columnId: col.id });
                              setFormulaRefSelecting(null);
                            }}
                            onKeyDown={(e) => {
                            const el = e.currentTarget;
                            const curValue = el.value;

                            if (e.key === "Escape") {
                              e.preventDefault();
                              skipBlurCommitRef.current = true;
                              setFocusedCell(null);
                              setInsertRef(null);
                              setFormulaRefSelecting(null);
                              el.blur();
                              return;
                            }

                            if (e.key === "Delete" || e.key === "Backspace") {
                              const len = el.value.length;
                              const ss = el.selectionStart ?? 0;
                              const se = el.selectionEnd ?? 0;
                              const allSelected = len > 0 && ss === 0 && se === len;
                              if (e.key === "Backspace" && len === 0) {
                                e.preventDefault();
                                void clearCell(row.id, col.id);
                                return;
                              }
                              if (e.key === "Delete" && (allSelected || len === 0)) {
                                e.preventDefault();
                                void clearCell(row.id, col.id);
                              }
                              return;
                            }

                            const isArrow =
                              e.key === "ArrowLeft" ||
                              e.key === "ArrowRight" ||
                              e.key === "ArrowUp" ||
                              e.key === "ArrowDown";
                            const isTab = e.key === "Tab";
                            const isEnter = e.key === "Enter";
                            const isCurrentFormulaCell = String(cell?.rawValue ?? "")
                              .trimStart()
                              .startsWith("=");

                            // Allow caret movement when user holds Ctrl/Meta with Arrow keys.
                            if (isArrow && (e.ctrlKey || e.metaKey)) return;
                            if ((isTab || isArrow) && (e.ctrlKey || e.metaKey || e.altKey)) return;

                            // Formula reference selecting mode:
                            // When caret is inside a formula cell, Arrow keys select a reference cell.
                            // Press Enter to insert the selected reference variable into the formula.
                            if (
                              isArrow &&
                              isCurrentFormulaCell &&
                              !e.ctrlKey &&
                              !e.metaKey &&
                              !e.altKey
                            ) {
                              e.preventDefault();
                              const pageStart = gridPage * PAGE_SIZE;
                              const pageEnd = Math.min(rows.length - 1, pageStart + PAGE_SIZE - 1);

                              const base = formulaRefSelecting ?? { rowId: row.id, columnId: col.id };
                              const baseRowIndex = rows.findIndex((r) => r.id === base.rowId);
                              const baseColIndex = columns.findIndex((c) => c.id === base.columnId);
                              if (baseRowIndex < 0 || baseColIndex < 0) return;

                              const dRow = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
                              const dCol = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;

                              let nextRowIndex = baseRowIndex + dRow;
                              let nextColIndex = baseColIndex + dCol;

                              // Keep formula caret safe by restricting selection to the currently visible page.
                              nextRowIndex = Math.max(pageStart, Math.min(pageEnd, nextRowIndex));
                              nextColIndex = Math.max(0, Math.min(columns.length - 1, nextColIndex));

                              const nextRow = rows[nextRowIndex];
                              const nextCol = columns[nextColIndex];
                              if (!nextRow || !nextCol) return;

                              setFormulaRefSelecting({ rowId: nextRow.id, columnId: nextCol.id });
                              return;
                            }

                            if (isEnter && isCurrentFormulaCell && formulaRefSelecting && !e.ctrlKey) {
                              e.preventDefault();
                              const refCol = columns.find((c) => c.id === formulaRefSelecting.columnId);
                              const varKey = refCol ? columnHeaderToVariableKey(refCol.header) : "";
                              setFormulaRefSelecting(null);
                              if (!varKey) return;
                              insertVarKeyAtCursor(varKey);
                              return;
                            }

                            if (isArrow) {
                              e.preventDefault();
                              const dRow = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
                              const dCol = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;

                              skipBlurCommitRef.current = true;
                              const commitValue = normalizeNumericOnBlur(curValue, colKind);
                              void (async () => {
                                await updateCell(row.id, col.id, commitValue);
                                if (dCol !== 0) {
                                  const targetCol = columns[colIdx + dCol];
                                  if (!targetCol) return;
                                  focusCellInput(row.id, targetCol.id);
                                  return;
                                }
                                if (dRow !== 0) {
                                  const targetRowIndex = globalRowIndex + dRow;
                                  const targetRow = rows[targetRowIndex];
                                  if (!targetRow) return;
                                  focusCellInput(targetRow.id, col.id);
                                }
                              })();
                              return;
                            }

                            if (isTab) {
                              e.preventDefault();
                              const delta = e.shiftKey ? -1 : 1;
                              const targetCol = columns[colIdx + delta];
                              if (!targetCol) return;
                              skipBlurCommitRef.current = true;
                              const commitValue = normalizeNumericOnBlur(curValue, colKind);
                              void (async () => {
                                await updateCell(row.id, col.id, commitValue);
                                focusCellInput(row.id, targetCol.id);
                              })();
                              return;
                            }

                            if (isEnter) {
                              e.preventDefault();
                              skipBlurCommitRef.current = true;
                              const commitValue = normalizeNumericOnBlur(curValue, colKind);
                              void (async () => {
                                await updateCell(row.id, col.id, commitValue);
                                if (e.ctrlKey) {
                                  // Commit but stay in same cell.
                                  focusCellInput(row.id, col.id);
                                  return;
                                }

                                const delta = e.shiftKey ? -1 : 1;
                                const targetRowIndex = globalRowIndex + delta;
                                const targetRow = rows[targetRowIndex];
                                if (!targetRow) return;
                                focusCellInput(targetRow.id, col.id);
                              })();
                            }
                            }}
                            onBlur={(e) => {
                            if (skipBlurCommitRef.current) {
                              skipBlurCommitRef.current = false;
                              setFocusedCell(null);
                              setInsertRef(null);
                                setFormulaRefSelecting(null);
                              return;
                            }
                            setFocusedCell(null);
                            setInsertRef(null);
                              setFormulaRefSelecting(null);
                            void updateCell(
                              row.id,
                              col.id,
                              normalizeNumericOnBlur(e.target.value, colKind)
                            );
                            }}
                            className={cn(
                              "h-full min-w-[120px] rounded-none border-0 bg-transparent px-1 py-1 shadow-none focus-visible:ring-0",
                              isNumericKind(colKind) && "text-right tabular-nums",
                              showFormulaTokenColors
                                ? "relative z-20 font-mono text-transparent caret-foreground"
                                : isFormulaCell
                                  ? `font-mono ${formulaTextColorClass}`
                                  : refColorIndex !== undefined
                                    ? "font-medium"
                                    : ""
                            )}
                          />
                          )}
                        </div>
                        <div
                          data-fill-handle
                          role="presentation"
                          aria-hidden
                          title="Tarik untuk menyalin sel ke area yang dipilih"
                          className="absolute bottom-0 right-0 z-20 h-3 w-3 cursor-cell select-none hover:bg-primary/15 active:bg-primary/25"
                          onMouseDown={(e) =>
                            startFillDrag(e, globalRowIndex, colIdx, row.id, col.id)
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
