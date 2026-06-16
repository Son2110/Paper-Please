import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import {
  documentApi,
  type DocumentStatus,
  type PendingWorkflowTaskDTO,
} from "@/api/documentApi";
import { queryKeys } from "@/api/queryKeys";
import { useOrganization } from "@/context/OrganizationContext";

interface CalendarScreenProps {
  onOpenDetail?: (docId: string) => void;
}

interface DeadlineEvent {
  task: PendingWorkflowTaskDTO;
  dueDate: string;
  documentStatus?: DocumentStatus | null;
}

const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const monthNames = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

function toDateKey(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa có hạn";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có hạn";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getDeadlineTone(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(dueDate);
  deadline.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    return {
      label: `Quá hạn ${Math.abs(diffDays)} ngày`,
      className: "border-red-200 bg-red-50 text-red-700",
      dotClassName: "bg-red-500",
    };
  }
  if (diffDays === 0) {
    return {
      label: "Hạn hôm nay",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      dotClassName: "bg-amber-500",
    };
  }
  if (diffDays <= 3) {
    return {
      label: `Còn ${diffDays} ngày`,
      className: "border-orange-200 bg-orange-50 text-orange-700",
      dotClassName: "bg-orange-500",
    };
  }
  return {
    label: `Còn ${diffDays} ngày`,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClassName: "bg-emerald-500",
  };
}

function taskActionLabel(task: PendingWorkflowTaskDTO) {
  if (task.stepType === "Sign") return "Cần ký";
  if (task.stepType === "Review") return "Cần xem xét";
  if (task.stepType === "Acknowledge") return "Cần xác nhận";
  return "Cần duyệt";
}

export function CalendarScreen({ onOpenDetail }: CalendarScreenProps) {
  const { activeOrganizationId } = useOrganization();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateKey(new Date().toISOString()));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const tasksQuery = useQuery({
    queryKey: queryKeys.documents.pendingTasks({ page: 1, pageSize: 100 }),
    queryFn: () => documentApi.getMyPendingTasks({ page: 1, pageSize: 100 }),
    staleTime: 15_000,
  });

  const documentsQuery = useQuery({
    queryKey: queryKeys.documents.list(activeOrganizationId, {
      page: 1,
      pageSize: 100,
    }),
    queryFn: () =>
      documentApi.getOrganizationDocuments(activeOrganizationId ?? "", {
        page: 1,
        pageSize: 100,
      }),
    enabled: Boolean(activeOrganizationId),
    staleTime: 15_000,
  });

  const deadlineEvents = useMemo<DeadlineEvent[]>(() => {
    const documentsById = new Map(
      (documentsQuery.data?.items ?? []).map((document) => [document.id, document]),
    );

    return (tasksQuery.data?.items ?? [])
      .flatMap<DeadlineEvent>((task) => {
        const document = documentsById.get(task.documentId);
        if (!document?.dueDate) return [];
        return [{
          task,
          dueDate: document.dueDate,
          documentStatus: document.status,
        }];
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [documentsQuery.data?.items, tasksQuery.data?.items]);

  const eventsByDate = useMemo(() => {
    return deadlineEvents.reduce<Record<string, DeadlineEvent[]>>((acc, event) => {
      const key = toDateKey(event.dueDate);
      if (!key) return acc;
      acc[key] = [...(acc[key] ?? []), event];
      return acc;
    }, {});
  }, [deadlineEvents]);

  const selectedDayEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];
  const upcomingEvents = deadlineEvents.slice(0, 5);
  const isLoading = tasksQuery.isLoading || documentsQuery.isLoading;
  const error =
    tasksQuery.error instanceof Error
      ? tasksQuery.error.message
      : documentsQuery.error instanceof Error
        ? documentsQuery.error.message
        : null;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i += 1) days.push(null);
  for (let i = 1; i <= daysInMonth; i += 1) days.push(i);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const todayKey = toDateKey(new Date().toISOString());

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Lịch công việc
        </p>
        <h1 className="text-2xl font-bold text-foreground">Deadline cần xử lý</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Các mốc trong lịch được lấy từ những tài liệu đang chờ bạn xử lý.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border bg-card p-4 sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">
              {monthNames[month]} {year}
            </h2>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1">
            {dayNames.map((dayName) => (
              <div
                key={dayName}
                className="py-2 text-center text-xs font-semibold text-muted-foreground"
              >
                {dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) return <div key={`empty-${index}`} />;

              const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = eventsByDate[dateKey] ?? [];
              const isToday = dateKey === todayKey;
              const isSelected = selectedDate === dateKey;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(dateKey)}
                  className={`min-h-[88px] rounded-lg border p-2 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : isToday
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-accent"
                  }`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      isSelected || isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => {
                      const tone = getDeadlineTone(event.dueDate);
                      return (
                        <div
                          key={event.task.id}
                          className={`truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold ${tone.className}`}
                        >
                          {event.task.documentTitle}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] font-semibold text-muted-foreground">
                        +{dayEvents.length - 2} việc khác
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Việc trong ngày
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedDate
                    ? new Intl.DateTimeFormat("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      }).format(new Date(selectedDate))
                    : "Chọn một ngày trên lịch"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {isLoading ? (
                <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải deadline...
                </div>
              ) : selectedDayEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Không có tài liệu cần xử lý trong ngày này.
                </div>
              ) : (
                selectedDayEvents.map((event) => {
                  const tone = getDeadlineTone(event.dueDate);
                  return (
                    <article
                      key={event.task.id}
                      className="rounded-lg border bg-background p-3"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dotClassName}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold text-foreground">
                            {event.task.documentTitle}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {taskActionLabel(event.task)} · {event.task.organizationName}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-foreground">
                            {tone.label} · {formatDateTime(event.dueDate)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenDetail?.(event.task.documentId)}
                        className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
                      >
                        <Eye className="h-4 w-4" />
                        Mở tài liệu
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5">
            <h2 className="text-base font-bold text-foreground">Sắp đến hạn</h2>
            <div className="mt-4 space-y-3">
              {upcomingEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Chưa có deadline từ tài liệu cần xử lý.
                </div>
              ) : (
                upcomingEvents.map((event) => {
                  const tone = getDeadlineTone(event.dueDate);
                  return (
                    <button
                      key={event.task.id}
                      type="button"
                      onClick={() => {
                        setSelectedDate(toDateKey(event.dueDate));
                        setCurrentDate(new Date(event.dueDate));
                      }}
                      className="flex w-full items-start gap-3 rounded-lg border bg-background p-3 text-left hover:bg-muted/60"
                    >
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-semibold text-foreground">
                          {event.task.documentTitle}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {tone.label} · {formatDateTime(event.dueDate)}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
