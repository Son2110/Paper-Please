import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageJumpInput } from "@/shared/components/PageJumpInput";

interface PaginationFooterProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages?: number;
  itemLabel?: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export function PaginationFooter({
  page,
  pageSize,
  totalItems,
  totalPages,
  itemLabel = "mục",
  disabled = false,
  onPageChange,
}: PaginationFooterProps) {
  const safeTotalPages = Math.max(1, totalPages ?? Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safePage * pageSize);

  const goToPage = (nextPage: number) => {
    onPageChange(Math.min(Math.max(nextPage, 1), safeTotalPages));
  };

  return (
    <div className="flex flex-col gap-3 border-t px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        Hiển thị{" "}
        <span className="font-semibold text-foreground">
          {startItem}-{endItem}
        </span>{" "}
        trong <span className="font-semibold text-foreground">{totalItems}</span>{" "}
        {itemLabel}
      </p>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => goToPage(safePage - 1)}
          disabled={disabled || safePage <= 1}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-lg border bg-background px-3 font-medium text-foreground transition-colors hover:bg-muted",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </button>
        <span className="min-w-24 text-center font-medium text-foreground">
          Trang {safePage}/{safeTotalPages}
        </span>
        <PageJumpInput
          page={safePage}
          totalPages={safeTotalPages}
          disabled={disabled}
          onPageChange={goToPage}
        />
        <button
          type="button"
          onClick={() => goToPage(safePage + 1)}
          disabled={disabled || safePage >= safeTotalPages}
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-lg border bg-background px-3 font-medium text-foreground transition-colors hover:bg-muted",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          Sau
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
