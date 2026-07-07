import type { ReactNode } from "react";

export function DocumentPreviewShell({ toolbar, children }: { toolbar: ReactNode; children: ReactNode }) {
  return (
    <div className="document-system min-h-screen bg-[#eee9df] px-3 py-4 text-[#33231d] sm:px-6 lg:px-8">
      {toolbar}
      <div className="document-sheet mx-auto bg-white">
        {children}
      </div>
    </div>
  );
}

export function DocumentPaper({ children }: { children: ReactNode }) {
  return <article className="document-paper">{children}</article>;
}
