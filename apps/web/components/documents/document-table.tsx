import type { StockRequestItem } from "@/lib/types";

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
        <thead>
          <tr>
            <th className="document-table__center document-table__index">ลำดับ</th>
            <th>รายการสินค้า</th>
            <th className="document-table__number">จำนวนที่ขอ</th>
            <th className="document-table__number">จำนวนที่อนุมัติ</th>
            <th className="document-table__number">จำนวนที่จ่าย</th>
            <th className="document-table__center">หน่วย</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.requestItemId || `${item.itemId}-${index}`}>
              <td className="document-table__center">{index + 1}</td>
              <td className="document-table__name">{item.item?.itemName || item.itemId || "-"}</td>
              <td className="document-table__number">{qty(item.requestedQty)}</td>
              <td className="document-table__number">{qty(item.approvedQty)}</td>
              <td className="document-table__number">{qty(item.issuedQty)}</td>
              <td className="document-table__center">{item.unit || "-"}</td>
              <td>{item.note || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
