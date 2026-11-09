import {
  INITIAL_MODULES,
  slugifyName,
  unslugifyName,
  type Channel,
  type Invitation,
  type Module,
} from '../data/catalog';
import type { ChatInvite, ChatRoom } from '../types';

export const CURRENT_SEMESTER = 'WS26';

/**
 * Matches:
 * - WS26::MOD::Mathe_1::MAIN
 * - WS26::MOD::Mathe_1::SUB::Lerngruppe_A
 * - SS25::MOD::Mathe_1::MAIN
 * - MOD::Mathe_1::MAIN
 * - MOD::Mathe_1::SUB::Lerngruppe_A
 */
const MOD_REGEX = /^(?:(?<sem>[A-Z]{2}\d{2})::)?MOD::(?<mod>[^:]+)(?:::(?<kind>MAIN|SUB)(?:::(?<sub>.+))?)?$/i;

/**
 * Matches:
 * - CUSTOM::Webtech-Proj.
 * - WS26::CUSTOM::Webtech-Proj.
 */
const CUSTOM_REGEX = /^(?:(?<sem>[A-Z]{2}\d{2})::)?CUSTOM::(?<name>.+)$/i;

export function findModuleByToken(modToken: string, modules: Module[] = INITIAL_MODULES): Module | undefined {
  const clean = modToken.trim().toLowerCase();
  const unslug = unslugifyName(modToken).toLowerCase();
  return modules.find(
    (m) =>
      m.id.toLowerCase() === clean ||
      m.slug.toLowerCase() === clean ||
      slugifyName(m.short).toLowerCase() === clean ||
      m.short.toLowerCase() === unslug ||
      m.code.toLowerCase() === clean,
  );
}

export function parseChatRoom(room: ChatRoom, existingMessages: Channel['messages'] = []): Channel {
  const rawName = String(room.chatname ?? `Chat #${room.chatid}`).trim();
  const chatid = Number(room.chatid);
  const id = String(chatid);

  const modMatch = rawName.match(MOD_REGEX);
  if (modMatch && modMatch.groups) {
    const sem = (modMatch.groups.sem ?? CURRENT_SEMESTER).toUpperCase();
    const modToken = modMatch.groups.mod ?? '';
    const kind = (modMatch.groups.kind ?? 'MAIN').toUpperCase();
    const subRaw = modMatch.groups.sub ?? '';

    const matchedMod = findModuleByToken(modToken);
    const archived = sem !== CURRENT_SEMESTER;
    const isMain = kind === 'MAIN' || !subRaw;
    const modDisplayName = matchedMod ? matchedMod.short : unslugifyName(modToken);

    const name = archived
      ? isMain
        ? `${modDisplayName} — Hauptkanal`
        : `${modDisplayName} — ${unslugifyName(subRaw)}`
      : isMain
        ? 'Hauptkanal'
        : unslugifyName(subRaw);

    const members = isMain ? (matchedMod?.participants ?? 90) : 5;

    return {
      id,
      chatid,
      rawName,
      name,
      icon: archived ? '📦' : '💬',
      moduleId: archived ? undefined : matchedMod?.id,
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
    return {
      id,
      chatid,
      rawName,
      name,
      icon: archived ? '📦' : '🔧',
      members: 4,
      archived,
      visibility: room.visibility,
      messages: existingMessages,
    };
  }

  // Fallback for plain server rooms (e.g. #0 Main Chat or user-created rooms without prefix)
  return {
    id,
    chatid,
    rawName,
    name: rawName,
    icon: '💬',
    members: room.visibility === 'public' ? 42 : 5,
    archived: false,
    visibility: room.visibility,
    messages: existingMessages,
  };
}

export function parseChatInvite(inv: ChatInvite): Invitation {
  const rawName = String(inv.chatname ?? `Raum #${inv.chatid}`).trim();
  const chatid = Number(inv.chatid);
  const from = inv.usernick || inv.userid || 'abcdit44';

  const modMatch = rawName.match(MOD_REGEX);
  if (modMatch && modMatch.groups) {
    const modToken = modMatch.groups.mod ?? '';
    const subRaw = modMatch.groups.sub ?? 'Hauptkanal';
    const matchedMod = findModuleByToken(modToken);
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

export function buildModuleMainRoomName(mod: Module): string {
  return `${CURRENT_SEMESTER}::MOD::${slugifyName(mod.short)}::MAIN`;
}

export function buildSubgroupRoomName(mod: Module, subgroupName: string): string {
  return `${CURRENT_SEMESTER}::MOD::${slugifyName(mod.short)}::SUB::${slugifyName(subgroupName)}`;
}

export function buildCustomGroupRoomName(groupName: string): string {
  return `CUSTOM::${groupName.trim()}`;
}
