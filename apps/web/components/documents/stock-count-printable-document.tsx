import { displayCountNumber, formatThaiDate } from "@/components/documents/document-formatters";
import { DocumentFooter } from "@/components/documents/document-footer";
import { DocumentHeader } from "@/components/documents/document-header";
import { DocumentMeta } from "@/components/documents/document-meta";
import { DocumentPaper } from "@/components/documents/document-page";
import { DocumentSignatures } from "@/components/documents/document-signatures";
import { StockCountDocumentTable } from "@/components/documents/stock-count-document-table";
import type { StockCount } from "@/lib/types";

export const stockCountRounds = ["OPENING", "MIDDAY", "CLOSING", "ADHOC"] as const;

export function StockCountPrintableDocument({ count, pages, className = "" }: { count: StockCount; pages: NonNullable<StockCount["items"]>[]; className?: string }) {
  const documentNumber = displayCountNumber(count);
  return (
    <div className={`document-system stock-count-document-system print-root ${className}`}>
      <div className="document-sheet mx-auto bg-white">
        {pages.map((pageItems, pageIndex) => (
          <DocumentPaper key={pageIndex} className={`print-page ${pageIndex < pages.length - 1 ? "document-paper--page-break" : ""}`}>
            <DocumentHeader title="ใบนับสต๊อก" documentNumber={documentNumber} />
            <DocumentMeta
              className="document-meta--compact document-meta--stock-count"
              items={[
                { label: "วันที่จัดทำ", value: formatThaiDate(count.countDate || count.createdAt) },
                { label: "รอบนับ", value: roundLabel(count.countRound as typeof stockCountRounds[number]) },
                { label: "ตำแหน่งจัดเก็บ", value: count.location?.locationName || count.locationId },
                { label: "หน้า", value: `${pageIndex + 1}/${pages.length}` },
              ]}
            />
            <StockCountDocumentTable items={pageItems} />
            {pageIndex === pages.length - 1 && (
              <>
                <DocumentFooter note={count.note || "กรอกจำนวนจริงในช่องจำนวนที่นับได้ ห้ามคัดลอกยอดคงเหลือจากระบบลงเอกสาร"} />
                <DocumentSignatures slots={[
                  { label: "ผู้ตรวจนับ", name: "" },
                  { label: "ผู้ทวนสอบ", name: "" },
                  { label: "ผู้บันทึกผล", name: "" },
                ]} />
              </>
            )}
          </DocumentPaper>
        ))}
      </div>
    </div>
  );
}

export function roundLabel(round: typeof stockCountRounds[number]) {
  return ({ OPENING: "เปิดร้าน", MIDDAY: "กลางวัน", CLOSING: "ปิดร้าน", ADHOC: "นับพิเศษ" } as const)[round] ?? round;
}
