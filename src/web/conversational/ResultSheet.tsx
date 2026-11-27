import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import binderCss from "../emergency/emergency-binder.module.css";
import css from "./conversational.module.css";

type SheetTone = "success" | "danger";

function SheetHeaderIcon({ tone }: { tone: SheetTone }) {
  if (tone === "danger") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
  if (label === "Biaya Transaksi") {
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
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
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
  tone = "success",
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
  tone?: SheetTone;
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

  const wideTabs = tabs.some((label) => label.length > 12);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={id + "-heading"}
      aria-modal="true"
      className={binderCss.sheet}
      onClose={onClose}
    >
      <div className={binderCss.brassClipLeft} aria-hidden="true" />
      <div className={binderCss.brassClipRight} aria-hidden="true" />

      <header className={binderCss.sheetHeader}>
        <div className={binderCss.sheetHeaderLeft}>
          <div className={binderCss.sheetIconTile} data-tone={tone}>
            <SheetHeaderIcon tone={tone} />
          </div>
          <div>
            <h2 id={id + "-heading"}>{title}</h2>
            {subtitle && <p className={binderCss.sheetSubtitle}>{subtitle}</p>}
          </div>
        </div>
        <div className={binderCss.sheetHeaderRight}>
          <span className={binderCss.escBadge} aria-hidden="true">
            ESC
          </span>
          <button
            type="button"
            ref={close}
            className={binderCss.closeBtn}
            onClick={() => dialog.current?.close()}
            aria-label="Tutup hasil"
          >
            ✕
          </button>
        </div>
      </header>

      <div ref={body} className={binderCss.sheetBody}>
        {tabs.map((tabLabel, i) => (
          <div
            key={tabLabel}
            role="tabpanel"
            id={id + "-panel-" + i}
            aria-labelledby={id + "-tab-" + i}
            tabIndex={0}
            className={binderCss.tabPanel}
            hidden={current !== i}
          >
            {children(i)}
          </div>
        ))}
      </div>

      <footer className={binderCss.sheetFooter}>
        <div
          role="tablist"
          aria-label="Bagian hasil"
          className={binderCss.sheetTabs + (wideTabs ? " " + css.sheetTabsWide : "")}
        >
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
              className={binderCss.sheetTabBtn}
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

        <div className={binderCss.sheetFooterActions}>
          <button
            type="button"
            className={binderCss.btnSheetSecondary}
            onClick={() => dialog.current?.close()}
          >
            Tutup
          </button>
          {action && (
            <button
              type="button"
              className={binderCss.btnSheetPrimary}
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
