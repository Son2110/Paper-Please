import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
}: AppModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] gap-0 overflow-hidden p-0 sm:rounded-xl",
          className,
        )}
      >
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle className="text-base font-bold text-foreground">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="mt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className={cn("overflow-y-auto p-5", contentClassName)}>
          {children}
        </div>
        {footer && (
          <DialogFooter className="gap-2 border-t px-5 py-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
