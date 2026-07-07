export function DocumentFooter({ note, approvedBy }: { note: string; approvedBy: string }) {
  return (
    <footer className="document-footer">
      <div>
        <strong>หมายเหตุ</strong>
        <p>{note || "-"}</p>
      </div>
      <div>
        <strong>ผู้อนุมัติ</strong>
        <p>{approvedBy || "-"}</p>
      </div>
    </footer>
  );
}
