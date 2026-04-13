"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  type UserFeedback,
  type FeedbackStatus,
} from "@/types/feedback";
import {
  feedbackToMarkdown,
  feedbackListToMarkdown,
  copyToClipboard,
} from "@/lib/feedback-copy";
import { IconCopy, IconTrash } from "@tabler/icons-react";

interface FeedbackAdminTableProps {
  items: UserFeedback[];
  onStatusChange: (id: string, status: FeedbackStatus) => void;
  onDelete: (id: string) => void;
  onSelect: (item: UserFeedback) => void;
}

export function FeedbackAdminTable({
  items,
  onStatusChange,
  onDelete,
  onSelect,
}: FeedbackAdminTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [copyFeedback, setCopyFeedback] = React.useState("");

  const filtered = React.useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((fb) => fb.status === statusFilter);
  }, [items, statusFilter]);

  const columns = React.useMemo<ColumnDef<UserFeedback>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(checked) =>
              table.toggleAllPageRowsSelected(!!checked)
            }
            aria-label="전체 선택"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(!!checked)}
            aria-label="선택"
          />
        ),
        size: 40,
        enableSorting: false,
      },
      {
        accessorKey: "created_at",
        header: "날짜",
        cell: ({ getValue }) =>
          new Date(getValue<string>()).toLocaleDateString("ko-KR"),
        sortingFn: "basic",
        size: 100,
      },
      {
        accessorKey: "user_email",
        header: "유저",
        cell: ({ getValue }) => (
          <span className="truncate max-w-[140px] block">
            {getValue<string>()}
          </span>
        ),
        size: 160,
      },
      {
        accessorKey: "category",
        header: "카테고리",
        cell: ({ getValue }) => {
          const cat = FEEDBACK_CATEGORIES.find(
            (c) => c.value === getValue<string>(),
          );
          return (
            <span className="text-xs">
              {cat?.emoji} {cat?.label}
            </span>
          );
        },
        size: 100,
      },
      {
        accessorKey: "message",
        header: "내용",
        cell: ({ getValue }) => (
          <span className="line-clamp-1 text-xs text-foreground/70 max-w-[240px] block">
            {getValue<string>()}
          </span>
        ),
        size: 260,
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => {
          const currentStatus = row.original.status;
          const statusItems = FEEDBACK_STATUSES.map((s) => ({
            value: s.value,
            label: s.label,
          }));
          return (
            <Select
              value={currentStatus}
              onValueChange={(v) =>
                onStatusChange(row.original.id, v as FeedbackStatus)
              }
            >
              <SelectTrigger className="h-7 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
        size: 100,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const ok = await copyToClipboard(
                  feedbackToMarkdown(row.original),
                );
                if (ok) {
                  setCopyFeedback("복사됨!");
                  setTimeout(() => setCopyFeedback(""), 2000);
                }
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="복사"
            >
              <IconCopy className="size-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("이 피드백을 삭제하시겠습니까?")) {
                  onDelete(row.original.id);
                }
              }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="삭제"
            >
              <IconTrash className="size-3.5" />
            </button>
          </div>
        ),
        size: 80,
      },
    ],
    [onStatusChange, onDelete],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  });

  const selectedItems = table
    .getSelectedRowModel()
    .rows.map((r) => r.original);

  const handleBulkCopy = async () => {
    if (selectedItems.length === 0) return;
    const ok = await copyToClipboard(feedbackListToMarkdown(selectedItems));
    if (ok) {
      setCopyFeedback(`${selectedItems.length}건 복사됨!`);
      setTimeout(() => setCopyFeedback(""), 2000);
    }
  };

  const statusFilterItems = FEEDBACK_STATUSES.map((s) => ({
    value: s.value,
    label: s.label,
  }));

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {statusFilterItems.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedItems.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleBulkCopy}>
            <IconCopy className="size-3.5 mr-1" />
            선택 복사 ({selectedItems.length}건)
          </Button>
        )}

        {copyFeedback && (
          <span className="text-xs text-green-400">{copyFeedback}</span>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          총 {filtered.length}건
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  피드백이 없습니다.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.original)}
                  className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
