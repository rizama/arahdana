import { useLayoutEffect, useRef, type InputHTMLAttributes } from 'react';
import { formatRupiah, rupiahDigits } from './answers';
import css from './conversational.module.css';

export function UnitInput({ unit, value, onValue, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  unit: string; value: string; onValue: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const currency = unit === 'Rp';
  const display = currency ? formatRupiah(value) : value;
  useLayoutEffect(() => {
    if (caret.current !== null) input.current?.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });
  return <div className={css.unitInput}>
    {currency && <span aria-hidden="true">Rp</span>}
    <input {...props} ref={input} type="text" value={display} onChange={(event) => {
      const field = event.currentTarget;
      if (!currency) { onValue(field.value); return; }
      let digits = rupiahDigits(field.value);
      let before = rupiahDigits(field.value.slice(0, field.selectionStart ?? field.value.length)).length;
      // Deleting a thousands separator should delete the adjacent digit.
      const inputType = (event.nativeEvent as InputEvent).inputType;
      if (digits === value && field.value !== display) {
        const index = inputType === 'deleteContentBackward' ? before - 1 : before;
        if (inputType?.startsWith('delete') && index >= 0 && index < digits.length) {
          digits = digits.slice(0, index) + digits.slice(index + 1);
          before = index;
        }
      }
      const formatted = formatRupiah(digits);
      let position = 0;
      while (before > 0 && position < formatted.length) {
        if (formatted[position++] !== '.') before--;
      }
      if (digits === value) {
        field.value = display;
        field.setSelectionRange(position, position);
      } else {
        caret.current = position;
        onValue(digits);
      }
    }} />
    {!currency && <span aria-hidden="true">{unit}</span>}
  </div>;
}

export function PillOptions({ name, value, options, onValue, invalid, describedBy }: {
  name: string; value: string; options: readonly (readonly [string, string])[];
  onValue: (value: string) => void; invalid?: boolean; describedBy?: string;
}) {
  return <div className={css.options}>{options.map(([key, label]) =>
    <label key={key}>
      <input className={css.sr} type="radio" name={name} value={key} checked={value === key}
        aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={() => onValue(key)} />
      <span>{label}</span>
    </label>
  )}</div>;
}
