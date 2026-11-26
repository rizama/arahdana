import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import css from "./emergency-binder.module.css";

function SheetHeaderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </svg>
  );
}

function TabIcon({ label }: { label: string }) {
  if (label === "Rekomendasi") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20.5 4.9 13.4a4.8 4.8 0 0 1 6.8-6.8L12 7l.3-.4a4.8 4.8 0 0 1 6.8 6.8L12 20.5Z" />
      </svg>
    );
  }
  if (label === "Download") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </svg>
  );
}

export function ResultSheet({
  dialog,
  onClose,
  returnFocus,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  action,
  children,
}: {
  dialog: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  returnFocus?: RefObject<HTMLElement | null>;
  title: string;
  subtitle?: string;
  tabs: readonly string[];
  activeTab?: number;
  onTabChange?: (index: number) => void;
  action?: { label: string; onClick: () => void };
  children: (tab: number) => ReactNode;
}) {
  const id = useId();
  const [internalActive, setInternalActive] = useState(0);
  const current = activeTab ?? internalActive;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const close = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) {
      returnFocus?.current?.focus();
      element.showModal();
      close.current?.focus();
    }
  }, [dialog]);

  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
  }, [current]);

  function select(index: number) {
    if (onTabChange) onTabChange(index);
    else setInternalActive(index);
    if (body.current) body.current.scrollTop = 0;
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={id + "-heading"}
      aria-modal="true"
      className={css.sheet}
      onClose={onClose}
    >
      <div className={css.brassClipLeft} aria-hidden="true" />
      <div className={css.brassClipRight} aria-hidden="true" />

      <header className={css.sheetHeader}>
        <div className={css.sheetHeaderLeft}>
          <div className={css.sheetIconTile}>
            <SheetHeaderIcon />
          </div>
          <div>
            <h2 id={id + "-heading"}>{title}</h2>
            {subtitle && <p className={css.sheetSubtitle}>{subtitle}</p>}
          </div>
        </div>
        <div className={css.sheetHeaderRight}>
          <span className={css.escBadge} aria-hidden="true">
            ESC
          </span>
          <button
            type="button"
            ref={close}
            className={css.closeBtn}
            onClick={() => dialog.current?.close()}
            aria-label="Tutup hasil"
          >
            ✕
          </button>
        </div>
      </header>

      <div ref={body} className={css.sheetBody}>
        {tabs.map((tabLabel, i) => (
          <div
            key={tabLabel}
            role="tabpanel"
            id={id + "-panel-" + i}
            aria-labelledby={id + "-tab-" + i}
            tabIndex={0}
            className={css.tabPanel}
            hidden={current !== i}
          >
            {children(i)}
          </div>
        ))}
      </div>

      <footer className={css.sheetFooter}>
        <div role="tablist" aria-label="Bagian hasil" className={css.sheetTabs}>
          {tabs.map((tabLabel, i) => (
            <button
              key={tabLabel}
              type="button"
              role="tab"
              ref={(element) => {
                buttons.current[i] = element;
              }}
              id={id + "-tab-" + i}
              aria-controls={id + "-panel-" + i}
              aria-selected={i === current}
              tabIndex={i === current ? 0 : -1}
              className={css.sheetTabBtn}
              onClick={() => select(i)}
              onKeyDown={(event) => {
                const next = {
                  ArrowLeft: (i - 1 + tabs.length) % tabs.length,
                  ArrowRight: (i + 1) % tabs.length,
                  Home: 0,
                  End: tabs.length - 1,
                }[event.key];
                if (next === undefined) return;
                event.preventDefault();
                select(next);
                buttons.current[next]?.focus();
              }}
            >
              <TabIcon label={tabLabel} />
              <span>{tabLabel}</span>
            </button>
          ))}
        </div>

        <div className={css.sheetFooterActions}>
          <button
            type="button"
            className={css.btnSheetSecondary}
            onClick={() => dialog.current?.close()}
          >
            Tutup
          </button>
          {action && (
            <button
              type="button"
              className={css.btnSheetPrimary}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
        </div>
      </footer>
    </dialog>
  );
}
