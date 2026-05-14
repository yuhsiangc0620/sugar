"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SoundLabel } from "@/lib/sugar/types";

type AudioStatus = "idle" | "loading" | "listening" | "error";

type AudioResult = {
  label: SoundLabel;
  confidence: number;
  rawLabel: string;
  capturedAt: string;
  endedAt: string;
  durationSeconds: number;
};

type WorkerMessage =
  | { type: "ready" }
  | {
      type: "result";
      label: SoundLabel;
      confidence: number;
      rawLabel: string;
      capturedAt: string;
      endedAt: string;
      durationSeconds: number;
    }
  | { type: "error"; message: string };

type UseAudioClassifierOptions = {
  onResult: (result: AudioResult) => void | Promise<void>;
};

const CLASSIFY_INTERVAL_MS = 5_000;

export function useAudioClassifier({ onResult }: UseAudioClassifierOptions) {
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const sampleCountRef = useRef(0);
  const sampleRateRef = useRef(48_000);
  const intervalRef = useRef<number | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close().catch(() => undefined);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    workerRef.current?.terminate();

    processorRef.current = null;
    sourceRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
    workerRef.current = null;
    chunksRef.current = [];
    sampleCountRef.current = 0;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (status === "loading" || status === "listening") {
      return;
    }

    try {
      setStatus("loading");
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("這個瀏覽器沒有麥克風權限 API。");
      }

      const worker = new Worker(new URL("../workers/audio-classifier.worker.ts", import.meta.url), {
        type: "module",
      });

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        if (event.data.type === "ready") {
          setStatus("listening");
          return;
        }

        if (event.data.type === "error") {
          setStatus("error");
          setError(event.data.message);
          return;
        }

        void onResultRef.current({
          label: event.data.label,
          confidence: event.data.confidence,
          rawLabel: event.data.rawLabel,
          capturedAt: event.data.capturedAt,
          endedAt: event.data.endedAt,
          durationSeconds: event.data.durationSeconds,
        });
      };

      worker.onerror = (event) => {
        setStatus("error");
        setError(event.message);
      };

      workerRef.current = worker;
      worker.postMessage({ type: "init" });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextConstructor =
        window.AudioContext ??
        (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextConstructor) {
        throw new Error("這個瀏覽器無法建立 AudioContext。");
      }

      const audioContext = new AudioContextConstructor();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      sampleRateRef.current = audioContext.sampleRate;

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(input));
        sampleCountRef.current += input.length;
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceRef.current = source;
      processorRef.current = processor;

      intervalRef.current = window.setInterval(() => {
        const sampleCount = sampleCountRef.current;

        if (!workerRef.current || sampleCount === 0) {
          return;
        }

        const audioData = new Float32Array(sampleCount);
        let offset = 0;

        for (const chunk of chunksRef.current) {
          audioData.set(chunk, offset);
          offset += chunk.length;
        }

        chunksRef.current = [];
        sampleCountRef.current = 0;
        const durationSeconds = sampleCount / sampleRateRef.current;
        const endedAtMs = Date.now();
        const capturedAtMs = endedAtMs - durationSeconds * 1_000;

        workerRef.current.postMessage(
          {
            type: "classify",
            audioData,
            sampleRate: sampleRateRef.current,
            capturedAt: new Date(capturedAtMs).toISOString(),
            endedAt: new Date(endedAtMs).toISOString(),
            durationSeconds,
          },
          [audioData.buffer],
        );
      }, CLASSIFY_INTERVAL_MS);
    } catch (caughtError) {
      stop();
      setStatus("error");
      setError(caughtError instanceof Error ? caughtError.message : "無法啟動聲音分類。");
    }
  }, [status, stop]);

  useEffect(() => stop, [stop]);

  return {
    status,
    error,
    isListening: status === "listening",
    start,
    stop,
  };
}
