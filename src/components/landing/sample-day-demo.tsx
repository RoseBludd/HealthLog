"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Droplet,
  HeartPulse,
  Moon,
  Plus,
  Scale,
  Brain,
  Sparkles,
} from "lucide-react";

type MetricKey = "weight" | "bp" | "glucose" | "sleep" | "mood";

interface Metric {
  key: MetricKey;
  label: string;
  unit: string;
  icon: typeof Scale;
  /** Seven sample readings, oldest first. For blood pressure: systolic. */
  week: number[];
  /** Diastolic companion series (blood pressure only). */
  week2?: number[];
  placeholder: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const METRICS: Metric[] = [
  {
    key: "weight",
    label: "Weight",
    unit: "lb",
    icon: Scale,
    week: [182.4, 182.0, 181.6, 181.9, 181.2, 180.8, 180.6],
    placeholder: "180.4",
    min: 50,
    max: 700,
    step: 0.1,
    format: (v) => v.toFixed(1),
  },
  {
    key: "bp",
    label: "Blood pressure",
    unit: "mmHg",
    icon: HeartPulse,
    week: [128, 125, 127, 122, 124, 121, 120],
    week2: [82, 80, 81, 79, 80, 78, 78],
    placeholder: "119",
    min: 60,
    max: 250,
    step: 1,
    format: (v) => Math.round(v).toString(),
  },
  {
    key: "glucose",
    label: "Glucose",
    unit: "mg/dL",
    icon: Droplet,
    week: [104, 98, 101, 96, 99, 95, 97],
    placeholder: "96",
    min: 20,
    max: 600,
    step: 1,
    format: (v) => Math.round(v).toString(),
  },
  {
    key: "sleep",
    label: "Sleep",
    unit: "h",
    icon: Moon,
    week: [6.2, 6.8, 7.1, 5.9, 7.4, 7.6, 7.2],
    placeholder: "7.5",
    min: 0,
    max: 24,
    step: 0.1,
    format: (v) => v.toFixed(1),
  },
  {
    key: "mood",
    label: "Mood",
    unit: "/ 5",
    icon: Brain,
    week: [3, 3, 4, 2, 4, 4, 5],
    placeholder: "4",
    min: 1,
    max: 5,
    step: 1,
    format: (v) => v.toFixed(1).replace(/\.0$/, ""),
  },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Today"];

function avg(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function insightFor(m: Metric, series: number[]): string {
  const first = avg(series.slice(0, 3));
  const last = avg(series.slice(-3));
  const diff = last - first;
  const abs = Math.abs(diff);
  const dir = diff > 0 ? "higher" : "lower";
  if (abs < m.step * 1.5) {
    return `Your ${m.label.toLowerCase()} has held steady this week. Keep logging to see the longer trend.`;
  }
  const amount = `${m.format(abs)} ${m.unit.replace("/ 5", "points")}`;
  return `Your last three ${m.label.toLowerCase()} readings average ${amount} ${dir} than the start of the week.`;
}

function Chart({ series, series2 }: { series: number[]; series2?: number[] }) {
  const all = series2 ? [...series, ...series2] : series;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo || 1) * 0.25;
  const W = 520;
  const H = 160;
  const x = (i: number, n: number) => 16 + (i * (W - 32)) / Math.max(n - 1, 1);
  const y = (v: number) => H - 16 - ((v - (lo - pad)) * (H - 32)) / (hi - lo + pad * 2 || 1);
  const path = (s: number[]) =>
    s.map((v, i) => `${i === 0 ? "M" : "L"}${x(i, s.length).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = (s: number[]) =>
    `${path(s)} L${x(s.length - 1, s.length).toFixed(1)},${H - 8} L${x(0, s.length).toFixed(1)},${H - 8} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label="Sample trend chart">
      <defs>
        <linearGradient id="medzs-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1="8" x2={W - 8} y1={H * t} y2={H * t} stroke="var(--border)" strokeDasharray="4 4" />
      ))}
      <path d={area(series)} fill="url(#medzs-area)" />
      <path d={path(series)} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {series2 ? (
        <path d={path(series2)} fill="none" stroke="var(--chart-2)" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
      ) : null}
      {series.map((v, i) => (
        <circle
          key={i}
          cx={x(i, series.length)}
          cy={y(v)}
          r={i === series.length - 1 ? 5 : 3}
          fill={i === series.length - 1 ? "var(--primary)" : "var(--card)"}
          stroke="var(--primary)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

export function SampleDayDemo() {
  const [active, setActive] = useState<MetricKey>("weight");
  const [logged, setLogged] = useState<Partial<Record<MetricKey, number>>>({});
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const metric = METRICS.find((m) => m.key === active) ?? METRICS[0];
  const series = useMemo(() => {
    const extra = logged[metric.key];
    return extra === undefined ? metric.week : [...metric.week, extra];
  }, [logged, metric]);
  const series2 = useMemo(() => {
    if (!metric.week2) return undefined;
    const extra = logged[metric.key];
    return extra === undefined ? metric.week2 : [...metric.week2, metric.week2[metric.week2.length - 1]];
  }, [logged, metric]);

  const latest = series[series.length - 1];
  const weekAvg = avg(series);
  const change = latest - series[0];

  function logReading(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(draft.replace(",", "."));
    if (!Number.isFinite(v) || v < metric.min || v > metric.max) {
      setError(`Enter a ${metric.label.toLowerCase()} between ${metric.min} and ${metric.max}.`);
      return;
    }
    setError(null);
    setLogged((prev) => ({ ...prev, [metric.key]: v }));
    setDraft("");
  }

  return (
    <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-border bg-card text-left shadow-2xl shadow-primary/10">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden gap-1.5 sm:flex" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
          </div>
          <span className="truncate text-xs text-muted-foreground">Medzs · your week at a glance</span>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">
          Sample data
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
        <div className="border-b border-border p-3 md:border-r md:border-b-0">
          <div className="mb-2 hidden px-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase md:block">
            Track
          </div>
          <div className="flex gap-2 overflow-x-auto md:flex-col md:gap-1" role="tablist" aria-label="Sample metrics">
            {METRICS.map((m) => {
              const on = m.key === active;
              return (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => {
                    setActive(m.key);
                    setError(null);
                    setDraft("");
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                    on ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <m.icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { k: "Latest", v: `${metric.format(latest)}${metric.key === "bp" && series2 ? `/${series2[series2.length - 1]}` : ""}` },
              { k: "7-day avg", v: metric.format(weekAvg) },
              { k: "Change", v: `${change > 0 ? "+" : change < 0 ? "−" : ""}${metric.format(Math.abs(change))}` },
            ].map((s) => (
              <div key={s.k} className="rounded-lg border border-border bg-muted/50 p-2.5 text-center sm:p-3">
                <div className="text-base font-bold text-foreground sm:text-lg">{s.v}</div>
                <div className="text-[10px] text-muted-foreground sm:text-[11px]">
                  {s.k} · {metric.unit}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border p-2">
            <Chart series={series} series2={series2} />
            <div className="flex justify-between px-3 pb-1 text-[10px] text-muted-foreground">
              {DAYS.slice(0, series.length).map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>

          <form onSubmit={logReading} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="medzs-demo-input">
              Log a {metric.label.toLowerCase()} reading
            </label>
            <div className="flex flex-1 items-center rounded-lg border border-border bg-card px-3 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20">
              <Activity className="mr-2 h-4 w-4 text-muted-foreground" />
              <input
                id="medzs-demo-input"
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Log today's ${metric.label.toLowerCase()}, e.g. ${metric.placeholder}`}
                className="w-full bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <span className="ml-2 text-xs text-muted-foreground">{metric.unit}</span>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Log reading
            </button>
          </form>
          {error ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3" aria-live="polite">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-primary sm:text-sm">{insightFor(metric, series)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
