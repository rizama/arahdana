import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import css from './conversational.module.css';

export function ResultSheet({ dialog, onClose, returnFocus, title, tabs, children }: {
  dialog: RefObject<HTMLDialogElement | null>; onClose: () => void; returnFocus?: RefObject<HTMLElement | null>; title: string;
  tabs: readonly string[]; children: (tab: number) => ReactNode;
}) {
  const id = useId();
  const [active, setActive] = useState(0);
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
  function select(index: number) {
    setActive(index);
    if (body.current) body.current.scrollTop = 0;
  }
  return <dialog ref={dialog} aria-labelledby={id + '-heading'} className={css.sheet} onClose={onClose}>
    <header className={css.sheetHeader}>
      <h2 id={id + '-heading'}>{title}</h2>
      <button type="button" ref={close} onClick={() => dialog.current?.close()} aria-label="Tutup hasil">✕</button>
    </header>
    <div ref={body} className={css.sheetBody}>
      {tabs.map((tab, i) => <div key={tab} role="tabpanel" id={id + '-panel-' + i}
        aria-labelledby={id + '-tab-' + i} tabIndex={0} hidden={active !== i}>{children(i)}</div>)}
    </div>
    <div role="tablist" aria-label="Bagian hasil" className={css.tabs}>
      {tabs.map((tab, i) => <button key={tab} type="button" role="tab" ref={element => { buttons.current[i] = element; }}
        id={id + '-tab-' + i} aria-controls={id + '-panel-' + i} aria-selected={i === active}
        tabIndex={i === active ? 0 : -1} onClick={() => select(i)} onKeyDown={event => {
          const next = { ArrowLeft: (i - 1 + tabs.length) % tabs.length, ArrowRight: (i + 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
          if (next === undefined) return;
          event.preventDefault();
          select(next);
          buttons.current[next]?.focus();
        }}>{tab}</button>)}
    </div>
  </dialog>;
}
