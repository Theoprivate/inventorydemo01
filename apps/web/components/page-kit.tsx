"use client";

import type {
  ButtonHTMLAttributes,
  ComponentProps,
  HTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function GamePanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classes("game-panel", className)} {...props} />;
}

export function GameCard({ className, interactive = false, ...props }: HTMLAttributes<HTMLElement> & { interactive?: boolean }) {
  return <article className={classes("game-card", interactive && "game-card--interactive", className)} {...props} />;
}

export function GameButton({ className, variant = "primary", size = "md", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={classes("game-button", `game-button--${variant}`, `game-button--${size}`, className)} {...props} />;
}

export function GameButtonLink({ className, variant = "primary", size = "md", ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={classes("game-button", `game-button--${variant}`, `game-button--${size}`, className)} {...props} />;
}

export function StatusBadge({ className, tone = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={classes("game-status-badge", `game-status-badge--${tone}`, className)} {...props} />;
}

export function FilterBar({ className, children, label = "ตัวกรอง", ...props }: HTMLAttributes<HTMLDivElement> & { label?: string }) {
  return <div className={classes("game-filter-bar", className)} role="group" aria-label={label} {...props}>{children}</div>;
}

export function FormField({ className, label, hint, error, required, children, ...props }: LabelHTMLAttributes<HTMLLabelElement> & { label: ReactNode; hint?: ReactNode; error?: ReactNode; required?: boolean }) {
  return <label className={classes("game-form-field", className)} {...props}>
    <span className="game-form-field__label">{label}{required && <span className="game-form-field__required" aria-hidden="true"> *</span>}</span>
    {children}
    {(error || hint) && <span className={classes("game-form-field__message", Boolean(error) && "game-form-field__message--error")}>{error || hint}</span>}
  </label>;
}

export function SelectableTile({ className, selected = false, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return <button type={type} aria-pressed={selected} className={classes("game-selectable-tile", selected && "game-selectable-tile--selected", className)} {...props} />;
}

export function DataTableShell({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classes("game-table-shell", className)} {...props}><div className="game-table-shell__viewport">{children}</div></div>;
}

export function EmptyState({ className, title, description, icon = "?", action, ...props }: HTMLAttributes<HTMLDivElement> & { title: ReactNode; description?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return <div className={classes("game-empty-state", className)} {...props}>
    <span className="game-empty-state__icon" aria-hidden="true">{icon}</span>
    <p className="game-empty-state__title">{title}</p>
    {description && <p className="game-empty-state__description">{description}</p>}
    {action && <div className="game-empty-state__action">{action}</div>}
  </div>;
}

export function ActionBar({ className, sticky = false, ...props }: HTMLAttributes<HTMLDivElement> & { sticky?: boolean }) {
  return <div className={classes("game-action-bar", sticky && "game-action-bar--sticky", className)} {...props} />;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-market-header">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>{eyebrow && <p className="page-market-header__eyebrow">{eyebrow}</p>}<h1 className="page-market-header__title">{title}</h1>{description && <p className="page-market-header__description">{description}</p>}</div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  </header>;
}

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  const code = process.env.NODE_ENV === "development" && error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "";
  return <div role="alert" className="game-error-box"><p className="game-error-box__eyebrow">SYSTEM ALERT</p><p className="game-error-box__message">{error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ"}{code ? ` (${code})` : ""}</p>{retry && <GameButton variant="danger" size="sm" className="mt-3" onClick={retry}>ลองใหม่อีกครั้ง</GameButton>}</div>;
}

// Compatibility exports for existing pages. New code should use EmptyState and StatusBadge.
export function Empty({ text }: { text: string }) {
  return <EmptyState title={text} />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Exclude<Tone, "info"> }) {
  return <StatusBadge tone={tone}>{children}</StatusBadge>;
}
