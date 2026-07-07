import type { StockRequestItem } from "@/lib/types";
import { displayItemName } from "./document-formatters";

function qty(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("th-TH") : "-";
}

export function DocumentTable({ items }: { items: StockRequestItem[] }) {
  if (!items.length) {
    return <div className="document-empty-items">ไม่มีรายการสินค้า</div>;
  }

  return (
    <div className="document-table-wrap">
      <table className="document-table">
        <colgroup>
          <col className="document-table__col-index" />
          <col className="document-table__col-code" />
          <col className="document-table__col-name" />
          <col className="document-table__col-qty" />
          <col className="document-table__col-approved" />
          <col className="document-table__col-issued" />
          <col className="document-table__col-unit" />
          <col className="document-table__col-note" />
        </colgroup>
        <thead>
          <tr>
            <th className="document-table__center document-table__index">ลำดับ</th>
            <th className="document-table__center">รหัสสินค้า</th>
            <th>ชื่อรายการ</th>
            <th className="document-table__number" title="จำนวนที่ขอเบิก">ขอเบิก</th>
            <th className="document-table__number" title="จำนวนที่อนุมัติ">อนุมัติ</th>
            <th className="document-table__number" title="จำนวนที่จ่ายจริง">จ่ายจริง</th>
            <th className="document-table__center">หน่วย</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.requestItemId || `${item.itemId}-${index}`}>
              <td className="document-table__center">{index + 1}</td>
              <td className="document-table__item-code">{item.itemId || "ไม่พบรหัสสินค้า"}</td>
              <td className="document-table__name">
                <span className="document-table__item-name">{displayItemName(item)}</span>
              </td>
              <td className="document-table__number">{qty(item.requestedQty)}</td>
              <td className="document-table__number">{qty(item.approvedQty)}</td>
              <td className="document-table__number">{qty(item.issuedQty)}</td>
              <td className="document-table__center">{item.unit || "-"}</td>
              <td className="document-table__note">{item.note || "ไม่มีหมายเหตุ"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
