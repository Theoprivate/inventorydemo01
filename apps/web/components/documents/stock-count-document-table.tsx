import type { StockCountItem } from "@/lib/types";

export function StockCountDocumentTable({ items }: { items: StockCountItem[] }) {
  if (!items.length) {
    return <div className="document-empty-items">ไม่มีรายการสินค้า</div>;
  }

  return (
    <div className="document-table-wrap">
      <table className="document-table document-table--stock-count count-table">
        <colgroup>
          <col className="document-table__col-index col-index" />
          <col className="document-table__col-code col-code" />
          <col className="document-table__col-count-name col-name" />
          <col className="document-table__col-unit col-unit" />
          <col className="document-table__col-count-write col-count" />
          <col className="document-table__col-count-note col-note" />
        </colgroup>
        <thead>
          <tr>
            <th className="document-table__center document-table__index">ลำดับ</th>
            <th className="document-table__center">รหัสสินค้า</th>
            <th>ชื่อรายการ</th>
            <th className="document-table__center">หน่วย</th>
            <th className="document-table__center">จำนวนที่นับได้</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.countItemId || `${item.itemId}-${item.rowNumber}`}>
              <td className="document-table__center">{item.rowNumber}</td>
              <td className="document-table__item-code code-cell">{item.itemId || "ไม่พบรหัส"}</td>
              <td className="document-table__name name-cell">
                <span className="document-table__item-name">{item.item?.itemName || item.itemId || "ไม่พบชื่อสินค้า"}</span>
              </td>
              <td className="document-table__center">{item.unit || "-"}</td>
              <td className="document-table__count-write-cell" aria-label={`จำนวนที่นับได้ ${item.item?.itemName ?? item.itemId}`} />
              <td className="document-table__note" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
