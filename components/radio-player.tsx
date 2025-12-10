"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Settings, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Orb } from "@/components/ui/orb";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George

type RadioState = "idle" | "loading" | "playing" | "paused";

type RadioPlayerProps = {
  instructions: string;
  onInstructionsChange?: (instructions: string) => void;
};

export function RadioPlayer({
  instructions,
  onInstructionsChange,
}: RadioPlayerProps) {
  const [state, setState] = useState<RadioState>("idle");
  const [volume, setVolume] = useState(0.8);
  const [showSettings, setShowSettings] = useState(false);
  const [localInstructions, setLocalInstructions] = useState(instructions);
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE_ID);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isGeneratingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<number[]>([]);

  // Generate next audio segment
  const generateSegment = useCallback(async () => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    try {
      // Generate script from LLM
      const scriptRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: localInstructions }),
      });

      if (!scriptRes.ok) throw new Error("Failed to generate script");

      const { text } = await scriptRes.json();

      // Convert to speech
      const speechRes = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!speechRes.ok) throw new Error("Failed to generate speech");

      const audioBlob = await speechRes.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioQueueRef.current.push(audioUrl);

      // If we're playing and queue was empty, start playback
      if (state === "playing" && audioRef.current?.paused) {
        playNextInQueue();
      }
    } catch (error) {
      console.error("Error generating segment:", error);
    } finally {
      isGeneratingRef.current = false;
    }
  }, [localInstructions, state, voiceId]);

  // Play next audio in queue
  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0 || !audioRef.current) return;

    const nextUrl = audioQueueRef.current.shift();
    if (nextUrl) {
      audioRef.current.src = nextUrl;
      audioRef.current.play();
    }
  }, []);

  // Setup audio analyser
  const setupAudioAnalyser = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
  }, []);

  // Update audio data for visualizer
  useEffect(() => {
    let animationId: number;

    const updateAudioData = () => {
      if (analyserRef.current && state === "playing") {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        audioDataRef.current = Array.from(dataArray).map((v) => v / 255);
      }
      animationId = requestAnimationFrame(updateAudioData);
    };

    animationId = requestAnimationFrame(updateAudioData);
    return () => cancelAnimationFrame(animationId);
  }, [state]);

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      // Clean up old URL
      if (audio.src) URL.revokeObjectURL(audio.src);

      // Play next or generate more
      if (audioQueueRef.current.length > 0) {
        playNextInQueue();
      } else {
        generateSegment();
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [playNextInQueue, generateSegment]);

  // Keep queue filled
  useEffect(() => {
    if (state !== "playing") return;

    const interval = setInterval(() => {
      if (audioQueueRef.current.length < 2 && !isGeneratingRef.current) {
        generateSegment();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [state, generateSegment]);

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlay = async () => {
    if (state === "idle" || state === "paused") {
      setState("loading");
      setupAudioAnalyser();

      if (audioQueueRef.current.length === 0) {
        await generateSegment();
      }

      if (audioQueueRef.current.length > 0) {
        playNextInQueue();
      }

      setState("playing");
    } else if (state === "playing") {
      audioRef.current?.pause();
      setState("paused");
    }
  };

  const getVolume = useCallback(() => {
    if (state !== "playing" || audioDataRef.current.length === 0) return 0;
    const avg =
      audioDataRef.current.reduce((a, b) => a + b, 0) /
      audioDataRef.current.length;
    return Math.min(1, avg * 2);
  }, [state]);

  const handleSaveInstructions = () => {
    onInstructionsChange?.(localInstructions);
    setShowSettings(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="space-y-6">
        {/* Orb Visualizer */}
        <div className="relative mx-auto aspect-square w-48">
          <Orb
            colors={["#A0A0A0", "#232323"]}
            seed={42}
            volumeMode="manual"
            getInputVolume={getVolume}
            getOutputVolume={getVolume}
            className="h-full w-full"
          />
        </div>

        {/* Status */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            {state === "playing" && (
              <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            )}
            <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
              {state === "idle" && "Ready"}
              {state === "loading" && "Loading..."}
              {state === "playing" && "Live"}
              {state === "paused" && "Paused"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
          >
            {volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          <Button
            size="lg"
            className="h-14 w-14 rounded-full"
            onClick={handlePlay}
            disabled={state === "loading"}
          >
            {state === "playing" ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">Vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10"
          />
          <span className="text-muted-foreground w-8 text-right text-xs">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Voice ID</label>
              <input
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="bg-background border-input w-full rounded-md border p-2 text-sm"
                placeholder="ElevenLabs voice ID"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Instructions</label>
              <textarea
                value={localInstructions}
                onChange={(e) => setLocalInstructions(e.target.value)}
                className="bg-background border-input h-32 w-full resize-none rounded-md border p-3 text-sm"
                placeholder="Describe what your radio should talk about..."
              />
            </div>

            <Button onClick={handleSaveInstructions} className="w-full">
              Save & Apply
            </Button>
          </div>
        )}

        {/* Hidden Audio Element */}
        <audio ref={audioRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
