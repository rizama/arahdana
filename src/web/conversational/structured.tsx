import type { EducationLevel, Result } from "../../domain/calculators/types";
import {
  availableLevels,
  educationPreset,
  resetEducationSelection,
  schoolTypes,
  type Region,
} from "../../domain/calculators/education";
import { money, percent } from "../config";
import { decimal, parseRupiah, type Answers } from "./answers";
import { UnitInput } from "./controls";
import type { ExtraContext } from "./specs";
import binderCss from "../emergency/emergency-binder.module.css";
import css from "./conversational.module.css";

const order: EducationLevel[] = ["sd", "smp", "sma", "s1"];
export const weddingItems: readonly (readonly [string, string])[] = [
  ["venue", "Venue"],
  ["mc", "MC"],
  ["wo", "Wedding organizer"],
  ["makeup", "Makeup"],
  ["pakaian", "Pakaian"],
  ["mahar", "Mahar"],
  ["dokumentasi", "Dokumentasi"],
  ["music", "Musik"],
  ["dekorasi", "Dekorasi"],
  ["etc", "Lain-lain"],
];
export const weddingGroups = [
  ["catering", "Katering", "katering"],
  ["souvenir", "Suvenir", "suvenir"],
  ["invitation", "Undangan", "undangan"],
] as const;
const schoolLabels: Record<string, string> = {
  negeri: "Negeri",
  swasta: "Swasta",
  nasionalPlus: "Nasional Plus",
  internasional: "Internasional",
  general: "General",
};
const regions: readonly (readonly [Region, string])[] = [
  ["jakarta", "Jakarta"],
  ["jawa", "Jawa"],
  ["luarJawa", "Luar Jawa"],
  ["abroad", "Luar Negeri"],
];
export type EducationState = {
  region: Region;
  school: string;
  entrance: string;
  tuition: string;
  other_percent: string;
  multiplier: string;
};

export function educationState(
  level: EducationLevel,
  region: Region = "jakarta",
  school?: string,
): EducationState {
  const preset = educationPreset(
    level,
    region,
    school ?? schoolTypes(level, region)[0] ?? "swasta",
  );
  return {
    region,
    school: preset.school,
    entrance: String(preset.entrance),
    tuition: String(preset.tuition),
    other_percent: "10",
    multiplier: String(preset.multiplier),
  };
}

export function initialEducation() {
  return Object.fromEntries(
    order.map((level) => [level, educationState(level)]),
  ) as Record<EducationLevel, EducationState>;
}

function MoneyField({
  name,
  label,
  value,
  onValue,
}: {
  name: string;
  label: string;
  value: string;
  onValue: (value: string) => void;
}) {
  return (
    <div className={css.subField}>
      <label className={css.subFieldLabel} htmlFor={name}>
        {label}
      </label>
      <UnitInput
        id={name}
        name={name}
        unit="Rp"
        value={value}
        inputMode="numeric"
        onValue={onValue}
      />
    </div>
  );
}

function NumberField({
  name,
  label,
  value,
  onValue,
  max,
}: {
  name: string;
  label: string;
  value: string;
  onValue: (value: string) => void;
  max: number;
}) {
  return (
    <div className={css.subField}>
      <label className={css.subFieldLabel} htmlFor={name}>
        {label}
      </label>
      <UnitInput
        id={name}
        name={name}
        unit=""
        value={value}
        inputMode="numeric"
        onValue={onValue}
        aria-label={label + " maksimal " + max}
      />
    </div>
  );
}

export function WeddingBudgetView({ view }: { view: ExtraContext }) {
  const answers = view.answers;
  if (answers.wedding_mode !== "detailed") {
    return (
      <UnitInput
        id="wedding-budget"
        name="budget"
        unit="Rp"
        value={answers.budget ?? ""}
        inputMode="numeric"
        onValue={(value) => view.update("budget", value)}
      />
    );
  }
  const total =
    weddingItems.reduce(
      (sum, [key]) => sum + (parseRupiah(answers[key] ?? "") || 0),
      0,
    ) +
    weddingGroups.reduce(
      (sum, [key]) =>
        sum +
        (Number(answers["count_" + key] ?? 0) || 0) *
          (parseRupiah(answers["price_" + key] ?? "") || 0),
      0,
    );

  return (
    <div className={css.groupedFields}>
      <fieldset className={css.subCard}>
        <legend className={css.subCardLegend}>Pos acara &amp; perlengkapan</legend>
        <div className={css.fieldGrid}>
          {weddingItems.map(([key, label]) => (
            <MoneyField
              key={key}
              name={key}
              label={label}
              value={answers[key] ?? ""}
              onValue={(value) => view.update(key, value)}
            />
          ))}
        </div>
      </fieldset>
      {weddingGroups.map(([key, label, title]) => (
        <fieldset key={key} className={css.subCard}>
          <legend className={css.subCardLegend}>{label}</legend>
          <div className={css.fieldGrid}>
            <NumberField
              name={"count_" + key}
              label={"Jumlah " + title}
              value={answers["count_" + key] ?? ""}
              max={1e6}
              onValue={(value) => view.update("count_" + key, value)}
            />
            <MoneyField
              name={"price_" + key}
              label={"Harga satuan " + title}
              value={answers["price_" + key] ?? ""}
              onValue={(value) => view.update("price_" + key, value)}
            />
          </div>
        </fieldset>
      ))}
      <p className={css.subtotalBar}>
        <span>Total anggaran saat ini</span>
        <strong className={css.tabular}>{money(total)}</strong>
      </p>
    </div>
  );
}

export function weddingBudgetError(answers: Answers) {
  if (answers.wedding_mode !== "detailed") {
    return parseRupiah(answers.budget ?? "") >= 0
      ? ""
      : "Isi total anggaran dengan nominal Rp0 atau lebih.";
  }
  for (const [key] of weddingItems) {
    if (!(parseRupiah(answers[key] ?? "") >= 0)) {
      return "Isi seluruh pos biaya dengan nominal Rp0 atau lebih.";
    }
  }
  for (const [key] of weddingGroups) {
    if (
      !(Number(answers["count_" + key]) >= 0) ||
      !(parseRupiah(answers["price_" + key] ?? "") >= 0)
    ) {
      return "Isi jumlah dan harga satuan dengan angka 0 atau lebih.";
    }
  }
  return "";
}

export function EducationLevelsView({ view }: { view: ExtraContext }) {
  const age = Number(view.answers.child_age ?? 0);
  const available = availableLevels(age);
  const selected = (view.extra.selected as EducationLevel[]) ?? [];
  const education =
    (view.extra.education as Record<EducationLevel, EducationState>) ?? initialEducation();

  function toggle(level: EducationLevel, checked: boolean) {
    const next = checked
      ? [...selected, level]
      : selected.filter((item) => item !== level);
    view.setExtra({
      ...view.extra,
      selected: resetEducationSelection(age, next),
      education,
    });
  }

  function updateSchool(
    level: EducationLevel,
    key: keyof EducationState,
    value: string,
  ) {
    const current = education[level];
    let next: EducationState;
    if (key === "region") {
      const region = value as Region;
      next = educationState(level, region, region === "abroad" ? "general" : undefined);
    } else if (key === "school") {
      next = educationState(level, current.region, value);
    } else {
      next = { ...current, [key]: value };
    }
    view.setExtra({
      ...view.extra,
      selected,
      education: { ...education, [level]: next },
    });
  }

  return (
    <div className={css.groupedFields}>
      <fieldset className={css.subCard}>
        <legend className={css.subCardLegend}>Rentang jenjang kontinu</legend>
        <div className={css.levelChoices}>
          {order.map((level) => (
            <label key={level} className={css.levelChoice}>
              <input
                className={css.levelChoiceInput}
                type="checkbox"
                name={"level-" + level}
                checked={selected.includes(level)}
                disabled={!available.includes(level)}
                onChange={(event) => toggle(level, event.currentTarget.checked)}
              />
              <span>{level.toUpperCase()}</span>
            </label>
          ))}
        </div>
        <p className={css.levelHint}>
          Usia 6/12/15 menutup pilihan SD/SMP/SMA. Pilih awal dan akhir rentang; jenjang di
          antaranya disertakan.
        </p>
      </fieldset>
      {selected.map((level) => {
        const state = education[level];
        return (
          <fieldset key={level} className={css.subCard}>
            <legend className={css.subCardLegend}>Jenjang {level.toUpperCase()}</legend>
            <div className={css.fieldGrid}>
              <div className={css.subField}>
                <label className={css.subFieldLabel} htmlFor={level + "-region"}>
                  Lokasi {level.toUpperCase()}
                </label>
                <select
                  className={css.tactileSelect}
                  id={level + "-region"}
                  name={level + "-region"}
                  value={state.region}
                  onChange={(event) => updateSchool(level, "region", event.target.value)}
                >
                  {regions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={css.subField}>
                <label className={css.subFieldLabel} htmlFor={level + "-school"}>
                  Jenis sekolah {level.toUpperCase()}
                </label>
                <select
                  className={css.tactileSelect}
                  id={level + "-school"}
                  name={level + "-school"}
                  value={state.school}
                  onChange={(event) => updateSchool(level, "school", event.target.value)}
                >
                  {schoolTypes(level, state.region).map((key) => (
                    <option key={key} value={key}>
                      {schoolLabels[key] ?? key}
                    </option>
                  ))}
                </select>
              </div>
              <MoneyField
                name={level + "-entrance"}
                label={"Uang pangkal " + level.toUpperCase()}
                value={state.entrance}
                onValue={(value) => updateSchool(level, "entrance", value)}
              />
              <MoneyField
                name={level + "-tuition"}
                label={"SPP per periode " + level.toUpperCase()}
                value={state.tuition}
                onValue={(value) => updateSchool(level, "tuition", value)}
              />
              <NumberField
                name={level + "-other"}
                label={"Biaya lain " + level.toUpperCase() + " (%)"}
                value={state.other_percent}
                max={100}
                onValue={(value) => updateSchool(level, "other_percent", value)}
              />
              <div className={css.subField}>
                <label className={css.subFieldLabel} htmlFor={level + "-multiplier"}>
                  Frekuensi SPP {level.toUpperCase()}
                </label>
                <select
                  className={css.tactileSelect}
                  id={level + "-multiplier"}
                  name={level + "-multiplier"}
                  value={state.multiplier}
                  onChange={(event) => updateSchool(level, "multiplier", event.target.value)}
                >
                  <option value="12">Bulanan</option>
                  <option value="2">Semester</option>
                  <option value="1">Tahunan</option>
                </select>
              </div>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export function educationLevelsError(answers: Answers, extra: Record<string, unknown>) {
  const selected = (extra.selected as EducationLevel[]) ?? [];
  if (!selected.length) return "Pilih setidaknya satu jenjang yang masih tersedia.";
  const age = Number(answers.child_age ?? 0);
  const normalized = resetEducationSelection(age, selected);
  if (
    normalized.length !== selected.length ||
    normalized.some((level, i) => level !== selected[i])
  ) {
    return "Pilih rentang jenjang yang kontinu dan masih tersedia.";
  }
  return "";
}

export function educationAfterAge(
  key: string,
  value: string,
  _answers: Answers,
  extra: Record<string, unknown>,
) {
  if (key !== "child_age" || !extra.education) return extra;
  const selected = (extra.selected as EducationLevel[]) ?? [];
  return { ...extra, selected: resetEducationSelection(Number(value), selected) };
}

export function educationPayload(extra: Record<string, unknown>) {
  const selected = (extra.selected as EducationLevel[]) ?? [];
  const education =
    (extra.education as Record<EducationLevel, EducationState>) ?? {};
  return selected.map((level) => {
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
  const raw =
    (parseRupiah(view.answers.price ?? "") || 0) *
    (1 - (decimal(view.answers.dp ?? "") || 0) / 100);
  const principal = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  return (
    <p className={css.liveNote}>
      Pokok pinjaman awal:{" "}
      <strong className={css.tabular}>{money(principal)}</strong>
    </p>
  );
}

export function DataTable({
  caption,
  data,
  columns,
  embedded = false,
}: {
  caption: string;
  data: Result[];
  columns: readonly (readonly [string, string, "text" | "number" | "money"])[];
  embedded?: boolean;
}) {
  if (!data.length) return null;
  const table = (
    <div className={css.tableScroll} tabIndex={0}>
      <table className={css.dataTable}>
        <thead>
          <tr>
            {columns.map(([key, label, format]) => (
              <th
                key={key}
                scope="col"
                className={format === "text" ? undefined : css.numCell}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map(([key, , format]) => (
                <td
                  key={key}
                  className={format === "text" ? undefined : css.numCell}
                >
                  {format === "money"
                    ? money(Number(row[key]) || 0)
                    : format === "number"
                      ? (Number(row[key]) || 0).toLocaleString("id-ID")
                      : String(row[key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  if (embedded) return table;
  return (
    <section className={binderCss.binderCard}>
      <div className={binderCss.binderCardHead}>
        <h3>{caption}</h3>
      </div>
      {table}
    </section>
  );
}

const stageBarClasses = [
  css.stageBar0,
  css.stageBar1,
  css.stageBar2,
  css.stageBar3,
] as const;

const stageDotClasses = [
  css.stageDot0,
  css.stageDot1,
  css.stageDot2,
  css.stageDot3,
] as const;

export function StackedBar({
  parts,
}: {
  parts: readonly { label: string; percent: number }[];
}) {
  let offset = 0;
  return (
    <section className={binderCss.binderCard}>
      <div className={binderCss.binderCardHead}>
        <h3>Proporsi biaya pendidikan</h3>
        <span className={binderCss.binderCardNote}>porsi tiap jenjang aktif</span>
      </div>
      <svg
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className={css.stackedBar}
        role="img"
        aria-label={parts.map((part) => `${part.label} ${percent(part.percent)}`).join(", ")}
      >
        {parts.map((part, index) => {
          const x = offset;
          const width = Math.max(0, Math.min(100 - offset, part.percent));
          offset += width;
          return (
            <rect
              key={part.label}
              x={x}
              y="0"
              width={width}
              height="10"
              className={stageBarClasses[index % stageBarClasses.length]}
            />
          );
        })}
      </svg>
      <div className={css.stageLegend}>
        {parts.map((part, index) => (
          <span key={part.label} className={css.stageLegendItem}>
            <span
              className={stageDotClasses[index % stageDotClasses.length]}
              aria-hidden="true"
            />
            <span>
              {part.label} {percent(part.percent)}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

export function stageRows(result: Result) {
  return ((result.education_stages ?? result.breakdown) as Result[]) ?? [];
}
