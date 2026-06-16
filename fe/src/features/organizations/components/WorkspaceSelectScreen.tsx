import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  organizationApi,
  type CreateOrganizationRequest,
  type OrganizationDTO,
} from "@/api/organizationApi";
import { OrganizationCreateForm } from "@/features/organizations/components/OrganizationCreateForm";
import { BrandIcon } from "@/shared/components/BrandIcon";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { cn } from "@/lib/utils";

interface WorkspaceSelectScreenProps {
  onContinue: () => void;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PP";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function statusLabel(status: OrganizationDTO["status"]) {
  if (status === "Active" || status === 1) return "Đang hoạt động";
  if (status === "Inactive" || status === 2) return "Tạm dừng";
  return "Chưa rõ";
}

function statusClass(status: OrganizationDTO["status"]) {
  if (status === "Active" || status === 1) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  return "border-neutral-200 bg-neutral-50 text-neutral-600";
}

export function WorkspaceSelectScreen({ onContinue }: WorkspaceSelectScreenProps) {
  const { logout, user } = useAuth();
  const {
    organizations,
    activeOrganizationId,
    isLoading,
    error,
    refreshOrganizations,
    setActiveOrganizationId,
  } = useOrganization();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(organizations.length === 0);

  const filteredOrganizations = organizations.filter((organization) =>
    organization.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const createOrganizationMutation = useMutation({
    mutationFn: organizationApi.create,
    onSuccess: async (organization) => {
      toast.success("Đã tạo tổ chức");
      setActiveOrganizationId(organization.id);
      await refreshOrganizations();
      onContinue();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Không thể tạo tổ chức");
    },
  });

  const handleCreate = (request: CreateOrganizationRequest) => {
    createOrganizationMutation.mutate(request);
  };

  const handleEnter = (organizationId: string) => {
    setActiveOrganizationId(organizationId);
    onContinue();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <BrandIcon className="h-10 w-10" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Paper Please
              </p>
              <h1 className="truncate text-lg font-bold text-foreground">
                Chọn tổ chức
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">
              Xin chào {user?.displayName || user?.email || "bạn"}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">
              Bạn muốn vào tổ chức nào?
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => refreshOrganizations()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-card px-3 text-sm font-semibold hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
            <button
              type="button"
              onClick={() => setShowCreate((value) => !value)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Tạo tổ chức
            </button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-4">
            <div className="rounded-lg border bg-card p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo tên tổ chức"
                  className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {isLoading && (
                <div className="flex items-center gap-2 rounded-lg border bg-card p-4 text-sm text-muted-foreground md:col-span-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải tổ chức...
                </div>
              )}

              {!isLoading && organizations.length === 0 && (
                <div className="rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground md:col-span-2">
                  Bạn chưa thuộc tổ chức nào. Hãy tạo tổ chức đầu tiên để bắt đầu quản lý tài liệu và mời thành viên.
                </div>
              )}

              {!isLoading &&
                organizations.length > 0 &&
                filteredOrganizations.length === 0 && (
                  <div className="rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground md:col-span-2">
                    Không tìm thấy tổ chức phù hợp.
                  </div>
                )}

              {filteredOrganizations.map((organization) => {
                const active = organization.id === activeOrganizationId;
                const contactItems = [
                  organization.email
                    ? { icon: Mail, label: organization.email }
                    : null,
                  organization.phoneNumber
                    ? { icon: Phone, label: organization.phoneNumber }
                    : null,
                  organization.address
                    ? { icon: MapPin, label: organization.address }
                    : null,
                ].filter(Boolean) as { icon: typeof Mail; label: string }[];

                return (
                  <button
                    key={organization.id}
                    type="button"
                    onClick={() => handleEnter(organization.id)}
                    className={cn(
                      "group rounded-lg border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md",
                      active && "border-primary ring-1 ring-primary/25",
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-background">
                        {getInitials(organization.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold text-foreground">
                              {organization.name}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                  statusClass(organization.status),
                                )}
                              >
                                {statusLabel(organization.status)}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                <Users className="h-3.5 w-3.5" />
                                {organization.memberCount} thành viên
                              </span>
                            </div>
                          </div>
                          {active && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                        </div>

                        {organization.description && (
                          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                            {organization.description}
                          </p>
                        )}

                        {contactItems.length > 0 && (
                          <div className="mt-4 space-y-1.5">
                            {contactItems.slice(0, 2).map((item) => {
                              const Icon = item.icon;
                              return (
                                <div
                                  key={item.label}
                                  className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <Icon className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{item.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                          Vào tổ chức
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {showCreate && (
            <aside className="rounded-lg border bg-card">
              <div className="border-b px-5 py-4">
                <h2 className="text-base font-semibold text-foreground">
                  Tạo tổ chức mới
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bạn sẽ là chủ sở hữu của tổ chức này.
                </p>
              </div>
              <OrganizationCreateForm
                isSubmitting={createOrganizationMutation.isPending}
                submitLabel="Tạo và vào tổ chức"
                onSubmit={handleCreate}
              />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}


