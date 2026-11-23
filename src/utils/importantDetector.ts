import type { Msg } from '../data/catalog';

export type ImportantCategory = 'exam' | 'deadline' | 'room' | 'lecturer' | 'pinned';

export interface ImportantMessageInfo {
  msg: Msg;
  category: ImportantCategory;
  label: string;
  icon: string;
  dateHint?: string;
}

const EXAM_REGEX = /\b(klausur(?:vorbereitung|termin|en)?|pr[uü]fung(?:en|stermin)?|testat|m[uü]ndliche\s+pr[uü]fung)\b/i;
const DEADLINE_REGEX = /\b(abgabe(?:frist|termin)?|frist|deadline|[uü]bungsblatt|hausarbeit|beleg|einreich(?:en|ung)|sp[aä]testens\s+am|bis\s+(?:mo|di|mi|do|fr|sa|so|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|heute|\d{1,2}\.\d{1,2}\.))\b/i;
const ROOM_REGEX = /\b(raumwechsel|hörsaal|hoersaal|raum\s+[a-z0-9.-]+|gebäude\s+[a-z0-9]+|findet\s+(?:in|im)\s+(?:raum|hörsaal|online|zoom)|verlegt\s+(?:in|nach|auf))\b/i;

// Matches e.g. "15.11.", "15.11.2026", "Fr, 15.11. um 14:00 Uhr", "14:00 Uhr", "23:59"
const DATE_OR_TIME_REGEX =
  /(?:\b(?:mo|di|mi|do|fr|sa|so|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)[,.]?\s*)?(?:\b\d{1,2}\.\d{1,2}\.(?:\d{2,4})?|\b(?:um\s+)?\d{1,2}:\d{2}(?:\s*uhr)?\b)/i;

function extractDateHint(text: string): string | undefined {
  const match = text.match(
    /(?:\b(?:mo|di|mi|do|fr|sa|so|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)[,.]?\s*)?\b\d{1,2}\.\d{1,2}\.(?:\d{2,4})?(?:\s*(?:um|,)?\s*\d{1,2}:\d{2}(?:\s*uhr)?)?/i,
  );
  if (match) return match[0].trim();

  const timeOnly = text.match(/\b\d{1,2}:\d{2}\s*uhr\b/i);
  return timeOnly ? timeOnly[0].trim() : undefined;
}

/**
 * Automatically detects important messages such as exam dates, deadlines,
 * room changes, [Dozent] announcements, or messages explicitly marked `important`.
 */
export function detectImportantMessage(msg: Msg): ImportantMessageInfo | null {
  const text = (msg.text ?? '').trim();
  const dateHint = text ? extractDateHint(text) : undefined;
  const hasDateOrTime = Boolean(text && DATE_OR_TIME_REGEX.test(text));

  if (text && EXAM_REGEX.test(text)) {
    return {
      msg,
      category: 'exam',
      label: dateHint ? `Klausur · ${dateHint}` : 'Klausur / Prüfung',
      icon: '🎓',
      dateHint,
    };
  }

  if (text && DEADLINE_REGEX.test(text)) {
    return {
      msg,
      category: 'deadline',
      label: dateHint ? `Frist · ${dateHint}` : 'Abgabe / Frist',
      icon: '⏰',
      dateHint,
    };
  }

  if (text && ROOM_REGEX.test(text)) {
    return {
      msg,
      category: 'room',
      label: dateHint ? `Rauminfo · ${dateHint}` : 'Raumwechsel / Ort',
      icon: '📍',
      dateHint,
    };
  }

  if (msg.dozent) {
    return {
      msg,
      category: 'lecturer',
      label: dateHint ? `Dozent · ${dateHint}` : 'Dozent:in',
      icon: '📢',
      dateHint,
    };
  }

  if (msg.important) {
    return {
      msg,
      category: 'pinned',
      label: dateHint ? `Wichtig · ${dateHint}` : 'Wichtig',
      icon: '📌',
      dateHint,
    };
  }

  // Generic date/time mention combined with event/schedule words (e.g. "Tutorium am 12.11.")
  if (
    text &&
    hasDateOrTime &&
    /\b(termin|tutorium|vorlesung|übung|uebung|meeting|treffen|besprechung|vortrag|projekt)\b/i.test(text)
  ) {
    return {
      msg,
      category: 'deadline',
      label: dateHint ? `Termin · ${dateHint}` : 'Termin',
      icon: '📅',
      dateHint,
    };
  }

  return null;
}

/** Returns all detected important messages in a channel (newest first or chronological). */
export function extractImportantMessages(messages: Msg[]): ImportantMessageInfo[] {
  const result: ImportantMessageInfo[] = [];
  for (const m of messages) {
    const info = detectImportantMessage(m);
    if (info) {
      result.push(info);
    }
  }
  return result;
}
