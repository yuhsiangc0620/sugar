"use client";

import Image from "next/image";
import {
  Candy,
  Check,
  Database,
  Gift,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { soundLabelColors, soundLabelCopy } from "@/lib/sugar/audio-labels";
import { aggregateDay, getTaipeiDate } from "@/lib/sugar/aggregate";
import type {
  CandyEvent,
  CandyFlavor,
  DailyAggregate,
  DailySummary,
  SoundLabel,
  SoundLog,
} from "@/lib/sugar/types";
import { useAudioClassifier } from "@/hooks/useAudioClassifier";

type SnapshotResponse = {
  date: string;
  aggregate: DailyAggregate;
  flavor: CandyFlavor;
  recentSoundLogs: SoundLog[];
  recentCandyEvents: CandyEvent[];
  dailySummary: DailySummary | null;
  notion: {
    soundLogs: NotionTargetStatus;
    candyEvents: NotionTargetStatus;
    dailySummary: NotionTargetStatus;
  };
};

type NotionTargetStatus = {
  hasToken: boolean;
  hasDataSourceId: boolean;
  dataSourceIdPrefix: string | null;
};

type NotionWriteResponse = {
  ok: boolean;
  skipped: boolean;
  parentType?: "data_source_id" | "database_id";
  reason?: string;
  error?: string;
  code?: string;
  target: NotionTargetStatus;
};

const demoSequence: SoundLabel[] = [
  "keyboard_typing",
  "mouse_clicking",
  "speech",
  "writing",
  "paper_rustle",
  "drinkware",
  "fan_or_ac",
  "silence",
  "notification_sound",
  "environment_noise",
];

const deviceId = "sugar-demo-device";
const userName = process.env.NEXT_PUBLIC_SUGAR_USER_NAME || "sugar-user";

export function SugarExperience() {
  const [date] = useState(() => getTaipeiDate());
  const [sessionId] = useState(() => createSessionId());
  const [soundLogs, setSoundLogs] = useState<SoundLog[]>([]);
  const [candyEvents, setCandyEvents] = useState<CandyEvent[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [flavor, setFlavor] = useState<CandyFlavor>({
    name: "蜜桃漂浮糖",
    color: "#f8a65d",
    note: "今天的聲音輕輕混在一起。",
  });
  const [noteDraft, setNoteDraft] = useState("");
  const [isCandyOpen, setIsCandyOpen] = useState(false);
  const [isReflectionUnlocked, setIsReflectionUnlocked] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState<string | null>(null);
  const [notionStatus, setNotionStatus] = useState<SnapshotResponse["notion"] | null>(null);
  const [notionMessage, setNotionMessage] = useState<string>("尚未寫入 Notion");
  const [demoIndex, setDemoIndex] = useState(0);

  const aggregate = useMemo(
    () => summary?.aggregate ?? aggregateDay(date, soundLogs, candyEvents),
    [candyEvents, date, soundLogs, summary?.aggregate],
  );
  const activeLabel = aggregate.topSoundLabel ?? "silence";
  const activeColor = flavor.color || soundLabelColors[activeLabel];
  const soundFlow = useMemo(() => soundLogs.slice(-32), [soundLogs]);
  const recentSoundLabels = useMemo(() => soundLogs.slice(-7).reverse(), [soundLogs]);

  const recordSoundLog = useCallback(
    async (
      label: SoundLabel,
      confidence: number,
      timestamp = new Date().toISOString(),
      options: {
        endedAt?: string;
        durationSeconds?: number;
        rawLabel?: string;
        source?: SoundLog["source"];
      } = {},
    ) => {
      const log: SoundLog = {
        timestamp,
        endedAt:
          options.endedAt ??
          new Date(timestampDate(timestamp).getTime() + (options.durationSeconds ?? 5) * 1_000)
            .toISOString(),
        durationSeconds: options.durationSeconds ?? 5,
        label,
        rawLabel: options.rawLabel ?? label,
        confidence,
        sessionId,
        userName,
        source: options.source ?? "demo",
      };

      setSoundLogs((current) => [...current, log]);

      const response = await fetch("/api/sound-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      const data = (await response.json()) as { notion?: NotionWriteResponse };
      setNotionMessage(formatNotionMessage("Sound Logs", data.notion));
    },
    [sessionId],
  );

  const audio = useAudioClassifier({
    onResult: (result) =>
      recordSoundLog(result.label, result.confidence, result.capturedAt, {
        endedAt: result.endedAt,
        durationSeconds: result.durationSeconds,
        rawLabel: result.rawLabel,
        source: "browser_mediapipe",
      }),
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      const response = await fetch(`/api/day-snapshot?date=${date}`);
      const snapshot = (await response.json()) as SnapshotResponse;

      if (cancelled) {
        return;
      }

      setSoundLogs((current) => (current.length > 0 ? current : snapshot.recentSoundLogs));
      setCandyEvents((current) => (current.length > 0 ? current : snapshot.recentCandyEvents));
      setFlavor(snapshot.flavor);
      setNotionStatus(snapshot.notion);

      if (snapshot.dailySummary) {
        setSummary(snapshot.dailySummary);
        setNoteDraft(snapshot.dailySummary.correctedSummary ?? snapshot.dailySummary.aiSummary);
        setIsReflectionUnlocked(true);
      }
    }

    void loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [date]);

  async function addDemoSound() {
    const label = demoSequence[demoIndex % demoSequence.length];
    setDemoIndex((value) => value + 1);
    await recordSoundLog(label, 0.62 + (demoIndex % 3) * 0.1, undefined, {
      rawLabel: label,
      source: "demo",
    });
  }

  async function recordCandyEvent(type: CandyEvent["type"]) {
    const timestamp = new Date().toISOString();
    const event: CandyEvent = {
      type,
      timestamp,
      deviceId,
      userName,
    };

    setCandyEvents((current) => [...current, event]);

    const response = await fetch("/api/device/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        event_type: type,
        timestamp,
        user_name: userName,
      }),
    });
    const data = (await response.json()) as { notion?: NotionWriteResponse };
    setNotionMessage(formatNotionMessage("Candy Events", data.notion));
  }

  async function runDailySummary() {
    setIsSummaryLoading(true);
    setSummaryStatus(null);
    setIsCandyOpen(false);

    try {
      const response = await fetch("/api/daily-summary/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, userName }),
      });

      if (!response.ok) {
        throw new Error("summary failed");
      }

      const data = (await response.json()) as {
        date: string;
        aiSummary: string;
        aggregate: DailyAggregate;
        flavor: CandyFlavor;
        notion?: NotionWriteResponse;
      };
      const nextSummary: DailySummary = {
        date: data.date,
        userName,
        aiSummary: data.aiSummary,
        aggregate: data.aggregate,
        flavor: data.flavor,
      };

      setSummary(nextSummary);
      setNoteDraft(data.aiSummary);
      setFlavor(data.flavor);
      setNotionMessage(formatNotionMessage("Daily Summary", data.notion));
    } catch {
      setSummaryStatus("今晚的糖果暫時沒有成形。");
    } finally {
      setIsSummaryLoading(false);
    }
  }

  async function saveNote(acceptedOverride?: boolean) {
    if (!summary) {
      return;
    }

    const trimmedNote = noteDraft.trim();
    const accepted = acceptedOverride ?? trimmedNote === summary.aiSummary.trim();

    const response = await fetch("/api/daily-summary/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        userName,
        accepted,
        feedback: accepted ? undefined : trimmedNote,
      }),
    });

    if (!response.ok) {
      setSummaryStatus("回饋沒有被保存。");
      return;
    }

    const data = (await response.json()) as {
      correctedSummary: string;
      memoryUpdated: boolean;
      notion?: NotionWriteResponse;
    };

    setSummary({
      ...summary,
      accepted,
      userFeedback: accepted ? undefined : trimmedNote,
      correctedSummary: data.correctedSummary,
    });
    setNoteDraft(data.correctedSummary);
    setSummaryStatus(data.memoryUpdated ? "SUGAR 記住了這次修正。" : "今天被確認了。");
    setNotionMessage(formatNotionMessage("Daily Summary", data.notion));
  }

  return (
    <main className="sugar-shell">
      <section className="sugar-hero" aria-label="SUGAR day view">
        <div className="hero-copy">
          <p className="eyebrow">Human-in-the-Loop Data Enabled Object</p>
          <h1 className="sr-only">SUGAR</h1>
          <Image
            className="sugar-logo"
            src="/brand/sugar-logo.svg"
            alt="SUGAR"
            width={1920}
            height={1080}
            priority
          />
          <p className="lead">一台會記住你一天的糖果機。</p>
        </div>

          <div
          className="sound-orbit"
          style={{ "--blob-color": soundLabelColors[activeLabel] } as CSSProperties}
          aria-label={`目前聲音：${soundLabelCopy[activeLabel]}`}
        >
          <div className="sound-blob">
            <Volume2 size={28} aria-hidden="true" />
            <span>{soundLabelCopy[activeLabel]}</span>
          </div>
          <div className="sound-ring sound-ring-one" />
          <div className="sound-ring sound-ring-two" />
        </div>
      </section>

      <section className="sound-flow-stage" aria-label="聲音流核心">
        <SoundFlowPanel
          soundFlow={soundFlow}
          recentSoundLabels={recentSoundLabels}
          onUnlock={() => setIsReflectionUnlocked(true)}
        />
      </section>

      <section className="sugar-grid" aria-label="SUGAR controls and state">
        <div className="panel day-panel">
          <div className="panel-heading">
            <span>今日狀態</span>
            <span>{date}</span>
          </div>
          <div className="metric-row">
            <Metric label="聲音片段" value={aggregate.soundLogCount.toString()} />
            <Metric label="工作分鐘" value={aggregate.workDurationMinutes.toString()} />
            <Metric label="接受率" value={`${Math.round(aggregate.acceptanceRate * 100)}%`} />
          </div>

          <div className="sound-bars" aria-label="sound proportions">
            {aggregate.soundProportions.map((item) => (
              <div className="sound-bar" key={item.label}>
                <span>{soundLabelCopy[item.label]}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.max(4, item.ratio * 100)}%`,
                      background: soundLabelColors[item.label],
                    }}
                  />
                </div>
                <span>{Math.round(item.ratio * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel controls-panel">
          <div className="panel-heading">
            <span>收集</span>
            <span>{audio.status}</span>
          </div>
          <div className="button-cluster">
            <button
              className="sugar-button primary"
              type="button"
              onClick={audio.isListening ? audio.stop : audio.start}
              data-testid="toggle-mic"
            >
              {audio.isListening ? <MicOff size={18} /> : <Mic size={18} />}
              <span>{audio.isListening ? "停止聆聽" : "開始聆聽"}</span>
            </button>
            <button
              className="sugar-button"
              type="button"
              onClick={addDemoSound}
              data-testid="demo-sound"
            >
              <Sparkles size={18} />
              <span>加入聲音樣本</span>
            </button>
          </div>
          {audio.error ? <p className="soft-note">{audio.error}</p> : null}

          <div className="notion-status" aria-label="Notion sync status">
            <Database size={18} aria-hidden="true" />
            <div>
              <span>{notionMessage}</span>
              <p>
                token {notionStatus?.soundLogs.hasToken ? "ready" : "missing"} · sound db{" "}
                {notionStatus?.soundLogs.hasDataSourceId ? "ready" : "missing"}
              </p>
            </div>
          </div>

          <div className="button-cluster candy-controls">
            <button
              className="sugar-button warm"
              type="button"
              onClick={() => recordCandyEvent("dispensed")}
              data-testid="dispense-candy"
            >
              <Candy size={18} />
              <span>吐出糖果</span>
            </button>
            <button
              className="sugar-button"
              type="button"
              onClick={() => recordCandyEvent("returned")}
              data-testid="return-candy"
            >
              <RotateCcw size={18} />
              <span>丟回糖果</span>
            </button>
          </div>
        </div>

        <div className="panel candy-panel">
          <div className="panel-heading">
            <span>糖果事件</span>
            <span>{aggregate.dispensedCount + aggregate.returnedCount}</span>
          </div>
          <div className="candy-counts">
            <Metric label="吐出" value={aggregate.dispensedCount.toString()} />
            <Metric label="退回" value={aggregate.returnedCount.toString()} />
            <Metric label="留下" value={aggregate.acceptedCount.toString()} />
          </div>
        </div>
      </section>

      {isReflectionUnlocked ? (
      <section className="reflection-band" aria-label="daily reflection">
        <div className="reflection-copy">
          <p className="eyebrow">Data → Interpretation → Reflection</p>
          <h2>今天會被包成一顆糖。</h2>
          <button
            className="sugar-button primary"
            type="button"
            onClick={runDailySummary}
            disabled={isSummaryLoading}
            data-testid="run-summary"
          >
            <Gift size={18} />
            <span>{isSummaryLoading ? "正在生成" : "生成今晚糖果"}</span>
          </button>
          {summaryStatus ? <p className="soft-note">{summaryStatus}</p> : null}
        </div>

        <div
          className={`candy-stage ${isCandyOpen ? "opened" : ""}`}
          style={{ "--candy-color": activeColor } as CSSProperties}
        >
          <button
            className="wrapped-candy"
            type="button"
            disabled={!summary}
            onClick={() => {
              setIsCandyOpen(true);
              setNoteDraft(summary?.correctedSummary ?? summary?.aiSummary ?? "");
            }}
            aria-label="打開今日糖果"
            data-testid="open-candy"
          >
            <span className="wrapper-left" />
            <span className="wrapper-core" />
            <span className="wrapper-right" />
          </button>

          {summary && isCandyOpen ? (
            <div className="summary-note" data-testid="summary-note">
              <p className="flavor">{summary.flavor.name}</p>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                aria-label="今日紙條內容"
                data-testid="feedback-text"
              />
              <span>{summary.flavor.note}</span>
              <div className="note-actions">
                <button
                  className="sugar-button primary"
                  type="button"
                  onClick={() => saveNote(true)}
                  data-testid="accept-summary"
                >
                  <Check size={18} />
                  <span>確認紙條</span>
                </button>
                <button
                  className="sugar-button"
                  type="button"
                  onClick={() => saveNote(false)}
                  data-testid="correct-summary"
                >
                  <Send size={18} />
                  <span>保存紙條</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SoundFlowPanel({
  soundFlow,
  recentSoundLabels,
  onUnlock,
}: {
  soundFlow: SoundLog[];
  recentSoundLabels: SoundLog[];
  onUnlock: () => void;
}) {
  return (
    <div className="panel sound-flow-panel">
      <div className="panel-heading">
        <span>聲音流</span>
        <span>{soundFlow.length}</span>
      </div>
      <div className="sound-flow-copy">
        <p>聲音從左邊慢慢長出來，最後被你收成一張糖紙。</p>
        <button
          className="sugar-button primary"
          type="button"
          disabled={soundFlow.length === 0}
          onClick={onUnlock}
          data-testid="unlock-reflection"
        >
          <Gift size={18} />
          <span>把今日聲音包成糖紙</span>
        </button>
      </div>
      <div className="sound-flow" aria-label="聲音時間軸視覺化">
        {soundFlow.length === 0 ? (
          <div className="sound-flow-empty">今天還很柔軟，尚未留下痕跡。</div>
        ) : (
          soundFlow.map((log, index) => (
            <button
              className="sound-segment"
              key={`${log.timestamp}-${index}`}
              type="button"
              onClick={onUnlock}
              style={
                {
                  "--segment-color": soundLabelColors[log.label],
                  "--segment-grow": Math.max(1, Math.round(log.durationSeconds)),
                  "--segment-delay": `${index * 120}ms`,
                } as CSSProperties
              }
              title={`${formatTime(log.timestamp)} ${soundLabelCopy[log.label]}`}
            >
              <span className="sound-pulse" />
            </button>
          ))
        )}
      </div>
      <div className="sound-flow-labels" aria-label="最近的聲音">
        {recentSoundLabels.length === 0 ? (
          <span>等待第一段聲音</span>
        ) : (
          recentSoundLabels.map((log) => (
            <span key={log.timestamp}>
              {formatTime(log.timestamp)} · {soundLabelCopy[log.label]}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function createSessionId(): string {
  if (typeof window === "undefined") {
    return "sugar-session";
  }

  const existing = window.localStorage.getItem("sugar-session-id");

  if (existing) {
    return existing;
  }

  const next = `sugar-${crypto.randomUUID()}`;
  window.localStorage.setItem("sugar-session-id", next);
  return next;
}

function formatNotionMessage(label: string, notion?: NotionWriteResponse): string {
  if (!notion) {
    return `${label} 寫入狀態未知`;
  }

  return notion.ok
    ? `${label} 已寫入 Notion (${notion.parentType ?? "notion"})`
    : notion.skipped
      ? `${label} 未寫入：${notion.reason}`
      : `${label} 寫入失敗：${notion.code ?? notion.error ?? "unknown"}`;
}

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function timestampDate(timestamp: string): Date {
  return new Date(timestamp);
}
