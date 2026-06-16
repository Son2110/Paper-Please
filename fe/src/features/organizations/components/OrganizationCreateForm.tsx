import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { CreateOrganizationRequest } from "@/api/organizationApi";

export const emptyOrganizationCreateForm: CreateOrganizationRequest = {
  name: "",
  taxCode: "",
  address: "",
  phoneNumber: "",
  email: "",
  description: "",
};

function buildOrganizationCreatePayload(
  form: CreateOrganizationRequest,
): CreateOrganizationRequest {
  return {
    ...form,
    name: form.name.trim(),
    taxCode: form.taxCode?.trim() || null,
    address: form.address?.trim() || null,
    phoneNumber: form.phoneNumber?.trim() || null,
    email: form.email?.trim() || null,
    logoUrl: null,
    description: form.description?.trim() || null,
  };
}

interface OrganizationCreateFormProps {
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (request: CreateOrganizationRequest) => void;
}

export function OrganizationCreateForm({
  isSubmitting = false,
  submitLabel = "Tạo tổ chức",
  onSubmit,
}: OrganizationCreateFormProps) {
  const [form, setForm] = useState<CreateOrganizationRequest>(
    emptyOrganizationCreateForm,
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên tổ chức");
      return;
    }

    onSubmit(buildOrganizationCreatePayload(form));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      <input
        required
        value={form.name}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, name: event.target.value }))
        }
        placeholder="Tên tổ chức"
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        value={form.email ?? ""}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, email: event.target.value }))
        }
        placeholder="Email liên hệ"
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        value={form.taxCode ?? ""}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, taxCode: event.target.value }))
        }
        placeholder="Mã số thuế"
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        value={form.phoneNumber ?? ""}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))
        }
        placeholder="Số điện thoại"
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        value={form.address ?? ""}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, address: event.target.value }))
        }
        placeholder="Địa chỉ"
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <textarea
        value={form.description ?? ""}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, description: event.target.value }))
        }
        placeholder="Mô tả ngắn"
        rows={3}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {submitLabel}
      </button>
    </form>
  );
}
