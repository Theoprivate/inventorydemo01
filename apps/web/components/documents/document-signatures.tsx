interface SignatureSlot {
  label: string;
  name?: string;
}

function signatureName(name: string | undefined) {
  return name?.trim() || "------------";
}

export function DocumentSignatures({ slots }: { slots: SignatureSlot[] }) {
  return (
    <section className="document-signatures signature-section" aria-label="ลายเซ็น">
      {slots.map((slot) => (
        <div className="document-signature signature-box" key={slot.label}>
          <div className="document-signature__line signature-line" />
          <p className="signature-name">({signatureName(slot.name)})</p>
          <strong>{slot.label}</strong>
          <span className="signature-date">วันที่ ____ / ____ / ______</span>
        </div>
      ))}
    </section>
  );
}
