import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// We instantiate OpenAI inside the handler to prevent the entire route from crashing 
// on startup if the API key is missing.

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
       return NextResponse.json(
         { error: 'GROQ_API_KEY is not set in your .env.local file. Please add it to use the file upload transcription feature.' },
         { status: 500 }
       );
    }
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided.' },
        { status: 400 }
      );
    }

    // OpenAI Whisper API is sometimes finicky with native Next.js File objects.
    // Converting it explicitly using OpenAI.toFile is the most robust method.
    const buffer = Buffer.from(await file.arrayBuffer());
    const openAIFile = await OpenAI.toFile(buffer, file.name || 'audio.m4a', { type: file.type });

    const transcription = await openai.audio.transcriptions.create({
      file: openAIFile,
      model: 'whisper-large-v3-turbo',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process audio file.' },
      { status: 500 }
    );
  }
}
