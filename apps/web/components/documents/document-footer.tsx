export function DocumentFooter({ note, systemRequestId }: { note: string; systemRequestId?: string }) {
  return (
    <footer>
      <div className="document-footer">
        <strong>หมายเหตุ</strong>
        <p>{note?.trim() || "ไม่มีหมายเหตุ"}</p>
      </div>
      {systemRequestId && (
        <p className="document-system-reference">
          รหัสอ้างอิงระบบ: {systemRequestId}
        </p>
      )}
    </footer>
  );
}
