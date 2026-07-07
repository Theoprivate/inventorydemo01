interface SignatureSlot {
  label: string;
  name?: string;
}

function signatureName(name: string | undefined) {
  return name?.trim() || "------------";
}

export function DocumentSignatures({ slots }: { slots: SignatureSlot[] }) {
  return (
    <section className="document-signatures" aria-label="ลายเซ็น">
      {slots.map((slot) => (
        <div className="document-signature" key={slot.label}>
          <div className="document-signature__line" />
          <p>({signatureName(slot.name)})</p>
          <strong>{slot.label}</strong>
          <span>วันที่ ____ / ____ / ______</span>
        </div>
      ))}
    </section>
  );
}
