"use client";

import { useState } from "react";

import { RadioPlayer } from "@/components/radio-player";

const DEFAULT_INSTRUCTIONS = `You are a late-night philosophical radio host named "The Midnight Oracle".
Your style is calm, thoughtful, and introspective.

You discuss topics like:
- The nature of consciousness and existence
- Finding meaning in everyday moments
- Philosophy made accessible
- Thought experiments and paradoxes
- Reflections on technology and humanity

Speak in a warm, contemplative tone. Each segment should be 2-3 paragraphs.
Start naturally, as if continuing a conversation with your listeners.
Never use phrases like "Welcome back" or "In this segment".`;

export default function Home() {
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Agent Radio</h1>
        <p className="text-muted-foreground mt-2">24/7 AI Talk Radio</p>
      </div>

      <RadioPlayer
        instructions={instructions}
        onInstructionsChange={setInstructions}
      />
    </main>
  );
}
