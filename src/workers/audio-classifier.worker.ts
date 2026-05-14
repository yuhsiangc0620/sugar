import {
  AudioClassifier,
  FilesetResolver,
  type AudioClassifierResult,
} from "@mediapipe/tasks-audio";
import { mapAudioCategory } from "@/lib/sugar/audio-labels";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@0.10.35/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite";

type WorkerRequest =
  | { type: "init" }
  | {
      type: "classify";
      audioData: Float32Array;
      sampleRate: number;
      capturedAt: string;
      endedAt: string;
      durationSeconds: number;
    };

type WorkerResponse =
  | { type: "ready" }
  | {
      type: "result";
      label: ReturnType<typeof mapAudioCategory>;
      confidence: number;
      rawLabel: string;
      capturedAt: string;
      endedAt: string;
      durationSeconds: number;
    }
  | { type: "error"; message: string };

let classifierPromise: Promise<AudioClassifier> | null = null;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    if (event.data.type === "init") {
      await getClassifier();
      post({ type: "ready" });
      return;
    }

    const classifier = await getClassifier();
    const results = classifier.classify(event.data.audioData, event.data.sampleRate);
    const topCategory = getTopCategory(results);
    const rawLabel = topCategory?.categoryName ?? "silence";
    const confidence = topCategory?.score ?? 0;

    post({
      type: "result",
      label: mapAudioCategory(rawLabel, confidence),
      confidence,
      rawLabel,
      capturedAt: event.data.capturedAt,
      endedAt: event.data.endedAt,
      durationSeconds: event.data.durationSeconds,
    });
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : "Audio classifier failed",
    });
  }
};

async function getClassifier(): Promise<AudioClassifier> {
  if (!classifierPromise) {
    classifierPromise = FilesetResolver.forAudioTasks(WASM_PATH).then((fileset) =>
      AudioClassifier.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
        },
        maxResults: 5,
      }),
    );
  }

  return classifierPromise;
}

function getTopCategory(results: AudioClassifierResult[]) {
  return results
    .flatMap((result) => result.classifications)
    .flatMap((classification) => classification.categories)
    .sort((a, b) => b.score - a.score)[0];
}

function post(response: WorkerResponse) {
  self.postMessage(response);
}
