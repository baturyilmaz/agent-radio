import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Default voice - can be changed to any ElevenLabs voice ID
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George - calm, narrative voice

export async function POST(request: Request) {
  try {
    const { text, voiceId = DEFAULT_VOICE_ID } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 500 },
      );
    }

    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_v3",
    });

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = audioStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error generating speech:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 },
    );
  }
}
