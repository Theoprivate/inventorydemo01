const LOGO_PATH = "/images/brand/restaurant-logo.png";

export function DocumentHeader({ title, documentNumber }: { title: string; documentNumber: string }) {
  return (
    <header className="document-header">
      <div className="document-brand" aria-label="ร้านข้าวหมูแดงเรือเมล์">
        <img className="document-brand__logo" src={LOGO_PATH} alt="Restaurant logo" />
        <div>
          <p className="document-brand__name">ร้านข้าวหมูแดงเรือเมล์</p>
          <p className="document-brand__sub">เอกสารระบบคลังสินค้า</p>
        </div>
      </div>
      <div className="document-title-block">
        <h1>{title}</h1>
        <p>เลขที่เอกสาร {documentNumber || "-"}</p>
      </div>
    </header>
  );
}
