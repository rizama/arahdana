import type { EducationLevel, Result } from '../../domain/calculators/types';
import {
  availableLevels, educationPreset, resetEducationSelection, schoolTypes,
  type Region,
} from '../../domain/calculators/education';
import { money, percent } from '../config';
import { decimal, parseRupiah, type Answers } from './answers';
import { UnitInput } from './controls';
import type { ExtraContext } from './specs';
import css from './conversational.module.css';

const order: EducationLevel[] = ['sd', 'smp', 'sma', 's1'];
const entry: Record<EducationLevel, number> = { sd: 6, smp: 12, sma: 15, s1: 18 };
export const weddingItems: readonly (readonly [string, string])[] = [
  ['venue', 'Venue'], ['mc', 'MC'], ['wo', 'Wedding organizer'], ['makeup', 'Makeup'],
  ['pakaian', 'Pakaian'], ['mahar', 'Mahar'], ['dokumentasi', 'Dokumentasi'],
  ['music', 'Musik'], ['dekorasi', 'Dekorasi'], ['etc', 'Lain-lain'],
];
export const weddingGroups = [
  ['catering', 'Katering', 'katering'],
  ['souvenir', 'Suvenir', 'suvenir'],
  ['invitation', 'Undangan', 'undangan'],
] as const;
const schoolLabels: Record<string, string> = {
  negeri: 'Negeri', swasta: 'Swasta', nasionalPlus: 'Nasional Plus',
  internasional: 'Internasional', general: 'General',
};
const regions: readonly (readonly [Region, string])[] = [
  ['jakarta', 'Jakarta'], ['jawa', 'Jawa'], ['luarJawa', 'Luar Jawa'], ['abroad', 'Luar Negeri'],
];
export type EducationState = {
  region: Region; school: string; entrance: string; tuition: string;
  other_percent: string; multiplier: string;
};
export function educationState(level: EducationLevel, region: Region = 'jakarta', school?: string): EducationState {
  const preset = educationPreset(level, region, school ?? schoolTypes(level, region)[0] ?? 'swasta');
  return {
    region, school: preset.school, entrance: String(preset.entrance),
    tuition: String(preset.tuition), other_percent: '10', multiplier: String(preset.multiplier),
  };
}
export function initialEducation() {
  return Object.fromEntries(order.map(level => [level, educationState(level)])) as Record<EducationLevel, EducationState>;
}

function MoneyField({ name, label, value, onValue }: {
  name: string; label: string; value: string; onValue: (value: string) => void;
}) {
  return <div className={css.fieldGroup}>
    <label htmlFor={name}>{label}</label>
    <UnitInput id={name} name={name} unit="Rp" value={value} inputMode="numeric" onValue={onValue} />
  </div>;
}
function NumberField({ name, label, value, onValue, max }: {
  name: string; label: string; value: string; onValue: (value: string) => void; max: number;
}) {
  return <div className={css.fieldGroup}>
    <label htmlFor={name}>{label}</label>
    <UnitInput id={name} name={name} unit="" value={value} inputMode="numeric" onValue={onValue} aria-label={label + ' maksimal ' + max} />
  </div>;
}

export function WeddingBudgetView({ view }: { view: ExtraContext }) {
  const answers = view.answers;
  if (answers.wedding_mode !== 'detailed') return <UnitInput id="wedding-budget" name="budget" unit="Rp"
    value={answers.budget ?? ''} inputMode="numeric" onValue={value => view.update('budget', value)} />;
  const total = weddingItems.reduce((sum, [key]) => sum + (parseRupiah(answers[key] ?? '') || 0), 0)
    + weddingGroups.reduce((sum, [key]) => sum + (Number(answers['count_' + key] ?? 0) || 0) * (parseRupiah(answers['price_' + key] ?? '') || 0), 0);
  return <div className={css.groupedFields}>
    <div className={css.fieldGrid}>
      {weddingItems.map(([key, label]) => <MoneyField key={key} name={key} label={label} value={answers[key] ?? ''}
        onValue={value => view.update(key, value)} />)}
    </div>
    {weddingGroups.map(([key, label, title]) => <fieldset key={key} className={css.fieldGroup}>
      <legend>{label}</legend>
      <div className={css.fieldGrid}>
        <NumberField name={'count_' + key} label={'Jumlah ' + title} value={answers['count_' + key] ?? ''}
          max={1e6} onValue={value => view.update('count_' + key, value)} />
        <MoneyField name={'price_' + key} label={'Harga satuan ' + title} value={answers['price_' + key] ?? ''}
          onValue={value => view.update('price_' + key, value)} />
      </div>
    </fieldset>)}
    <p className={css.note}>Total anggaran saat ini <strong className={css.tabular}>{money(total)}</strong></p>
  </div>;
}
export function weddingBudgetError(answers: Answers) {
  if (answers.wedding_mode !== 'detailed') {
    return parseRupiah(answers.budget ?? '') >= 0 ? '' : 'Isi total anggaran dengan nominal Rp0 atau lebih.';
  }
  for (const [key] of weddingItems) if (!(parseRupiah(answers[key] ?? '') >= 0)) return 'Isi seluruh pos biaya dengan nominal Rp0 atau lebih.';
  for (const [key] of weddingGroups) {
    if (!(Number(answers['count_' + key]) >= 0) || !(parseRupiah(answers['price_' + key] ?? '') >= 0))
      return 'Isi jumlah dan harga satuan dengan angka 0 atau lebih.';
  }
  return '';
}

export function EducationLevelsView({ view }: { view: ExtraContext }) {
  const age = Number(view.answers.child_age ?? 0);
  const available = availableLevels(age);
  const selected = (view.extra.selected as EducationLevel[]) ?? [];
  const education = (view.extra.education as Record<EducationLevel, EducationState>) ?? initialEducation();
  function toggle(level: EducationLevel, checked: boolean) {
    const next = checked ? [...selected, level] : selected.filter(item => item !== level);
    view.setExtra({
      ...view.extra,
      selected: resetEducationSelection(age, next),
      education,
    });
  }
  function updateSchool(level: EducationLevel, key: keyof EducationState, value: string) {
    const current = education[level];
    let next: EducationState;
    if (key === 'region') {
      const region = value as Region;
      next = educationState(level, region, region === 'abroad' ? 'general' : undefined);
    } else if (key === 'school') {
      next = educationState(level, current.region, value);
    } else {
      next = { ...current, [key]: value };
    }
    view.setExtra({ ...view.extra, selected, education: { ...education, [level]: next } });
  }
  return <div className={css.groupedFields}>
    <fieldset className={css.fieldGroup}>
      <legend>Rentang jenjang kontinu</legend>
      <div className={css.levelChoices}>{order.map(level => <label key={level}>
        <input type="checkbox" name={'level-' + level} checked={selected.includes(level)}
          disabled={!available.includes(level)} onChange={event => toggle(level, event.currentTarget.checked)} />
        {level.toUpperCase()}
      </label>)}</div>
      <p>Usia 6/12/15 menutup pilihan SD/SMP/SMA. Pilih awal dan akhir rentang; jenjang di antaranya disertakan.</p>
    </fieldset>
    {selected.map(level => {
      const state = education[level];
      return <fieldset key={level} className={css.fieldGroup}>
        <legend>Jenjang {level.toUpperCase()}</legend>
        <div className={css.fieldGrid}>
          <div className={css.fieldGroup}>
            <label htmlFor={level + '-region'}>Lokasi {level.toUpperCase()}</label>
            <select id={level + '-region'} name={level + '-region'} value={state.region}
              onChange={event => updateSchool(level, 'region', event.target.value)}>
              {regions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className={css.fieldGroup}>
            <label htmlFor={level + '-school'}>Jenis sekolah {level.toUpperCase()}</label>
            <select id={level + '-school'} name={level + '-school'} value={state.school}
              onChange={event => updateSchool(level, 'school', event.target.value)}>
              {schoolTypes(level, state.region).map(key => <option key={key} value={key}>{schoolLabels[key] ?? key}</option>)}
            </select>
          </div>
          <MoneyField name={level + '-entrance'} label={'Uang pangkal ' + level.toUpperCase()} value={state.entrance}
            onValue={value => updateSchool(level, 'entrance', value)} />
          <MoneyField name={level + '-tuition'} label={'SPP per periode ' + level.toUpperCase()} value={state.tuition}
            onValue={value => updateSchool(level, 'tuition', value)} />
          <NumberField name={level + '-other'} label={'Biaya lain ' + level.toUpperCase() + ' (%)'} value={state.other_percent}
            max={100} onValue={value => updateSchool(level, 'other_percent', value)} />
          <div className={css.fieldGroup}>
            <label htmlFor={level + '-multiplier'}>Frekuensi SPP {level.toUpperCase()}</label>
            <select id={level + '-multiplier'} name={level + '-multiplier'} value={state.multiplier}
              onChange={event => updateSchool(level, 'multiplier', event.target.value)}>
              <option value="12">Bulanan</option><option value="2">Semester</option><option value="1">Tahunan</option>
            </select>
          </div>
        </div>
      </fieldset>;
    })}
  </div>;
}
export function educationLevelsError(answers: Answers, extra: Record<string, unknown>) {
  const selected = (extra.selected as EducationLevel[]) ?? [];
  if (!selected.length) return 'Pilih setidaknya satu jenjang yang masih tersedia.';
  const age = Number(answers.child_age ?? 0);
  const normalized = resetEducationSelection(age, selected);
  if (normalized.length !== selected.length || normalized.some((level, i) => level !== selected[i]))
    return 'Pilih rentang jenjang yang kontinu dan masih tersedia.';
  return '';
}
export function educationAfterAge(key: string, value: string, _answers: Answers, extra: Record<string, unknown>) {
  if (key !== 'child_age' || !extra.education) return extra;
  const selected = (extra.selected as EducationLevel[]) ?? [];
  return { ...extra, selected: resetEducationSelection(Number(value), selected) };
}
export function educationPayload(extra: Record<string, unknown>) {
  const selected = (extra.selected as EducationLevel[]) ?? [];
  const education = (extra.education as Record<EducationLevel, EducationState>) ?? {};
  return selected.map(level => {
    const state = education[level];
    return {
      level,
      entrance: parseRupiah(state.entrance) || 0,
      tuition: parseRupiah(state.tuition) || 0,
      other_percent: decimal(state.other_percent) || 0,
      multiplier: Number(state.multiplier),
    };
  });
}

export function KprPrincipalNote({ view }: { view: ExtraContext }) {
  const principal = (parseRupiah(view.answers.price ?? '') || 0) * (1 - (decimal(view.answers.dp ?? '') || 0) / 100);
  return <p className={css.note}>Pokok pinjaman awal: <strong className={css.tabular}>{money(principal)}</strong></p>;
}

export function DataTable({ caption, data, columns }: {
  caption: string; data: Result[];
  columns: readonly (readonly [string, string, 'text' | 'number' | 'money'])[];
}) {
  if (!data.length) return null;
  return <section className={css.card}>
    <h3>{caption}</h3>
    <div className={css.tableScroll}>
      <table><thead><tr>{columns.map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead>
        <tbody>{data.map((row, index) => <tr key={index}>{columns.map(([key, , format]) => <td key={key}>
          {format === 'money' ? money(Number(row[key]) || 0)
            : format === 'number' ? String(Number(row[key]) || 0)
            : String(row[key] ?? '')}
        </td>)}</tr>)}</tbody>
      </table>
    </div>
  </section>;
}
export function StackedBar({ parts }: { parts: readonly { label: string; percent: number }[] }) {
  let offset = 0;
  return <section className={css.card}>
    <h3>Proporsi biaya pendidikan</h3>
    <svg viewBox="0 0 100 8" preserveAspectRatio="none" className={css.stackedBar} aria-hidden="true">
      {parts.map(part => {
        const x = offset, width = Math.max(0, Math.min(100 - offset, part.percent));
        offset += width;
        return <rect key={part.label} x={x} width={width} height="8" className={css.stackedPart} />;
      })}
    </svg>
    <p>{parts.map(part => part.label + ' ' + percent(part.percent)).join(' · ')}</p>
  </section>;
}
export function stageRows(result: Result) {
  return ((result.education_stages ?? result.breakdown) as Result[]) ?? [];
}
