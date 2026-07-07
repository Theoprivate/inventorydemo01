"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { DocumentFooter } from "@/components/documents/document-footer";
import { DocumentHeader } from "@/components/documents/document-header";
import { DocumentMeta } from "@/components/documents/document-meta";
import { DocumentPaper, DocumentPreviewShell } from "@/components/documents/document-page";
import { DocumentSignatures } from "@/components/documents/document-signatures";
import { DocumentTable } from "@/components/documents/document-table";
import { DocumentToolbar } from "@/components/documents/document-toolbar";
import { ErrorBox } from "@/components/page-kit";
import { ApiError, get } from "@/lib/api";
import type { SessionUser, StockRequest } from "@/lib/types";

function text(value: string | undefined | null) {
  return value?.trim() || "-";
}

function requesterName(request: StockRequest) {
  return text(request.requester?.displayName || request.requester?.username || request.requestedBy);
}

export default function InternalOrderDocumentPage() {
  const requestId = String(useParams().requestId);
  const request = useQuery({ queryKey: ["request", requestId], queryFn: () => get<StockRequest>(`/stock-requests/${requestId}`) });
  const me = useQuery({ queryKey: ["me"], queryFn: () => get<SessionUser>("/auth/me"), retry: false });
  const backHref = `/inventory/requests/${requestId}`;

  if (request.isError) {
    const notFound = request.error instanceof ApiError && request.error.status === 404;
    return (
      <DocumentPreviewShell toolbar={<DocumentToolbar backHref={backHref} />}>
        <DocumentPaper>
          {notFound ? <div className="document-state">ไม่พบเอกสาร</div> : <ErrorBox error={request.error} />}
        </DocumentPaper>
      </DocumentPreviewShell>
    );
  }

  if (!request.data) {
    return (
      <DocumentPreviewShell toolbar={<DocumentToolbar backHref={backHref} />}>
        <DocumentPaper>
          <div className="document-state">กำลังโหลดเอกสาร...</div>
        </DocumentPaper>
      </DocumentPreviewShell>
    );
  }

  const value = request.data;
  const branch = me.data?.branchId === value.branchId ? me.data.branchName : value.branchId;

  return (
    <DocumentPreviewShell toolbar={<DocumentToolbar backHref={backHref} />}>
      <DocumentPaper>
        <DocumentHeader title="ใบสั่งของภายใน" requestId={value.requestId} />
        <DocumentMeta
          items={[
            { label: "เลขคำขอ", value: text(value.requestId) },
            { label: "วันที่", value: text(value.requestDate || value.createdAt) },
            { label: "สาขา", value: text(branch) },
            { label: "ผู้ขอ", value: requesterName(value) },
            { label: "สถานะ", value: text(value.requestStatus) },
            { label: "ผู้อนุมัติ", value: text(value.approvedBy) },
          ]}
        />
        <DocumentTable items={value.items ?? []} />
        <DocumentFooter note={value.note} approvedBy={value.approvedBy} />
        <DocumentSignatures />
      </DocumentPaper>
    </DocumentPreviewShell>
  );
}
