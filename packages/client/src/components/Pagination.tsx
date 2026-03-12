interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  startIndex: number;
  endIndex: number;
  totalFiltered: number;
  totalAll: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  pages.push(total);
  return pages;
}

export default function Pagination({
  currentPage,
  totalPages,
  pageSize,
  startIndex,
  endIndex,
  totalFiltered,
  totalAll,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  onPrev,
  onNext,
}: PaginationProps) {
  if (totalFiltered === 0) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const showFilteredCount = totalFiltered !== totalAll;

  return (
    <div className="px-4 py-2 border-t border-gray-800/40 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-gray-600">
      {/* Page size toggle */}
      <div className="flex items-center gap-1">
        {pageSizeOptions.map((size) => (
          <button
            key={size}
            onClick={() => onPageSizeChange(size)}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              pageSize === size
                ? 'bg-amber-600 text-gray-950 font-bold'
                : 'hover:text-gray-400'
            }`}
          >
            {size}
          </button>
        ))}
        <span className="ml-1 text-gray-700">per page</span>
      </div>

      {/* Info text */}
      <span>
        Showing {startIndex + 1}-{endIndex} of{' '}
        {showFilteredCount ? (
          <>
            {totalFiltered} miners{' '}
            <span className="text-gray-700">({totalAll} total)</span>
          </>
        ) : (
          <>{totalAll} miners</>
        )}
      </span>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={onPrev}
            disabled={currentPage <= 1}
            className="px-1.5 py-0.5 rounded hover:text-gray-400 disabled:text-gray-800 disabled:cursor-not-allowed transition-colors"
          >
            &lt; Prev
          </button>
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-gray-700">
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                  currentPage === p
                    ? 'bg-amber-600 text-gray-950 font-bold'
                    : 'hover:text-gray-400'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={onNext}
            disabled={currentPage >= totalPages}
            className="px-1.5 py-0.5 rounded hover:text-gray-400 disabled:text-gray-800 disabled:cursor-not-allowed transition-colors"
          >
            Next &gt;
          </button>
        </div>
      )}
    </div>
  );
}
