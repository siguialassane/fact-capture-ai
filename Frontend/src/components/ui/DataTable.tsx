import { useState, useMemo, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────

export interface DataTableColumn<T> {
  id: string;
  header: string;
  /** Accessor function to get cell value from row */
  accessorFn?: (row: T) => unknown;
  /** Simple key accessor */
  accessorKey?: keyof T;
  /** Custom cell renderer */
  cell?: (row: T) => React.ReactNode;
  /** Is this column sortable? Default true */
  sortable?: boolean;
  /** Column alignment */
  align?: "left" | "center" | "right";
  /** Min width in px */
  minWidth?: number;
  /** Fixed width in px */
  width?: number;
  /** CSS class for cells */
  className?: string;
  /** Is this column a number column? (right-align + mono font) */
  numeric?: boolean;
  /** Footer aggregate */
  footer?: (rows: T[]) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Unique key for each row */
  getRowId?: (row: T) => string;
  /** Page size options */
  pageSizes?: number[];
  /** Default page size */
  defaultPageSize?: number;
  /** Show search input */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Global search filter function */
  searchFilter?: (row: T, query: string) => boolean;
  /** Enable CSV export */
  exportable?: boolean;
  /** Export file name */
  exportFileName?: string;
  /** Show footer row */
  showFooter?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Compact mode (smaller rows) */
  compact?: boolean;
  /** Slot for toolbar actions (filter buttons, etc.) */
  toolbarActions?: React.ReactNode;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Sticky first column */
  stickyFirstCol?: boolean;
}

type SortDir = "asc" | "desc" | null;

// ─── Helpers ──────────────────────────────────────────────────

function getCellValue<T>(row: T, col: DataTableColumn<T>): unknown {
  if (col.accessorFn) return col.accessorFn(row);
  if (col.accessorKey) return row[col.accessorKey];
  return undefined;
}

function defaultSearch<T>(row: T, query: string, columns: DataTableColumn<T>[]): boolean {
  const q = query.toLowerCase();
  return columns.some((col) => {
    const val = getCellValue(row, col);
    if (val === null || val === undefined) return false;
    return String(val).toLowerCase().includes(q);
  });
}

function sortRows<T>(
  rows: T[],
  sortCol: DataTableColumn<T> | null,
  sortDir: SortDir
): T[] {
  if (!sortCol || !sortDir) return rows;
  return [...rows].sort((a, b) => {
    const aVal = getCellValue(a, sortCol);
    const bVal = getCellValue(b, sortCol);
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const cmp =
      typeof aVal === "number" && typeof bVal === "number"
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal), "fr", { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });
}

function exportCSV<T>(columns: DataTableColumn<T>[], data: T[], fileName: string) {
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = getCellValue(row, col);
      if (val === null || val === undefined) return "";
      const str = String(val);
      // Escape CSV
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  getRowId,
  pageSizes = [25, 50, 100],
  defaultPageSize = 25,
  searchable = true,
  searchPlaceholder = "Rechercher...",
  searchFilter,
  exportable = true,
  exportFileName = "export",
  showFooter = false,
  emptyMessage = "Aucune donnée",
  loading = false,
  compact = false,
  toolbarActions,
  onRowClick,
  stickyFirstCol = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortColId, setSortColId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const sortCol = useMemo(
    () => columns.find((c) => c.id === sortColId) || null,
    [columns, sortColId]
  );

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    return data.filter((row) =>
      searchFilter ? searchFilter(row, search) : defaultSearch(row, search, columns)
    );
  }, [data, search, searchFilter, columns]);

  // Sort
  const sorted = useMemo(
    () => sortRows(filtered, sortCol, sortDir),
    [filtered, sortCol, sortDir]
  );

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = useMemo(
    () => sorted.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [sorted, safePage, pageSize]
  );

  const handleSort = useCallback(
    (col: DataTableColumn<T>) => {
      if (col.sortable === false) return;
      if (sortColId === col.id) {
        if (sortDir === "asc") setSortDir("desc");
        else if (sortDir === "desc") {
          setSortColId(null);
          setSortDir(null);
        }
      } else {
        setSortColId(col.id);
        setSortDir("asc");
      }
      setPage(0);
    },
    [sortColId, sortDir]
  );

  const handlePageSize = useCallback((val: string) => {
    setPageSize(Number(val));
    setPage(0);
  }, []);

  const align = (col: DataTableColumn<T>) =>
    col.align || (col.numeric ? "right" : "left");

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {searchable && (
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}
          {toolbarActions}
        </div>

        <div className="flex items-center gap-2">
          {exportable && sorted.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => exportCSV(columns, sorted, exportFileName)}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          )}
          <span className="text-xs text-slate-500">
            {sorted.length} ligne{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((col, i) => {
                  const isSorted = sortColId === col.id;
                  const sortable = col.sortable !== false;
                  return (
                    <th
                      key={col.id}
                      onClick={() => sortable && handleSort(col)}
                      style={{
                        minWidth: col.minWidth,
                        width: col.width,
                      }}
                      className={cn(
                        "px-3 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap select-none",
                        align(col) === "right" && "text-right",
                        align(col) === "center" && "text-center",
                        sortable && "cursor-pointer hover:bg-slate-100 transition-colors",
                        i === 0 && stickyFirstCol && "sticky left-0 bg-slate-50 z-10",
                        col.className
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {sortable && (
                          <span className="ml-0.5">
                            {isSorted && sortDir === "asc" && <ChevronUp className="h-3 w-3" />}
                            {isSorted && sortDir === "desc" && <ChevronDown className="h-3 w-3" />}
                            {!isSorted && <ChevronsUpDown className="h-3 w-3 opacity-30" />}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
                      Chargement...
                    </div>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                    <Filter className="h-5 w-5 mx-auto mb-2 opacity-40" />
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paged.map((row, rowIdx) => (
                  <tr
                    key={getRowId ? getRowId(row) : rowIdx}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b border-slate-100 transition-colors",
                      rowIdx % 2 === 1 && "bg-slate-50/50",
                      onRowClick && "cursor-pointer hover:bg-blue-50/50",
                      !onRowClick && "hover:bg-slate-50"
                    )}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.id}
                        className={cn(
                          compact ? "px-3 py-1.5" : "px-3 py-2",
                          "whitespace-nowrap",
                          align(col) === "right" && "text-right",
                          align(col) === "center" && "text-center",
                          col.numeric && "font-mono tabular-nums",
                          colIdx === 0 && stickyFirstCol && "sticky left-0 bg-white z-10",
                          col.className
                        )}
                      >
                        {col.cell
                          ? col.cell(row)
                          : formatCellValue(getCellValue(row, col))}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {showFooter && !loading && paged.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        "px-3 py-2 text-sm",
                        align(col) === "right" && "text-right",
                        align(col) === "center" && "text-center",
                        col.numeric && "font-mono tabular-nums"
                      )}
                    >
                      {col.footer ? col.footer(sorted) : null}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Lignes par page</span>
            <Select value={String(pageSize)} onValueChange={handlePageSize}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizes.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>
              {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} sur {sorted.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCellValue(val: unknown): React.ReactNode {
  if (val === null || val === undefined) return "–";
  if (typeof val === "number") {
    return val.toLocaleString("fr-FR");
  }
  return String(val);
}
