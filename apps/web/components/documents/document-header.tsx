const LOGO_PATH = "/images/brand/restaurant-logo.png";

export function DocumentHeader({ title, requestId }: { title: string; requestId: string }) {
  return (
    <header className="document-header">
      <div className="document-brand" aria-label="Restaurant Inventory Stock Market">
        <img className="document-brand__logo" src={LOGO_PATH} alt="Restaurant logo" />
        <div>
          <p className="document-brand__name">Restaurant Inventory Stock Market</p>
          <p className="document-brand__sub">Inventory Document</p>
        </div>
      </div>
      <div className="document-title-block">
        <h1>{title}</h1>
        <p>เลขคำขอ {requestId || "-"}</p>
      </div>
    </header>
  );
}
