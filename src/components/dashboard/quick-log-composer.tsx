"use client";

/**
 * Quick Log composer (WO-HLMED-002) — one text box that turns a sentence into
 * health-log entries via POST /api/quick-log. Parsing + writes are server-side;
 * the CADIS token never reaches the client. Voice input (SpeechRecognition)
 * and spoken confirmation (speechSynthesis) are feature-detected and degrade
 * silently when unsupported.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QuickLogResult {
  kind: string;
  created: boolean;
  summary: string;
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null;
}

export function QuickLogComposer() {
  const { t } = useTranslations();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [summaries, setSummaries] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMicSupported(speechRecognitionCtor() !== null);
  }, []);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setMessage(null);
    setSummaries([]);
    try {
      const res = await fetch("/api/quick-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const payload = (await res.json()) as {
        data?: { entries?: QuickLogResult[]; unparsed?: string };
        error?: { message?: string } | null;
      };
      const entries = payload.data?.entries ?? [];
      const written = entries.filter((e) => e.created);
      if (written.length > 0) {
        const lines = written.map((e) => e.summary);
        setSummaries(lines);
        setText("");
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const utter = new SpeechSynthesisUtterance(lines[0]);
          window.speechSynthesis.speak(utter);
        }
      } else if (entries.length === 0 || payload.data?.unparsed) {
        setMessage(t("quickLog.unparsed"));
      } else {
        setMessage(payload.error?.message ?? t("quickLog.failed"));
      }
    } catch {
      setMessage(t("quickLog.failed"));
    } finally {
      setBusy(false);
    }
  }

  function startMic() {
    const Ctor = speechRecognitionCtor();
    if (!Ctor || micOn) return;
    const rec = new Ctor();
    rec.lang = document.documentElement.lang || "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) setText((prev) => (prev ? prev + " " : "") + transcript);
    };
    rec.onend = () => setMicOn(false);
    setMicOn(true);
    rec.start();
  }

  return (
    <section
      aria-label={t("quickLog.title")}
      className="rounded-xl border bg-card p-4 shadow-sm"
      data-testid="quick-log-composer"
    >
      <h2 className="mb-2 text-sm font-medium">{t("quickLog.title")}</h2>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input data-testid="quick-log-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("quickLog.placeholder")} maxLength={280} aria-label={t("quickLog.title")} className="min-w-[16rem] flex-1" />
        {micSupported ? (
          <Button variant="outline" type="button" data-testid="quick-log-mic" onClick={startMic} disabled={micOn} aria-label={t("quickLog.micLabel")}>
            {micOn ? t("quickLog.listening") : t("quickLog.micLabel")}
          </Button>
        ) : null}
        <Button type="submit" data-testid="quick-log-submit" disabled={busy || !text.trim()}>
          {busy ? t("quickLog.submitting") : t("quickLog.submit")}
        </Button>
      </form>
      {summaries.length > 0 ? (
        <ul
          data-testid="quick-log-result"
          className="mt-2 space-y-1 text-sm text-emerald-700 dark:text-emerald-400"
        >
          {summaries.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <p data-testid="quick-log-error" className="mt-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </section>
  );
}
