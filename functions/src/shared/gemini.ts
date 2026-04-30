import { defineSecret } from 'firebase-functions/params'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const geminiApiKey = defineSecret('GEMINI_API_KEY')

export function getGemini() {
  return new GoogleGenerativeAI(geminiApiKey.value()).getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })
}
