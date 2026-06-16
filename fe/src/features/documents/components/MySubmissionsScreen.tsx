import { DocumentHubScreen } from "@/features/documents/components/DocumentHubScreen";
import type { Document } from "@/pages/Index";

interface MySubmissionsScreenProps {
  documents?: Document[];
  onOpenDetail: (docId: string) => void;
  onAddDoc?: (doc: Document) => void;
  initialTab?: "all" | "cho-duyet" | "da-duyet" | "da-tu-choi";
}

export function MySubmissionsScreen({
  onOpenDetail,
}: MySubmissionsScreenProps) {
  return <DocumentHubScreen mode="submissions" onOpenDetail={onOpenDetail} />;
}
