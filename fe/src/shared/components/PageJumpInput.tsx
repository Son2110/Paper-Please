import { FormEvent, useEffect, useId, useState } from "react";

interface PageJumpInputProps {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export function PageJumpInput({
  page,
  totalPages,
  disabled = false,
  onPageChange,
}: PageJumpInputProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  const inputId = useId();
  const [value, setValue] = useState(String(safePage));

  useEffect(() => {
    setValue(String(safePage));
  }, [safePage]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestedPage = Number.parseInt(value, 10);
    if (Number.isNaN(requestedPage)) {
      setValue(String(safePage));
      return;
    }

    const nextPage = Math.min(Math.max(requestedPage, 1), safeTotalPages);
    setValue(String(nextPage));
    onPageChange(nextPage);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <label htmlFor={inputId} className="sr-only">
        Đi tới trang
      </label>
      <span className="whitespace-nowrap text-xs text-muted-foreground">Đi tới</span>
      <input
        id={inputId}
        type="number"
        min={1}
        max={safeTotalPages}
        inputMode="numeric"
        value={value}
        disabled={disabled || safeTotalPages <= 1}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (!value) setValue(String(safePage));
        }}
        className="h-9 w-16 rounded-lg border bg-background px-2 text-center text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || safeTotalPages <= 1}
        className="h-9 rounded-lg border bg-background px-2.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        Đi
      </button>
    </form>
  );
}
