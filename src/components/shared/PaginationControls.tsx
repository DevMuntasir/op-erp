import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
}

export const PaginationControls = React.memo(({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  showPageSizeSelector = false,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationControlsProps) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-zinc-200">
      <div className="text-sm text-zinc-600 font-medium">
        Showing <span className="font-bold">{startItem}</span> to{' '}
        <span className="font-bold">{endItem}</span> of{' '}
        <span className="font-bold">{totalItems}</span> items
      </div>

      <div className="flex items-center gap-2">
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2 mr-4">
            <label htmlFor="page-size" className="text-sm text-zinc-600">
              Per page:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1); // Reset to first page
              }}
              className="h-9 px-3 border border-zinc-200 rounded-lg text-sm font-medium bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="px-3 py-1 text-sm font-medium text-zinc-900 bg-zinc-100 rounded-lg min-w-[60px] text-center">
            {currentPage} / {totalPages}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

PaginationControls.displayName = 'PaginationControls';
