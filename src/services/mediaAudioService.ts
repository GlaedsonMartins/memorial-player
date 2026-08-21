type AudioGraph = {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  compressor: DynamicsCompressorNode;
};

const graphs = new WeakMap<HTMLMediaElement, AudioGraph>();
const nativeFallbackElements = new Set<HTMLMediaElement>();
let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (sharedAudioContext) return sharedAudioContext;
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  sharedAudioContext = new AudioContextConstructor();
  return sharedAudioContext;
}

function canUseAudioGraph(element: HTMLMediaElement) {
  if (nativeFallbackElements.has(element)) return false;
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(element.currentSrc || element.src, window.location.href);
    const localSource =
      url.origin === window.location.origin || url.protocol === "blob:" || url.protocol === "data:";
    return localSource || Boolean(element.crossOrigin);
  } catch {
    return false;
  }
}

export function connectMediaElement(element: HTMLMediaElement) {
  if (!canUseAudioGraph(element)) return null;
  const existing = graphs.get(element);
  if (existing) return existing;

  try {
    const context = getAudioContext();
    if (!context) return null;
    const source = context.createMediaElementSource(element);
    const gain = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    source.connect(gain);
    gain.connect(compressor);
    compressor.connect(context.destination);
    const graph = { context, source, gain, compressor };
    graphs.set(element, graph);
    return graph;
  } catch {
    return null;
  }
}

export function setMediaElementGain(element: HTMLMediaElement, gainValue: number) {
  const normalizedGain = Math.max(0, Math.min(2, gainValue));
  const graph = graphs.get(element) ?? connectMediaElement(element);
  if (!graph) {
    element.volume = Math.min(1, normalizedGain);
    return;
  }
  graph.gain.gain.setTargetAtTime(normalizedGain, graph.context.currentTime, 0.015);
}

export async function resumeMediaAudio(element: HTMLMediaElement) {
  const graph = graphs.get(element) ?? connectMediaElement(element);
  if (!graph || graph.context.state !== "suspended") return;
  await graph.context.resume().catch(() => undefined);
}

export function disconnectMediaElement(element: HTMLMediaElement) {
  const graph = graphs.get(element);
  if (!graph) return;
  try {
    graph.source.disconnect();
    graph.gain.disconnect();
    graph.compressor.disconnect();
  } finally {
    graphs.delete(element);
  }
}

export function disableMediaElementAudioGraph(element: HTMLMediaElement) {
  nativeFallbackElements.add(element);
  disconnectMediaElement(element);
}

export function enableMediaElementAudioGraph(element: HTMLMediaElement) {
  nativeFallbackElements.delete(element);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
