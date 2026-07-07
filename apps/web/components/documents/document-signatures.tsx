const signatureSlots = ["ผู้ขอ", "ผู้ตรวจสอบ", "ผู้อนุมัติ"];

export function DocumentSignatures() {
  return (
    <section className="document-signatures" aria-label="ลายเซ็น">
      {signatureSlots.map((label) => (
        <div className="document-signature" key={label}>
          <div className="document-signature__line" />
          <p>{label}</p>
          <span>วันที่ ____ / ____ / ______</span>
        </div>
      ))}
    </section>
  );
}
