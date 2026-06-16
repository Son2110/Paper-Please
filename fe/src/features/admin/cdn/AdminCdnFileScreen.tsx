import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileUp,
  FolderOpen,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cdnApi, type UploadedFileResponse } from "@/api/cdnApi";

const FILES_PER_PAGE = 10;

function formatBytes(value?: number | null) {
  if (!value) return "0 B";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function FileRow({
  file,
  onDelete,
}: {
  file: UploadedFileResponse;
  onDelete: (file: UploadedFileResponse) => void;
}) {
  return (
    <tr className="border-t">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{file.originalName}</div>
        <div className="text-xs text-muted-foreground">{file.savedName}</div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        <div>{file.extension || "-"}</div>
        <div className="text-xs">{file.mimeType || "-"}</div>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatBytes(file.sizeBytes)}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {file.description || "-"}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatDate(file.uploadedAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"
            title="Mở file"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => onDelete(file)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10"
            title="Xóa file"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AdminCdnFileScreen() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const filesQuery = useQuery({
    queryKey: ["admin-cdn-files", page, query, FILES_PER_PAGE],
    queryFn: () =>
      cdnApi.listFiles({
        query: query || undefined,
        page,
        pageSize: FILES_PER_PAGE,
      }),
    staleTime: 20_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-cdn-files"] });

  const uploadMutation = useMutation<UploadedFileResponse | UploadedFileResponse[]>({
    mutationFn: () =>
      files.length > 1
        ? cdnApi.uploadMultiple(files, description || undefined)
        : cdnApi.uploadFile(files[0], description || undefined),
    onSuccess: () => {
      toast.success("Đã upload file");
      setFiles([]);
      setDescription("");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không thể upload file"),
  });

  const deleteMutation = useMutation({
    mutationFn: (savedName: string) => cdnApi.deleteFile(savedName),
    onSuccess: () => {
      toast.success("Đã xóa file");
      invalidate();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Không thể xóa file"),
  });

  const records = filesQuery.data?.items ?? [];
  const totalPages = Math.max(1, filesQuery.data?.totalPages ?? 1);
  const pageSize = records.reduce((sum, file) => sum + (file.sizeBytes ?? 0), 0);

  const applySearch = () => {
    setPage(1);
    setQuery(queryInput.trim());
  };

  const handleDelete = (file: UploadedFileResponse) => {
    if (!window.confirm(`Xóa file ${file.originalName}?`)) return;
    deleteMutation.mutate(file.savedName);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Admin Console
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Tệp hệ thống</h1>
        </div>
        <button
          type="button"
          onClick={() => filesQuery.refetch()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-4 text-sm font-semibold hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Tải lại
        </button>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <FileUp className="h-5 w-5 text-primary" />
            Upload file
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload một hoặc nhiều file vào CDN service.
          </p>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,360px)_auto] lg:items-end">
          <label className="space-y-1 text-sm font-medium">
            <span>Files</span>
            <input
              type="file"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="block w-full rounded-lg border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-foreground"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Description</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <button
            type="button"
            onClick={() => uploadMutation.mutate()}
            disabled={files.length === 0 || uploadMutation.isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
          </button>
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-col gap-3 border-b px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <FolderOpen className="h-5 w-5 text-primary" />
              File list
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search theo originalName, savedName, extension, url, description hoặc IP.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applySearch();
                }}
                placeholder="Tên file, extension..."
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-72"
              />
            </div>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              <Search className="h-4 w-4" />
              Tìm
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  File
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Size
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  Uploaded
                </th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filesQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải file...
                    </span>
                  </td>
                </tr>
              )}
              {filesQuery.isError && !filesQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-destructive">
                    Không thể tải danh sách file.
                  </td>
                </tr>
              )}
              {!filesQuery.isLoading && !filesQuery.isError && records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Chưa có file phù hợp.
                  </td>
                </tr>
              )}
              {records.map((file) => (
                <FileRow key={file.savedName} file={file} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Tổng: {filesQuery.data?.totalItems ?? 0} file, trang này {formatBytes(pageSize)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <span className="text-sm text-muted-foreground">
              Trang {page}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
