import { cn } from "@/lib/utils";

interface BrandIconProps {
  className?: string;
  imageClassName?: string;
}

export function BrandIcon({ className, imageClassName }: BrandIconProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-border",
        className,
      )}
    >
      <img
        src="/web-icon-192.png"
        alt="Paper Please"
        className={cn("h-full w-full object-contain p-1", imageClassName)}
      />
    </div>
  );
}
