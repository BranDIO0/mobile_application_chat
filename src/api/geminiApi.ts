import type { Msg } from '../data/catalog';

const GEMINI_API_KEY_STORAGE = 'hse_chat_gemini_api_key';
const GEMINI_MODEL_STORAGE = 'hse_chat_gemini_model';

export type GeminiModelId = 'gemini-2.5-flash' | 'gemini-2.0-flash';

export interface ChatAiSummary {
  tldr: string[];
  openQuestionsAndTodos: string[];
  keyDates: string[];
  generatedAt: string;
}

/** Reads the user-configured Gemini API key from localStorage (never stored in code). */
export function getGeminiApiKey(): string {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE)?.trim() || '';
}

/** Saves or clears the user-configured Gemini API key in localStorage. */
export function setGeminiApiKey(key: string): void {
  const cleaned = key.trim();
  if (cleaned) {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, cleaned);
  } else {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  }
}

export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}

export function getGeminiModel(): GeminiModelId {
  const stored = localStorage.getItem(GEMINI_MODEL_STORAGE);
  if (stored === 'gemini-2.0-flash' || stored === 'gemini-2.5-flash') {
    return stored;
  }
  return 'gemini-2.5-flash';
}

export function setGeminiModel(model: GeminiModelId): void {
  localStorage.setItem(GEMINI_MODEL_STORAGE, model);
}

/**
 * Calls the Google Gemini REST API using the user's locally stored API key to summarize
 * a channel's chat history into TL;DR bullet points, open questions/to-dos, and key dates.
 */
export async function summarizeChatWithGemini(
  channelName: string,
  moduleName: string | undefined,
  messages: Msg[],
): Promise<ChatAiSummary> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Kein Gemini API Key in den Einstellungen hinterlegt.');
  }

  if (messages.length === 0) {
    return {
      tldr: ['In diesem Kanal wurden noch keine Nachrichten geschrieben.'],
      openQuestionsAndTodos: [],
      keyDates: [],
      generatedAt: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  const recentMessages = messages.slice(-60);
  const transcript = recentMessages
    .map((m) => {
      const roleTag = m.dozent ? '[DOZENT] ' : '';
      const sender = m.from === 'self' ? 'Ich' : m.from;
      const attachment = m.file ? ` [Datei: ${m.file.name}]` : '';
      return `[${m.time}] ${roleTag}${sender}: ${m.text ?? ''}${attachment}`.trim();
    })
    .join('\n');

  const contextLabel = moduleName ? `${channelName} (Modul: ${moduleName})` : channelName;

  const prompt = `Du bist ein hilfreicher Studien-Assistent in der Hochschul-Chat-App "HEy!".
Fasse den folgenden Chatverlauf aus dem Raum "${contextLabel}" für Studierende kompakt und präzise auf Deutsch zusammen.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt im folgenden Schema (ohne Markdown-Codeblöcke):
{
  "tldr": ["Kernaussage 1", "Kernaussage 2"],
  "openQuestionsAndTodos": ["Offene Frage oder To-Do 1", "Offene Frage oder To-Do 2"],
  "keyDates": ["Wichtiger Termin / Frist / Raumwechsel 1"]
}

Regeln:
- "tldr": Maximal 3-4 prägnante Stichpunkte mit den wichtigsten Kernaussagen der letzten Nachrichten.
- "openQuestionsAndTodos": Alle unbeantworteten Fragen aus der Lerngruppe sowie konkrete Aufgaben/To-Dos. Wenn keine vorhanden sind, leeres Array [].
- "keyDates": Genannte Klausurtermine, Abgabefristen, Raumwechsel oder offizielle [DOZENT]-Ankündigungen. Wenn keine vorhanden sind, leeres Array [].

Chatverlauf:
${transcript}`;

  const model = getGeminiModel();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    let errDetail = `HTTP ${response.status}`;
    try {
      const errJson = (await response.json()) as { error?: { message?: string } };
      if (errJson?.error?.message) {
        errDetail = errJson.error.message;
      }
    } catch {
      // ignore parse failure
    }
    if (response.status === 400 || response.status === 403) {
      throw new Error(`Gemini API Key ungültig oder abgelehnt: ${errDetail}`);
    }
    throw new Error(`Gemini API Fehler (${response.status}): ${errDetail}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  if (!rawText) {
    throw new Error('Die Gemini API hat keine Zusammenfassung zurückgegeben.');
  }

  const cleanedJson = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleanedJson) as Partial<ChatAiSummary>;
    return {
      tldr: Array.isArray(parsed.tldr) && parsed.tldr.length > 0
        ? parsed.tldr.map(String)
        : ['Keine besonderen Kernaussagen erkannt.'],
      openQuestionsAndTodos: Array.isArray(parsed.openQuestionsAndTodos)
        ? parsed.openQuestionsAndTodos.map(String)
        : [],
      keyDates: Array.isArray(parsed.keyDates) ? parsed.keyDates.map(String) : [],
      generatedAt: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return {
      tldr: [rawText],
      openQuestionsAndTodos: [],
      keyDates: [],
      generatedAt: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    };
  }
}
