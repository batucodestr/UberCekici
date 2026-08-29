import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { type ReactNode, useState } from "react";

import type { ListParams } from "@/services/admin";
import type { Paginated } from "@/types";

const PAGE_SIZE = 20;

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  queryKey: string;
  fetchFn: (params: ListParams) => Promise<Paginated<T>>;
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  searchPlaceholder?: string;
  rowActions?: (row: T) => ReactNode;
  filters?: ReactNode;
  extraParams?: ListParams;
}

export function DataTable<T>({
  queryKey,
  fetchFn,
  columns,
  rowKey,
  searchPlaceholder = "Ara...",
  rowActions,
  filters,
  extraParams,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const params: ListParams = { page, search, ...extraParams };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [queryKey, params],
    queryFn: () => fetchFn(params),
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput);
          }}
          className="relative flex-1 max-w-xs"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            className="input !py-2 pl-9"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        {filters}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3">
                  {col.label}
                </th>
              ))}
              {rowActions && <th className="px-4 py-3 text-right">İşlemler</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {data?.results.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-zinc-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-zinc-700">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">{rowActions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
            {!isLoading && data?.results.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (rowActions ? 1 : 0)}
                  className="px-4 py-8 text-center text-sm text-zinc-400"
                >
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td
                  colSpan={columns.length + (rowActions ? 1 : 0)}
                  className="px-4 py-8 text-center text-sm text-zinc-400"
                >
                  Yükleniyor...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm text-zinc-500">
        <span>
          {data ? `${data.count} kayıt` : ""} {isFetching && "· güncelleniyor"}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-zinc-200 p-1.5 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={!data?.next}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-200 p-1.5 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
