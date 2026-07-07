export interface DocumentMetaItem {
  label: string;
  value: string;
}

export function DocumentMeta({ items }: { items: DocumentMetaItem[] }) {
  return (
    <dl className="document-meta">
      {items.map((item) => (
        <div className="document-meta__item" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value || "-"}</dd>
        </div>
      ))}
    </dl>
  );
}
