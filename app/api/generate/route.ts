import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(request: Request) {
  try {
    const { instructions } = await request.json();

    if (!instructions) {
      return NextResponse.json(
        { error: "Instructions are required" },
        { status: 400 },
      );
    }

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_API_KEY not configured" },
        { status: 500 },
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-pro-preview" });

    const result = await model.generateContent(
      `${instructions}

Generate a single radio segment now. Just provide the spoken text.

IMPORTANT: Use audio tags in square brackets to add emotion and expression to the dialogue. Examples:
- [laughing], [giggling], [chuckling] for laughter
- [sad], [melancholic], [somber] for sadness
- [excited], [enthusiastic], [elated] for excitement
- [whispering], [softly], [gently] for quiet speech
- [sigh], [groaning], [yawning] for sounds
- [thoughtfully], [cautiously], [confidently] for delivery style
- Use ellipses (...) for trailing thoughts
- Use dashes (-) for interruptions or pauses

Example output:
"[warmly] Good evening, listeners... [thoughtfully] You know, I was thinking about something today. [chuckling] It's funny how life works sometimes. [sigh] But that's what makes it beautiful, isn't it?"

Now generate a radio segment with these expressive audio tags. Just the spoken text with tags, nothing else.`,
    );

    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 },
    );
  }
}
