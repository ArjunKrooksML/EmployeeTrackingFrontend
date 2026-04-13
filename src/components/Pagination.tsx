interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function Pagination({ page, pages, total, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build page number list with ellipsis
  const getPageNumbers = (): (number | '...')[] => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', pages];
    if (page >= pages - 3) return [1, '...', pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [1, '...', page - 1, page, page + 1, '...', pages];
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-white">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Showing {from}–{to} of {total}</span>
        <span className="text-gray-400">|</span>
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); }}
          className="border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          ← Prev
        </button>

        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1 text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`px-3 py-1 rounded text-sm border transition ${
                p === page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 hover:bg-gray-100 text-gray-700'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="px-2 py-1 rounded text-sm border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
