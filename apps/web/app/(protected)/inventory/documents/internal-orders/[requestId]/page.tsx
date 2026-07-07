"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { DocumentFooter } from "@/components/documents/document-footer";
import { displayRequestNumber, displayUserName, DocumentStatusBadge, formatThaiDate } from "@/components/documents/document-formatters";
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
  return value?.trim() || "ไม่พบข้อมูล";
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
  const documentNumber = displayRequestNumber(value);
  const requesterName = displayUserName(value.requester, "ไม่พบชื่อผู้ขอเบิก");
  const approverName = displayUserName(value.approver, value.approvedBy?.trim() || "รอระบุผู้อนุมัติ");
  const preparerName = me.data?.displayName?.trim() || me.data?.username?.trim() || "";
  const systemRequestId = value.requestId && value.requestId !== documentNumber ? value.requestId : undefined;
  const approverValue = value.approvedBy
    ? approverName
    : <span className="document-meta__muted">รอระบุผู้อนุมัติ</span>;

  return (
    <DocumentPreviewShell toolbar={<DocumentToolbar backHref={backHref} />}>
      <DocumentPaper>
        <DocumentHeader title="ใบสั่งของภายใน" documentNumber={documentNumber} />
        <DocumentMeta
          items={[
            { label: "เลขที่เอกสาร", value: documentNumber },
            { label: "วันที่จัดทำ", value: formatThaiDate(value.requestDate || value.createdAt) },
            { label: "สถานะ", value: <DocumentStatusBadge status={value.requestStatus} /> },
            { label: "ผู้ขอเบิก", value: requesterName },
            { label: "สาขาที่ขอเบิก", value: text(branch) },
            { label: "ผู้อนุมัติ", value: approverValue },
          ]}
        />
        <DocumentTable items={value.items ?? []} />
        <DocumentFooter note={value.note} systemRequestId={systemRequestId} />
        <DocumentSignatures slots={[
          { label: "ผู้ขอเบิก", name: requesterName },
          { label: "ผู้ตรวจสอบ", name: preparerName },
          { label: "ผู้อนุมัติ", name: value.approvedBy ? approverName : "" },
        ]} />
      </DocumentPaper>
    </DocumentPreviewShell>
  );
}
