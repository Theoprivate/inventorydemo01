import type { ReactNode } from "react";

export interface DocumentMetaItem {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}

export function DocumentMeta({ items }: { items: DocumentMetaItem[] }) {
  return (
    <dl className="document-meta">
      {items.map((item) => (
        <div className="document-meta__item" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value || "-"}</dd>
          {item.detail && <p className="document-meta__detail">{item.detail}</p>}
        </div>
      ))}
    </dl>
  );
}
