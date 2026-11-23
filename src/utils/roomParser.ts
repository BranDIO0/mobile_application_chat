import { chatApi } from '../api/chatApi';
import {
  CATEGORIES,
  INITIAL_MODULES,
  isDozentUser,
  slugifyName,
  unslugifyName,
  type Channel,
  type ChannelSubtype,
  type FileAtt,
  type Invitation,
  type Module,
  type Msg,
} from '../data/catalog';
import type { ChatInvite, ChatMessage, ChatRoom } from '../types';

export const CURRENT_SEMESTER = 'WS26';
export const MAX_CHATNAME_LENGTH = 30;

/**
  * Sanitizes a token so it only contains ASCII letters, digits, and underscores (no ':', '.', '-', or umlauts)
  * to comply with the HSE server's parameter validation (Error 402).
  */
export function sanitizeServerToken(s: string): string {
  return s
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
  * Matches "_", ":", and "::" delimiter formats so names stay under the 30-char server limit
  * and avoid Error 402 (Illegal characters in parameter) on the HSE Live & Backup servers:
  * - WS26_MOD_Mathe_1_MAIN
  * - WS26_MOD_Mathe_1_SUB_LG_A
  * - WS26:MOD:Mathe_1:MAIN (legacy)
  * - WS26::MOD::Mathe_1::MAIN (legacy)
  * - SS25_MOD_Mathe_1_MAIN
  */
const MOD_REGEX =
  /^(?:(?<sem>[A-Z]{2}\d{2})(?:::?|_))?MOD(?:::?|_)(?<mod>.+?)(?:(?:::?|_)(?<kind>MAIN|SUB)(?:(?:::?|_)(?<sub>.+))?)?$/i;

/**
  * Matches:
  * - CUSTOM_Webtech_Proj
  * - WS26_CUSTOM_Webtech_Proj
  * - CUSTOM:Webtech-Proj. (legacy)
  * - CUSTOM::Webtech-Proj. (legacy)
  */
const CUSTOM_REGEX = /^(?:(?<sem>[A-Z]{2}\d{2})(?:::?|_))?CUSTOM(?:::?|_)(?<name>.+)$/i;

/**
  * Matches embedded attachment metadata in text:
  * [ATTACHMENT::Tafelanschrieb_VL3.jpg::1.2 MB::img]
  */
const ATTACHMENT_REGEX = /^\[ATTACHMENT::(?<name>[^:]+)::(?<size>[^:]+)::(?<kind>img|pdf)\](?:\s*(?<rest>.*))?$/is;

export function findModuleByToken(modToken: string, modules: Module[]): Module | undefined {
  const clean = modToken.trim().toLowerCase();
  const sanitized = sanitizeServerToken(modToken).toLowerCase();
  const unslug = unslugifyName(modToken).toLowerCase();
  return modules.find(
    (m) =>
      m.id.toLowerCase() === clean ||
      m.slug.toLowerCase() === clean ||
      sanitizeServerToken(m.slug).toLowerCase() === sanitized ||
      m.abbr.toLowerCase() === clean ||
      slugifyName(m.abbr).toLowerCase() === clean ||
      slugifyName(m.short).toLowerCase() === clean ||
      sanitizeServerToken(m.short).toLowerCase() === sanitized ||
      m.short.toLowerCase() === unslug ||
      m.full.toLowerCase() === unslug ||
      m.code.toLowerCase() === clean,
  );
}

/**
  * Creates a dynamic Module object when a user or server room creates a brand-new Module
  * not in INITIAL_MODULES.
  */
export function createDynamicModuleFromToken(modToken: string, joined = true): Module {
  const display = unslugifyName(modToken);
  const slug = sanitizeServerToken(display) || slugifyName(display);
  const id = `mod_${slug.toLowerCase()}`;
  const words = display.split(/\s+/).filter(Boolean);
  const abbr =
    words.length >= 2
      ? `${words[0]![0]}${words[1]![0]}`.toUpperCase()
      : display.slice(0, 2).toUpperCase();

  return {
    id,
    slug,
    abbr,
    short: display.slice(0, 18),
    full: display,
    code: `MOD-${abbr}`,
    prof: 'Hochschulkurs',
    participants: 0,
    category: CATEGORIES[2] ?? 'Wahlpflicht',
    joined,
  };
}

export function isRoomJoinedByUser(r: ChatRoom, currentUserId?: string): boolean {
  if (Number(r.chatid) === 0) return true;
  if (typeof r.joined === 'boolean') return r.joined;
  if (r.role) {
    const role = r.role.toLowerCase();
    return role === 'owner' || role === 'member' || role === 'admin';
  }
  const uid = currentUserId?.trim().toLowerCase();
  if (uid) {
    const ownerObj = r.owner && !Array.isArray(r.owner) ? r.owner : undefined;
    if (ownerObj?.userid?.toLowerCase() === uid) return true;
    if (Array.isArray(r.participants) && r.participants.length > 0) {
      return r.participants.some((p) => p.userid?.toLowerCase() === uid);
    }
  }
  return true;
}

/**
  * Discovers any user-created modules from server rooms (`getchats`) and merges them with existing modules.
  */
export function syncModulesWithServerRooms(
  rooms: ChatRoom[],
  currentModules: Module[],
  isMock: boolean,
  currentUserId?: string,
): Module[] {
  const initialIds = new Set(INITIAL_MODULES.map((m) => m.id));
  const initialAbbrs = new Set(INITIAL_MODULES.map((m) => m.abbr.toLowerCase()));

  // Keep all INITIAL_MODULES plus custom modules that aren't duplicates of an initial module's abbreviation
  const cleanedModules = currentModules.filter(
    (m) => initialIds.has(m.id) || !initialAbbrs.has(m.short.toLowerCase()),
  );

  const nextModules = cleanedModules.map((m) => ({
    ...m,
    // In real server mode (Live & Backup), start with 0 dummy participants and joined = false;
    // real membership and participant counts come strictly from the server rooms.
    participants: isMock ? m.participants : 0,
    joined: isMock ? m.joined : false,
  }));

  // Process MAIN rooms before SUB rooms so custom modules are registered by their full slug before any subgroup abbreviations
  const sortedRooms = [...rooms].sort((a, b) => {
    const aIsSub = /[:_]SUB[:_]/i.test(a.chatname ?? '') ? 1 : 0;
    const bIsSub = /[:_]SUB[:_]/i.test(b.chatname ?? '') ? 1 : 0;
    return aIsSub - bIsSub;
  });

  for (const r of sortedRooms) {
    const rawName = String(r.chatname ?? '').trim();
    const match = rawName.match(MOD_REGEX);
    if (!match || !match.groups) continue;

    const sem = (match.groups.sem ?? CURRENT_SEMESTER).toUpperCase();
    if (sem !== CURRENT_SEMESTER) continue;

    const modToken = match.groups.mod ?? '';
    if (!modToken) continue;

    const isRoomJoined = isRoomJoinedByUser(r, currentUserId);

    const existing = findModuleByToken(modToken, nextModules);
    if (existing) {
      if (isRoomJoined) existing.joined = true;
      if (Array.isArray(r.participants) && r.participants.length > 0) {
        existing.participants = Math.max(existing.participants, r.participants.length);
      } else if (isRoomJoined && existing.participants === 0) {
        existing.participants = 1;
      }
    } else {
      const dyn = createDynamicModuleFromToken(modToken, isRoomJoined);
      if (Array.isArray(r.participants) && r.participants.length > 0) {
        dyn.participants = r.participants.length;
      } else if (isRoomJoined) {
        dyn.participants = 1;
      }
      nextModules.push(dyn);
    }
  }

  return nextModules;
}

export function parseChatRoom(
  room: ChatRoom,
  existingMessages: Channel['messages'] = [],
  modules: Module[] = INITIAL_MODULES,
): Channel {
  const rawName = String(room.chatname ?? `Chat #${room.chatid}`).trim();
  const chatid = Number(room.chatid);
  const id = String(chatid);
  const participantCount = Array.isArray(room.participants) ? room.participants.length : undefined;

  const modMatch = rawName.match(MOD_REGEX);
  if (modMatch && modMatch.groups) {
    const sem = (modMatch.groups.sem ?? CURRENT_SEMESTER).toUpperCase();
    const modToken = modMatch.groups.mod ?? '';
    const kind = (modMatch.groups.kind ?? 'MAIN').toUpperCase();
    const subRaw = modMatch.groups.sub ?? '';

    const matchedMod =
      findModuleByToken(modToken, modules) ?? createDynamicModuleFromToken(modToken, true);
    const archived = sem !== CURRENT_SEMESTER;
    const isMain = kind === 'MAIN' || !subRaw;
    const modDisplayName = matchedMod.short;

    const name = archived
      ? isMain
        ? `${modDisplayName} — Hauptkanal`
        : `${modDisplayName} — ${unslugifyName(subRaw)}`
      : isMain
        ? 'Hauptkanal'
        : unslugifyName(subRaw);

    const members = participantCount ?? (isMain ? Math.max(1, matchedMod.participants) : 1);

    let subtype: ChannelSubtype = 'study';
    if (isMain) {
      subtype = 'main';
    } else {
      const lower = `${subRaw} ${name}`.toLowerCase();
      if (/übung|uebung|blatt|aufgabe/.test(lower)) {
        subtype = 'exercise';
      } else if (/projekt|project|proj/.test(lower)) {
        subtype = 'project';
      } else {
        subtype = 'study';
      }
    }

    return {
      id,
      chatid,
      rawName,
      name,
      icon: archived ? '📦' : '💬',
      moduleId: archived ? undefined : matchedMod.id,
      subtype,
      members,
      archived,
      visibility: room.visibility,
      messages: existingMessages,
    };
  }

  const customMatch = rawName.match(CUSTOM_REGEX);
  if (customMatch && customMatch.groups) {
    const sem = (customMatch.groups.sem ?? CURRENT_SEMESTER).toUpperCase();
    const archived = sem !== CURRENT_SEMESTER;
    const name = unslugifyName(customMatch.groups.name ?? rawName);
    const lower = name.toLowerCase();
    const subtype: ChannelSubtype = /projekt|project|proj/.test(lower) ? 'project' : 'custom';
    return {
      id,
      chatid,
      rawName,
      name,
      icon: archived ? '📦' : '🔧',
      subtype,
      members: participantCount ?? 1,
      archived,
      visibility: room.visibility,
      messages: existingMessages,
    };
  }

  return {
    id,
    chatid,
    rawName,
    name: rawName,
    icon: '💬',
    subtype: 'custom',
    members: participantCount ?? 1,
    archived: false,
    visibility: room.visibility,
    messages: existingMessages,
  };
}

export function parseChatInvite(inv: ChatInvite, modules: Module[] = INITIAL_MODULES): Invitation {
  const rawName = String(inv.chatname ?? `Raum #${inv.chatid}`).trim();
  const chatid = Number(inv.chatid);
  const from =
    inv.usernick ||
    inv.userid ||
    inv.owner?.nickname ||
    inv.owner?.userid ||
    'Kommilitone';

  const modMatch = rawName.match(MOD_REGEX);
  if (modMatch && modMatch.groups) {
    const modToken = modMatch.groups.mod ?? '';
    const subRaw = modMatch.groups.sub ?? 'Hauptkanal';
    const matchedMod = findModuleByToken(modToken, modules);
    const modLabel = matchedMod ? matchedMod.short : unslugifyName(modToken);
    const channelName = unslugifyName(subRaw);
    return {
      id: String(chatid),
      chatid,
      room: `${channelName} — ${modLabel}`,
      icon: '💬',
      from,
      when: 'gerade eben',
      status: 'open',
      moduleId: matchedMod?.id,
      channelName,
    };
  }

  const customMatch = rawName.match(CUSTOM_REGEX);
  if (customMatch && customMatch.groups) {
    const channelName = unslugifyName(customMatch.groups.name ?? rawName);
    return {
      id: String(chatid),
      chatid,
      room: channelName,
      icon: '🔧',
      from,
      when: 'gerade eben',
      status: 'open',
      channelName,
    };
  }

  return {
    id: String(chatid),
    chatid,
    room: rawName,
    icon: '💬',
    from,
    when: 'gerade eben',
    status: 'open',
    channelName: rawName,
  };
}

function formatMessageTime(rawTime?: string): string {
  if (!rawTime) {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  // Matches standard HH:MM (e.g. "2026-11-09 10:12:00")
  const colonMatch = rawTime.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    return `${Number(colonMatch[1])}:${colonMatch[2]}`;
  }
  // Matches HSE server format Y-m-d_H-i-s (e.g. "2026-09-13_18-22-05")
  const hseMatch = rawTime.match(/_(\d{2})-(\d{2})(?:-(\d{2}))?$/);
  if (hseMatch) {
    return `${Number(hseMatch[1])}:${hseMatch[2]}`;
  }
  return rawTime;
}

export function parseChatMessage(m: ChatMessage, currentUserId: string, token?: string): Msg {
  const isSelf = (m.userid ?? '').toLowerCase() === currentUserId.toLowerCase();
  const senderLabel = isSelf ? 'self' : m.usernick || m.userid || 'Nutzer';
  const dozent = isDozentUser(m.userid, m.usernick);
  const time = formatMessageTime(m.time);

  let text: string | undefined = (m.text ?? '').trim() || undefined;
  let file: FileAtt | undefined;

  if (text) {
    const attMatch = text.match(ATTACHMENT_REGEX);
    if (attMatch && attMatch.groups) {
      const kind = attMatch.groups.kind === 'img' ? 'img' : 'pdf';
      const url =
        kind === 'img' && m.photoid
          ? chatApi.photoUrl(m.photoid, token)
          : m.fileid
            ? chatApi.fileUrl(m.fileid, token)
            : undefined;
      file = {
        name: attMatch.groups.name,
        size: attMatch.groups.size,
        kind,
        url,
      };
      text = attMatch.groups.rest?.trim() || undefined;
    }
  }

  if (!file && m.photoid) {
    file = {
      name: `Foto_${m.id}.jpg`,
      size: '420 KB',
      kind: 'img',
      url: chatApi.photoUrl(m.photoid, token),
    };
  } else if (!file && m.fileid) {
    file = {
      name: `Dokument_${m.id}.pdf`,
      size: '240 KB',
      kind: 'pdf',
      url: chatApi.fileUrl(m.fileid, token),
    };
  }

  return {
    id: String(m.id),
    from: senderLabel,
    senderId: m.userid,
    dozent,
    time,
    text,
    file,
    important: Boolean(m.important),
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = Math.round(bytes / 1024);
  if (kb < 1024) return `${kb} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
  * Ensures any generated server room name stays <= 30 characters so `createchat` never fails with 463 on the real HSE server.
  */
function clampRoomName(name: string): string {
  return name.slice(0, MAX_CHATNAME_LENGTH);
}

export function buildModuleMainRoomName(mod: Module): string {
  const modKey = sanitizeServerToken(mod.slug || mod.short).slice(0, 14) || 'Modul';
  return clampRoomName(`${CURRENT_SEMESTER}_MOD_${modKey}_MAIN`);
}

export function buildSubgroupRoomName(mod: Module, subgroupName: string): string {
  const modKey = sanitizeServerToken(mod.slug || mod.short).slice(0, 10) || 'Mod';
  const prefix = `${CURRENT_SEMESTER}_MOD_${modKey}_SUB_`;
  const maxSubLen = Math.max(2, MAX_CHATNAME_LENGTH - prefix.length);
  const subKey = sanitizeServerToken(subgroupName).slice(0, maxSubLen) || 'Gruppe';
  return clampRoomName(`${prefix}${subKey}`);
}

export function buildCustomGroupRoomName(groupName: string): string {
  const prefix = 'CUSTOM_';
  const maxLen = MAX_CHATNAME_LENGTH - prefix.length;
  const key = sanitizeServerToken(groupName).slice(0, maxLen) || 'Gruppe';
  return clampRoomName(`${prefix}${key}`);
}
