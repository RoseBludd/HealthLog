"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Brain,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Download,
  Droplet,
  FileText,
  FlaskConical,
  HeartPulse,
  KeyRound,
  Lock,
  MessageSquareText,
  Moon,
  Pill,
  Scale,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Syringe,
  Thermometer,
  Users,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { SampleDayDemo } from "./sample-day-demo";

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#tracks", label: "What it tracks" },
  { href: "#privacy", label: "Privacy" },
  { href: "#faq", label: "FAQ" },
];

const STEPS = [
  {
    n: "1",
    title: "Make your account",
    body: "Sign up with an email and a password or a passkey. Your record starts empty and belongs to you.",
  },
  {
    n: "2",
    title: "Log what matters to you",
    body: "Type a reading, tap a quick entry, or write it the way you would say it. Weight, blood pressure, sleep, mood, meds and more.",
  },
  {
    n: "3",
    title: "See the trend, bring the report",
    body: "Charts and plain-language summaries show how things are moving. Export a clean report for your next appointment.",
  },
];

const TRACKS = [
  { icon: Scale, label: "Weight & body", detail: "Weight, body measurements and custom metrics you define." },
  { icon: HeartPulse, label: "Blood pressure", detail: "Systolic, diastolic and pulse, with every reading kept in order." },
  { icon: Droplet, label: "Glucose", detail: "Readings with the time and context you add, so patterns are easy to spot." },
  { icon: Moon, label: "Sleep", detail: "How long you slept and how it lines up with the rest of your day." },
  { icon: Brain, label: "Mood & wellbeing", detail: "Quick daily check-ins and notes, kept private to you." },
  { icon: Pill, label: "Medications", detail: "What you take, when you take it, and reminders so doses are not missed." },
  { icon: FlaskConical, label: "Lab results", detail: "Keep lab values in one place and see them over time." },
  { icon: Syringe, label: "Vaccinations", detail: "A record of shots and dates you can pull up anywhere." },
  { icon: Stethoscope, label: "Checkups", detail: "Visits, notes and the follow-ups that came out of them." },
  { icon: Thermometer, label: "Illness log", detail: "Symptoms and sick days written down while you still remember them." },
  { icon: CalendarDays, label: "Cycle", detail: "Track your cycle alongside everything else in your record." },
  { icon: FileText, label: "Documents", detail: "Store the paperwork that goes with your health, next to the data." },
];

const PRIVACY_POINTS = [
  {
    icon: KeyRound,
    title: "Strong sign-in, your choice.",
    body: "Use a passkey, add two-step verification and keep recovery codes. Your record stays behind a real lock.",
  },
  {
    icon: Share2,
    title: "You decide who sees it.",
    body: "Share your record with someone you trust at the level you pick, or keep it entirely to yourself. Change it any time.",
  },
  {
    icon: Download,
    title: "Take your data with you.",
    body: "Export your record whenever you want. Delete your account and its data from settings, no phone call required.",
  },
];

const FAQ = [
  {
    q: "Is Medzs medical advice?",
    a: "No. Medzs is a place to keep and understand your own health log. It shows your numbers and how they are trending in plain words. Decisions about your care belong with you and your clinician.",
  },
  {
    q: "Do I need a special device?",
    a: "No. You can type every reading by hand from your phone or computer. If you already use a scale, cuff or tracker, you can connect supported ones later from settings so readings land on their own.",
  },
  {
    q: "Who can see my data?",
    a: "You. Nobody else sees your record unless you share it, and you choose what level of access they get. You can stop sharing at any time.",
  },
  {
    q: "Can I bring this to my doctor?",
    a: "Yes. Medzs builds a report of your readings and trends you can download and bring to an appointment, so you are not scrolling through your phone in the exam room.",
  },
  {
    q: "Can I track someone in my family?",
    a: "Yes. You can manage a profile for someone who depends on you, like a child or a parent, and keep their record separate from yours.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Medzs is built phone-first and can be added to your home screen so it opens like an app.",
  },
];

const FAMILY = [
  { name: "Rooferzs", href: "https://rooferzs.com" },
  { name: "Skylinezs", href: "https://skylinezs.com" },
  { name: "Goalzs", href: "https://goalzs.com" },
  { name: "Medzs", href: "/" },
];

function Pill_({ icon: Icon, children }: { icon: typeof Scale; children: React.ReactNode }) {
  return (
    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-primary">{children}</span>
    </div>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight text-foreground ${className}`}>
      <Logo className="text-primary" size={24} />
      <span>
        med<span className="text-primary">zs</span>
      </span>
    </span>
  );
}

function QuickLogDemo() {
  const examples = [
    { said: "bp 124 over 79 after my walk", parsed: [["Blood pressure", "124 / 79 mmHg"], ["Note", "after my walk"]] },
    { said: "weighed 181.2 this morning", parsed: [["Weight", "181.2 lb"], ["When", "this morning"]] },
    { said: "took my evening meds, slept about 7 hours", parsed: [["Medication", "evening dose taken"], ["Sleep", "7 h"]] },
  ];
  const [i, setI] = useState(0);
  const ex = examples[i];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xl shadow-primary/5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Quick log</span>
        <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Sample data
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {examples.map((e, idx) => (
          <button
            key={e.said}
            type="button"
            onClick={() => setI(idx)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              idx === i
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Example {idx + 1}
          </button>
        ))}
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-foreground">&ldquo;{ex.said}&rdquo;</p>
      </div>
      <div className="my-3 flex justify-center text-muted-foreground" aria-hidden="true">
        <ArrowRight className="h-4 w-4 rotate-90" />
      </div>
      <div className="space-y-2">
        {ex.parsed.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="text-xs font-medium text-primary">{k}</span>
            <span className="text-sm font-semibold text-foreground">{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">You check it, then it saves to your record.</p>
    </div>
  );
}

function ReportDemo() {
  const rows = [
    ["Blood pressure", "121 / 78", "Lower than last month"],
    ["Weight", "180.6 lb", "Down 1.8 lb in 7 days"],
    ["Sleep", "7.0 h avg", "More consistent"],
    ["Medications", "13 of 14 doses", "1 missed on Thu"],
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xl shadow-primary/5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Report for your appointment</span>
        </div>
        <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Sample data
        </span>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {rows.map(([k, v, note]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">{k}</div>
              <div className="truncate text-[11px] text-muted-foreground">{note}</div>
            </div>
            <span className="shrink-0 font-mono text-sm text-foreground">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <span>Last 30 days · all metrics</span>
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          <Download className="h-3.5 w-3.5" /> Download
        </span>
      </div>
    </div>
  );
}

function Faq() {
  const [sel, setSel] = useState(0);
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="space-y-2">
        {FAQ.map((item, i) => (
          <button
            key={item.q}
            type="button"
            onClick={() => setSel(i)}
            aria-expanded={sel === i}
            className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
              sel === i
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border bg-muted/50 text-foreground hover:border-primary/40 hover:bg-muted"
            }`}
          >
            <span className={`text-sm ${sel === i ? "font-semibold" : "font-medium"}`}>{item.q}</span>
            <ChevronRight className={`h-4 w-4 shrink-0 ${sel === i ? "text-primary" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-muted/50 p-6 md:p-8 lg:sticky lg:top-24">
        <h3 className="mb-3 text-lg font-semibold text-foreground">{FAQ[sel].q}</h3>
        <p className="leading-relaxed text-muted-foreground">{FAQ[sel].a}</p>
      </div>
    </div>
  );
}

const PRIMARY_BTN =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none";
const SECONDARY_BTN =
  "inline-flex items-center justify-center rounded-lg border border-border bg-card px-8 py-3 text-base font-medium text-foreground transition-colors hover:border-primary/40 hover:text-foreground";

/**
 * Public Medzs landing page. Rendered by `src/app/page.tsx` for a visitor
 * with no session; signed-in visitors get the dashboard instead. Uses an
 * explicit light palette (not the app theme tokens) so it reads as part of
 * the same product family as the Rooferzs and Skylinezs landing pages.
 */
export function MedzsLanding() {
  return (
    <div className="min-h-dvh scroll-smooth bg-card text-foreground" data-slot="medzs-landing">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" aria-label="Medzs home">
              <Wordmark className="text-xl" />
            </Link>
            <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-muted/40 via-background to-muted/40">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(14,165,233,0.08),transparent_50%)]" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <span>
                  The <strong className="font-bold">personal health log</strong> you actually keep
                </span>
              </div>
              <h1 className="mb-6 text-4xl leading-tight font-bold text-foreground md:text-5xl lg:text-6xl">
                Your health, in one place{" "}
                <span className="text-primary">you own.</span>
              </h1>
              <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-balance text-muted-foreground md:text-xl">
                Log your numbers in seconds, see how they&apos;re trending, and bring a clear report to
                your next appointment.
              </p>
              <div className="mb-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/auth/register" className={PRIMARY_BTN}>
                  Get started
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/auth/login" className={SECONDARY_BTN}>
                  Sign in
                </Link>
              </div>
              <p className="text-xs text-muted-foreground">No card needed to sign up.</p>
            </div>
            <SampleDayDemo />
          </div>
        </section>

        {/* Quick log */}
        <section className="bg-card py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
              <div>
                <Pill_ icon={MessageSquareText}>Log it the way you say it</Pill_>
                <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                  Writing it down takes seconds.{" "}
                  <span className="text-primary">So you keep doing it.</span>
                </h2>
                <p className="mb-4 leading-relaxed text-muted-foreground">
                  Most health logs die in a week because every entry is a form. In Medzs you can type a reading
                  the way you would text it, and it sorts the numbers into the right place for you to confirm.
                </p>
                <p className="mb-6 leading-relaxed text-muted-foreground">
                  Prefer tapping? Every metric also has a quick entry with the fields already laid out. Reminders
                  nudge you at the times you pick, so the habit sticks.
                </p>
              </div>
              <QuickLogDemo />
            </div>
          </div>
        </section>

        {/* Report */}
        <section className="border-t border-border bg-muted/50 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <ReportDemo />
              </div>
              <div className="order-1 lg:order-2">
                <Pill_ icon={ClipboardList}>Ready for your appointment</Pill_>
                <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                  Walk in with the whole picture.{" "}
                  <span className="text-primary">Not a blurry memory.</span>
                </h2>
                <p className="mb-4 leading-relaxed text-muted-foreground">
                  When someone asks how your readings have been, you don&apos;t have to guess. Medzs puts your
                  numbers, medications and notes into one report you can download and hand over.
                </p>
                <p className="mb-6 leading-relaxed text-muted-foreground">
                  Charts show the trend over days, weeks and months, and short plain-language summaries point out
                  what moved. No jargon and no diagnosis, just your own data, organized.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 bg-card py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
                Three steps. <span className="text-primary">That&apos;s the whole setup.</span>
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">No device to buy and nothing to install to get going.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-2xl border border-border bg-muted/50 p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                    {s.n}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What it tracks */}
        <section id="tracks" className="scroll-mt-20 border-t border-border bg-muted/50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <Pill_ icon={Sparkles}>Built in, not bolted on</Pill_>
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Everything you keep track of.{" "}
                <span className="text-primary">One record.</span>
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
                Stop spreading your health across a notes app, a spreadsheet and a drawer of paper. Medzs keeps it
                together, so one screen answers &ldquo;how have I been doing?&rdquo;
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TRACKS.map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="scroll-mt-20 bg-card py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
              <div>
                <Pill_ icon={ShieldCheck}>You own your data</Pill_>
                <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                  It&apos;s your health.{" "}
                  <span className="text-primary">It stays your record.</span>
                </h2>
                <p className="mb-6 leading-relaxed text-muted-foreground">
                  Health data is personal. Medzs is built so you hold the keys: you control who signs in, who you
                  share with, and what happens to your data if you leave.
                </p>
                <div className="space-y-3">
                  {PRIVACY_POINTS.map((p) => (
                    <div key={p.title} className="flex gap-3 rounded-lg border border-border bg-muted/50 p-3">
                      <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{p.title}</div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm">
                  <Link href="/privacy" className="font-medium text-primary hover:text-primary">
                    Read the privacy policy <ArrowRight className="inline h-3.5 w-3.5" />
                  </Link>
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xl shadow-primary/5 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Who can see your record</span>
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Sample data
                  </span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { who: "You", access: "Everything · owner", tone: "border-primary/60 bg-primary/10", icon: Lock },
                    { who: "Your partner", access: "Can view · you can stop any time", tone: "border-primary/30 bg-primary/5", icon: Users },
                    { who: "Mom's profile", access: "Managed by you · kept separate", tone: "border-primary/30 bg-primary/5", icon: Users },
                    { who: "Everyone else", access: "No access", tone: "border-border bg-muted/50", icon: ShieldCheck },
                  ].map((r) => (
                    <div key={r.who} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${r.tone}`}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{r.who}</div>
                        <p className="truncate text-[11px] text-muted-foreground">{r.access}</p>
                      </div>
                      <r.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-center">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <Smartphone className="mx-auto mb-1 h-4 w-4 text-primary" />
                    <div className="text-[11px] text-muted-foreground">Passkey sign-in</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <Bell className="mx-auto mb-1 h-4 w-4 text-primary" />
                    <div className="text-[11px] text-muted-foreground">Two-step verification</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border bg-card py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <h2 className="mb-2 text-3xl font-bold text-foreground">Questions people ask first</h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">Pick one to see the answer.</p>
            </div>
            <Faq />
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border bg-gradient-to-r from-primary/10 via-muted/40 to-primary/10 py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-5xl">
              Start the log you&apos;ll still have next year.
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
              Weight, blood pressure, glucose, sleep, mood, meds and more, in one private record that&apos;s yours.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/auth/register" className={PRIMARY_BTN}>
                Get started
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/auth/login" className={SECONDARY_BTN}>
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card py-16 text-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-6">
                <Wordmark className="text-xl" />
              </div>
              <p className="mb-2 text-muted-foreground">Your health, in one place you own.</p>
              <p className="mb-6 text-sm">
                <a
                  href="https://www.geniussubstrates.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:text-primary"
                >
                  Medzs is a product of Genius Substrates Inc.
                </a>
              </p>
            </div>
            <div>
              <h4 className="mb-6 text-lg font-semibold">Product</h4>
              <div className="space-y-3">
                {NAV_LINKS.map((l) => (
                  <a key={l.href} href={l.href} className="block text-muted-foreground hover:text-foreground">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-6 text-lg font-semibold">Account</h4>
              <div className="space-y-3">
                <Link href="/auth/register" className="block text-muted-foreground hover:text-foreground">
                  Get started
                </Link>
                <Link href="/auth/login" className="block text-muted-foreground hover:text-foreground">
                  Sign in
                </Link>
                <Link href="/about" className="block text-muted-foreground hover:text-foreground">
                  About
                </Link>
              </div>
            </div>
            <div>
              <h4 className="mb-6 text-lg font-semibold">Genius Substrates</h4>
              <div className="space-y-3">
                {FAMILY.map((p) =>
                  p.href.startsWith("http") ? (
                    <a key={p.name} href={p.href} className="block text-muted-foreground hover:text-foreground">
                      {p.name}
                    </a>
                  ) : (
                    <Link key={p.name} href={p.href} className="block text-muted-foreground hover:text-foreground">
                      {p.name}
                    </Link>
                  ),
                )}
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Medzs · a Genius Substrates product. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
