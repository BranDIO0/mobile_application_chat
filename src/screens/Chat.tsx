import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Archive as ArchiveIcon,
  BellOff,
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  FileText,
  FolderKanban,
  Hash,
  LogOut,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { hasGeminiApiKey, summarizeChatWithGemini, type ChatAiSummary } from '../api/geminiApi';
import { ChatArea, InputBar, MainHeader, SubHeader, TabBar } from '../components/Layout';
import type { Channel } from '../data/catalog';
import { CATEGORIES, slugifyName } from '../data/catalog';
import { useApp } from '../context/AppContext';
import { extractImportantMessages } from '../utils/importantDetector';
import { buildModuleMainRoomName, buildSubgroupRoomName } from '../utils/roomParser';

function renderChannelIcon(c: Channel) {
  if (c.archived) {
    return (
      <span className="channel-icon-wrap channel-icon-archived">
        <ArchiveIcon size={14} strokeWidth={2} />
      </span>
    );
  }

  const subtype =
    c.subtype ??
    (c.name.toLowerCase() === 'hauptkanal' || /[:_]MAIN$/i.test(c.rawName)
      ? 'main'
      : 'study');

  switch (subtype) {
    case 'main':
      return (
        <span className="channel-icon-wrap channel-icon-main" title="Hauptkanal">
          <Hash size={16} strokeWidth={2.8} />
        </span>
      );
    case 'study':
      return (
        <span className="channel-icon-wrap channel-icon-study" title="Lerngruppe">
          <Users size={15} strokeWidth={2.2} />
        </span>
      );
    case 'exercise':
      return (
        <span className="channel-icon-wrap channel-icon-exercise" title="Übungsblatt">
          <FileText size={15} strokeWidth={2.2} />
        </span>
      );
    case 'project':
      return (
        <span className="channel-icon-wrap channel-icon-project" title="Projekt">
          <FolderKanban size={15} strokeWidth={2.2} />
        </span>
      );
    case 'custom':
    default:
      return (
        <span className="channel-icon-wrap channel-icon-custom" title="Gruppe">
          <Users size={15} strokeWidth={2.2} />
        </span>
      );
  }
}

const SUBTYPE_PRIORITY: Record<string, number> = {
  study: 1,    // Lerngruppe
  exercise: 2, // Übungsblatt
  project: 3,  // Projekt
  custom: 4,
};

function sortChannelsByType(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => {
    const prioA = SUBTYPE_PRIORITY[a.subtype ?? 'study'] ?? 99;
    const prioB = SUBTYPE_PRIORITY[b.subtype ?? 'study'] ?? 99;
    if (prioA !== prioB) return prioA - prioB;
    return a.name.localeCompare(b.name, 'de', { numeric: true });
  });
}

function TreeGroup({
  id,
  title,
  items,
  addLabel,
  onAdd,
  muted,
}: {
  id: string;
  title: string;
  items: Channel[];
  addLabel?: string;
  onAdd?: () => void;
  muted?: boolean;
}) {
  const p = useApp();
  const closed = p.collapsed.includes(id);

  // Separate main channel and sorted subchannels for modules
  const mainChannel = items.find(
    (c) =>
      !c.archived &&
      (c.subtype === 'main' ||
        c.name.toLowerCase() === 'hauptkanal' ||
        /[:_]MAIN$/i.test(c.rawName)),
  );
  const subChannels = mainChannel
    ? sortChannelsByType(items.filter((c) => c.id !== mainChannel.id))
    : sortChannelsByType(items);

  return (
    <div className="tree-group">
      <div className="tree-head-row">
        <button
          type="button"
          className="tree-head-toggle"
          onClick={() => p.toggleCollapsed(id)}
          aria-expanded={!closed}
        >
          {closed ? (
            <ChevronRight size={20} strokeWidth={2.4} />
          ) : (
            <ChevronDown size={20} strokeWidth={2.4} />
          )}
          <span className="tree-title">{title}</span>
          {closed && items.length > 0 && <span className="count">{items.length}</span>}
        </button>
        {onAdd && (
          <button
            type="button"
            className="tree-head-action"
            title={`${addLabel ?? 'Untergruppe'} hinzufügen`}
            aria-label={`${addLabel ?? 'Untergruppe'} in ${title} hinzufügen`}
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            <Plus size={16} strokeWidth={2.4} />
          </button>
        )}
      </div>
      <div className={`tree-body${closed ? ' collapsed' : ''}`}>
        {mainChannel ? (
          <>
            <button
              key={mainChannel.id}
              className={`tree-item tree-item-main${mainChannel.id === p.activeChannelId && !mainChannel.archived ? ' active' : ''}${muted ? ' muted' : ''}`}
              onClick={() => p.openChannel(mainChannel.id)}
            >
              {renderChannelIcon(mainChannel)}
              <span className="channel-name">{mainChannel.name}</span>
            </button>
            {subChannels.length > 0 && (
              <div className="tree-sub-list">
                {subChannels.map((c) => (
                  <button
                    key={c.id}
                    className={`tree-item tree-item-sub${c.id === p.activeChannelId && !c.archived ? ' active' : ''}${muted ? ' muted' : ''}`}
                    onClick={() => p.openChannel(c.id)}
                  >
                    {renderChannelIcon(c)}
                    <span className="channel-name">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          subChannels.map((c) => (
            <button
              key={c.id}
              className={`tree-item${c.id === p.activeChannelId && !c.archived ? ' active' : ''}${muted ? ' muted' : ''}`}
              onClick={() => p.openChannel(c.id)}
            >
              {renderChannelIcon(c)}
              <span className="channel-name">{c.name}</span>
            </button>
          ))
        )}
        {!items.length && <div className="tree-item muted">Keine Kanäle</div>}
      </div>
    </div>
  );
}

export function Chats() {
  const p = useApp();
  const { modules, channels, collapseAll, expandAll, collapsed } = p;
  const [tab, setTab] = useState<'ws26' | 'custom' | 'archive'>('ws26');

  const joined = modules.filter((m) => m.joined);
  const custom = channels.filter((c) => !c.moduleId && !c.archived);
  const archived = channels.filter((c) => c.archived);

  const ws26Count = joined.length;
  const customCount = custom.length;
  const archiveCount = archived.length;

  const allJoinedCollapsed = joined.length > 0 && joined.every((m) => collapsed.includes(m.id));

  return (
    <>
      <MainHeader title="Chats" />
      <div className="chat-filter-bar">
        <div className="segmented-control" role="tablist" aria-label="Chat-Kategorien">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ws26'}
            className={`segmented-btn${tab === 'ws26' ? ' active' : ''}`}
            onClick={() => setTab('ws26')}
          >
            <span>WS 26/27</span>
            <span className="seg-badge">{ws26Count}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'custom'}
            className={`segmented-btn${tab === 'custom' ? ' active' : ''}`}
            onClick={() => setTab('custom')}
          >
            <span>Eigene Gruppen</span>
            {customCount > 0 && <span className="seg-badge">{customCount}</span>}
          </button>
          {(p.mockMode || archiveCount > 0) && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'archive'}
              className={`segmented-btn${tab === 'archive' ? ' active' : ''}`}
              onClick={() => setTab('archive')}
            >
              <span>Archiv (SS25)</span>
              {archiveCount > 0 && <span className="seg-badge">{archiveCount}</span>}
            </button>
          )}
        </div>
      </div>

      <div className="chat-sub-toolbar">
        {tab === 'ws26' && (
          <>
            <button
              type="button"
              className="toolbar-text-btn"
              onClick={() => {
                if (allJoinedCollapsed) {
                  expandAll();
                } else {
                  collapseAll();
                }
              }}
              title="Alle Module auf- oder einklappen"
            >
              {allJoinedCollapsed ? (
                <>
                  <ChevronDown size={15} /> Alle aufklappen
                </>
              ) : (
                <>
                  <ChevronRight size={15} /> Alle einklappen
                </>
              )}
            </button>
            <button
              type="button"
              className="toolbar-action-btn"
              onClick={() => {
                if (joined.length === 0) {
                  p.setModuleModalOpen(true);
                  return;
                }
                const targetModId = p.activeChannel?.moduleId ?? joined[0]?.id ?? '';
                p.setSubgroupModal(targetModId);
              }}
              title="Neue Gruppe oder Untergruppe anlegen"
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>{joined.length === 0 ? 'Modul anlegen' : 'Gruppe / Untergruppe'}</span>
            </button>
          </>
        )}
        {tab === 'custom' && (
          <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="toolbar-action-btn"
              onClick={() => p.navigate('freegroup')}
            >
              <Plus size={16} strokeWidth={2.4} />
              <span>Freie Gruppe</span>
            </button>
          </div>
        )}
        {tab === 'archive' && (
          <div className="archive-info-pill">
            <ArchiveIcon size={14} />
            <span>Sommersemester 2025 · Nur-Lese-Modus</span>
          </div>
        )}
      </div>

      <div className="tree">
        {tab === 'ws26' && (
          <>
            {joined.map((m) => (
              <TreeGroup
                key={m.id}
                id={m.id}
                title={m.short}
                items={channels.filter((c) => !c.archived && c.moduleId === m.id)}
                addLabel="Untergruppe"
                onAdd={() => p.setSubgroupModal(m.id)}
              />
            ))}
            {joined.length === 0 && (
              <div className="tree-empty-state">
                <p>Du bist noch keinem Kurs im WS 26/27 beigetreten.</p>
                <button
                  type="button"
                  className="btn-primary sm"
                  onClick={() => p.navigate('catalog')}
                >
                  Zum Modulkatalog
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'custom' && (
          <>
            {custom.length > 0 ? (
              <TreeGroup
                id="custom"
                title="Eigene Gruppen & Projekte"
                items={custom}
                addLabel="Neue Gruppe"
                onAdd={() => p.navigate('freegroup')}
              />
            ) : (
              <div className="tree-empty-state">
                <p>Noch keine eigenen Gruppen vorhanden.</p>
                <button
                  type="button"
                  className="btn-primary sm"
                  onClick={() => p.navigate('freegroup')}
                >
                  <Plus size={16} /> Gruppe erstellen
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'archive' && (
          <>
            {archived.length > 0 ? (
              <TreeGroup id="archive" title="Archiv SS25" items={archived} muted />
            ) : (
              <div className="tree-empty-state">
                <p>Keine archivierten Kurse vorhanden.</p>
              </div>
            )}
          </>
        )}
      </div>
      <TabBar active="chats" />
    </>
  );
}

export function ChatView() {
  const p = useApp();
  const ch = p.activeChannel;
  const mod = p.moduleOf(ch);
  const [menu, setMenu] = useState(false);
  const [pinsState, setPinsState] = useState<{ channelId: string; open: boolean }>({
    channelId: ch.id,
    open: false,
  });
  const [highlightState, setHighlightState] = useState<{ channelId: string; msgId: string } | null>(
    null,
  );
  const [dismissedChipChannel, setDismissedChipChannel] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiState, setAiState] = useState<{
    channelId: string;
    loading: boolean;
    error: string | null;
    summary: ChatAiSummary | null;
  }>({
    channelId: ch.id,
    loading: false,
    error: null,
    summary: null,
  });
  const highlightTimer = useRef<number | null>(null);

  const pinsExpanded = pinsState.channelId === ch.id && pinsState.open;
  const highlightedMsgId = highlightState?.channelId === ch.id ? highlightState.msgId : null;
  const hasKey = hasGeminiApiKey();
  const activeAi =
    aiState.channelId === ch.id
      ? aiState
      : { channelId: ch.id, loading: false, error: null, summary: null };

  const runAiSummary = async () => {
    if (!hasGeminiApiKey()) {
      setAiState({ channelId: ch.id, loading: false, error: null, summary: null });
      return;
    }
    setAiState({ channelId: ch.id, loading: true, error: null, summary: null });
    try {
      const summary = await summarizeChatWithGemini(ch.name, mod?.short, ch.messages);
      setAiState({ channelId: ch.id, loading: false, error: null, summary });
    } catch (e) {
      setAiState({
        channelId: ch.id,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
        summary: null,
      });
    }
  };

  const openAiSummary = () => {
    setAiOpen(true);
    if (hasGeminiApiKey() && (!activeAi.summary || activeAi.error) && !activeAi.loading) {
      runAiSummary();
    }
  };

  const importantInfos = extractImportantMessages(ch.messages);
  const orderedInfos = [...importantInfos].reverse();

  useEffect(() => {
    return () => {
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    };
  }, []);

  const jumpToMessage = (msgId: string) => {
    setPinsState({ channelId: ch.id, open: false });
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    setHighlightState(null);
    window.requestAnimationFrame(() => {
      setHighlightState({ channelId: ch.id, msgId });
    });
    highlightTimer.current = window.setTimeout(() => {
      setHighlightState(null);
    }, 2200);
  };

  const item = (icon: ReactNode, label: string, fn: () => void) => (
    <button
      role="menuitem"
      onClick={() => {
        setMenu(false);
        fn();
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <>
      <SubHeader
        title={ch.name}
        sub={`${mod ? `${mod.short} · WS26` : 'Eigene Gruppe'} · #${ch.chatid} · ${ch.members} Teiln.`}
      >
        <button
          type="button"
          className="icon-btn ai-header-btn"
          aria-label="KI-Zusammenfassung"
          title="KI-Zusammenfassung (Was habe ich verpasst?)"
          onClick={openAiSummary}
        >
          <Sparkles size={20} />
        </button>
        <button className="icon-btn" aria-label="Mitglieder" onClick={() => p.navigate('invite')}>
          <Users size={22} />
        </button>
        <button className="icon-btn" aria-label="Mehr" onClick={() => setMenu(true)}>
          <EllipsisVertical size={22} />
        </button>
      </SubHeader>
      {orderedInfos.length > 0 && (
        <div className="important-bar">
          <button
            type="button"
            className="important-bar-toggle"
            onClick={() => setPinsState({ channelId: ch.id, open: !pinsExpanded })}
            aria-expanded={pinsExpanded}
          >
            <span className="important-bar-title">
              📌 Wichtige Infos &amp; Termine ({orderedInfos.length})
            </span>
            {pinsExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </button>
          {pinsExpanded && (
            <div className="important-bar-list" role="list">
              {orderedInfos.map((info) => {
                const sender = info.msg.from === 'self' ? 'Du' : info.msg.from;
                const preview = info.msg.text || info.msg.file?.name || 'Nachricht';
                return (
                  <button
                    key={info.msg.id}
                    type="button"
                    role="listitem"
                    className="important-bar-item"
                    onClick={() => jumpToMessage(info.msg.id)}
                  >
                    <span className="important-bar-icon" aria-hidden>
                      {info.icon}
                    </span>
                    <span className="important-bar-content">
                      <span className="important-bar-meta">
                        <span className={`badge-important cat-${info.category}`}>{info.label}</span>
                        <span>
                          {sender} · {info.msg.time}
                        </span>
                      </span>
                      <span className="important-bar-text">{preview}</span>
                    </span>
                    <ChevronRight size={15} className="important-bar-arrow" aria-hidden />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {ch.messages.length >= 3 && dismissedChipChannel !== ch.id && (
        <div className="ai-chip-banner">
          <button type="button" className="ai-chip-btn" onClick={openAiSummary}>
            <Sparkles size={14} />
            <span>Was habe ich verpasst? · KI-Zusammenfassung</span>
          </button>
          <button
            type="button"
            className="ai-chip-close"
            aria-label="Hinweis ausblenden"
            onClick={() => setDismissedChipChannel(ch.id)}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <ChatArea channel={ch} highlightedMsgId={highlightedMsgId} />
      <InputBar channel={ch} />
      {aiOpen && (
        <div
          className="modal-overlay"
          onClick={() => setAiOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-summary-title"
        >
          <div className="modal-sheet ai-summary-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" aria-hidden />
            <div className="ai-summary-header">
              <div>
                <h2 id="ai-summary-title" className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Sparkles size={20} color="var(--navy)" />
                  <span>KI-Zusammenfassung</span>
                </h2>
                <div className="modal-sub" style={{ marginTop: 2 }}>
                  {ch.name}
                  {mod ? ` · ${mod.short}` : ''}
                  {activeAi.summary ? ` · Stand ${activeAi.summary.generatedAt}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Schließen"
                onClick={() => setAiOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {!hasKey ? (
              <div className="ai-key-missing">
                <div className="ai-key-missing-title">Gemini API Key erforderlich</div>
                <p>
                  Um Chatverläufe per KI zusammenzufassen, hinterlege bitte zuerst deinen eigenen
                  Google Gemini API Key in den Einstellungen. Der Key wird ausschließlich lokal in
                  deinem Browser gespeichert.
                </p>
                <button
                  type="button"
                  className="btn-primary md"
                  onClick={() => {
                    setAiOpen(false);
                    p.navigate('settings');
                  }}
                >
                  <SettingsIcon size={17} />
                  <span>In den Einstellungen hinterlegen</span>
                </button>
              </div>
            ) : activeAi.loading ? (
              <div className="ai-loading-box">
                <div className="loader" style={{ margin: '8px 0' }} aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                <div>Analysiere {Math.min(ch.messages.length, 60)} Nachrichten mit Gemini…</div>
              </div>
            ) : activeAi.error ? (
              <div className="ai-error-box">
                <div className="ai-error-title">Zusammenfassung fehlgeschlagen</div>
                <p>{activeAi.error}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn-primary md" onClick={runAiSummary}>
                    <RefreshCw size={16} />
                    <span>Erneut versuchen</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setAiOpen(false);
                      p.navigate('settings');
                    }}
                  >
                    <SettingsIcon size={16} />
                    <span>Einstellungen</span>
                  </button>
                </div>
              </div>
            ) : activeAi.summary ? (
              <div className="ai-summary-sections">
                <div className="ai-section">
                  <div className="ai-section-title">📝 TL;DR (Kernaussagen)</div>
                  <ul className="ai-list">
                    {activeAi.summary.tldr.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>

                <div className="ai-section">
                  <div className="ai-section-title">❓ Offene Fragen &amp; To-Dos</div>
                  {activeAi.summary.openQuestionsAndTodos.length > 0 ? (
                    <ul className="ai-list">
                      {activeAi.summary.openQuestionsAndTodos.map((todo, idx) => (
                        <li key={idx}>{todo}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="ai-empty-sub">Keine offenen Fragen oder To-Dos erkannt.</div>
                  )}
                </div>

                {activeAi.summary.keyDates.length > 0 && (
                  <div className="ai-section">
                    <div className="ai-section-title">📅 Erkannte Termine &amp; Fristen</div>
                    <ul className="ai-list">
                      {activeAi.summary.keyDates.map((d, idx) => (
                        <li key={idx}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button type="button" className="btn-secondary" onClick={runAiSummary}>
                    <RefreshCw size={16} />
                    <span>Neu generieren</span>
                  </button>
                  <button type="button" className="btn-primary md" onClick={() => setAiOpen(false)}>
                    <span>Fertig</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {menu && (
        <>
          <div className="menu-backdrop" onClick={() => setMenu(false)} />
          <div className="menu" role="menu">
            {item(<UserPlus size={18} />, 'Mitglieder einladen', () => p.navigate('invite'))}
            {mod &&
              item(<Plus size={18} />, 'Untergruppe erstellen', () => p.setSubgroupModal(mod.id))}
            {p.mockMode &&
              item(<BellOff size={18} />, 'Stummschalten', () =>
                p.toast(`${ch.name} stummgeschaltet`),
              )}
            {ch.chatid !== 0 &&
              item(<LogOut size={18} />, 'Gruppe verlassen', () => p.leaveChannel(ch.id))}
            {ch.chatid !== 0 &&
              item(<Trash2 size={18} />, 'Raum löschen', () => p.deleteChannel(ch.id))}
          </div>
        </>
      )}
    </>
  );
}

export function Archive() {
  const p = useApp();
  const ch =
    p.activeChannel.archived
      ? p.activeChannel
      : (p.channels.find((c) => c.archived) ?? p.activeChannel);

  return (
    <>
      <SubHeader title={ch.name} sub="SS25 · Archiviert" />
      <div className="archive-banner">
        <ArchiveIcon size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Archivierter Kurs — SS25</strong>
          Nur-Lese-Modus. Nachrichten und Dateien sind weiterhin abrufbar.
        </div>
      </div>
      <ChatArea channel={ch} dateLabel="14. Juli 2025" />
      <InputBar channel={ch} />
    </>
  );
}

export function SubgroupModal() {
  const p = useApp();
  const joinedMods = p.modules.filter((m) => m.joined);
  const initialModId =
    joinedMods.find((m) => m.id === p.subgroupModal)?.id ??
    joinedMods.find((m) => m.id === p.activeChannel?.moduleId)?.id ??
    joinedMods[0]?.id ??
    '';

  const [selectedModId, setSelectedModId] = useState<string>(initialModId);
  const [name, setName] = useState('');
  const [type, setType] = useState('Lerngruppe');
  const [busy, setBusy] = useState(false);

  if (!p.subgroupModal) return null;
  const close = () => p.setSubgroupModal(null);
  const currentMod = p.modules.find((m) => m.id === selectedModId) ?? joinedMods[0];
  if (!currentMod) return null;
  const previewName = buildSubgroupRoomName(currentMod, name.trim() || 'Name');

  return (
    <div
      className="modal-overlay"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sg-modal-title"
    >
      <form
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          const createdId = await p.createSubgroup(currentMod.id, name.trim(), type);
          setBusy(false);
          if (createdId && p.screen !== 'chat') {
            p.navigate('chat');
          }
        }}
      >
        <div className="modal-handle" aria-hidden />
        <h2 id="sg-modal-title" className="modal-title">Untergruppe erstellen</h2>
        <div className="modal-sub">in {currentMod.short} · WS26</div>

        <div className="field">
          <label htmlFor="sg-mod">Zugehöriges Modul (Kurs) *</label>
          <select
            id="sg-mod"
            value={selectedModId}
            onChange={(e) => setSelectedModId(e.target.value)}
            disabled={busy}
          >
            {joinedMods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.short} — {m.full}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="sg-name">Name der Untergruppe *</label>
          <input
            id="sg-name"
            type="text"
            placeholder="z. B. Lerngruppe B"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={busy}
          />
          <span className="hint">
            Gespeichert als {previewName} ({previewName.length}/30 Zeichen)
          </span>
        </div>

        <div className="field">
          <label htmlFor="sg-type">Typ</label>
          <select id="sg-type" value={type} onChange={(e) => setType(e.target.value)} disabled={busy}>
            <option>Lerngruppe</option>
            <option>Übungsblatt</option>
            <option>Projekt</option>
          </select>
        </div>

        <button type="submit" className="btn-primary md" disabled={!name.trim() || busy}>
          {busy ? 'Erstelle…' : 'Untergruppe erstellen'}
        </button>
        <button type="button" className="btn-secondary" onClick={close} disabled={busy}>
          Abbrechen
        </button>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            type="button"
            onClick={() => {
              close();
              p.navigate('freegroup');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--navy-80)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Lieber eine freie Gruppe anlegen? Hier klicken
          </button>
        </div>
      </form>
    </div>
  );
}

export function ModuleModal() {
  const p = useApp();
  const [shortName, setShortName] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [prof, setProf] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0] ?? 'Pflicht — 1. Semester');
  const [busy, setBusy] = useState(false);

  if (!p.moduleModalOpen) return null;
  const close = () => p.setModuleModalOpen(false);

  const previewMod = {
    id: 'preview',
    slug: slugifyName(shortName.trim() || 'Modul'),
    abbr: 'M',
    short: shortName.trim() || 'Modul',
    full: fullName.trim() || 'Modul',
    code: code || 'INFB',
    prof: prof || 'Prof.',
    participants: 1,
    category,
    joined: true,
  };
  const previewServerName = buildModuleMainRoomName(previewMod);

  return (
    <div
      className="modal-overlay"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mod-modal-title"
    >
      <form
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!shortName.trim() || busy) return;
          setBusy(true);
          const createdId = await p.createModule(
            shortName.trim(),
            fullName.trim() || shortName.trim(),
            code.trim(),
            prof.trim(),
            category,
          );
          setBusy(false);
          if (createdId && p.screen !== 'chat') {
            p.navigate('chat');
          }
        }}
      >
        <div className="modal-handle" aria-hidden />
        <h2 id="mod-modal-title" className="modal-title">Neues Modul (Kurs) anlegen</h2>
        <div className="modal-sub">Erstellt das Modul + öffentlichen Hauptkanal auf dem Server</div>
        <div className="field">
          <label htmlFor="mod-short">Kurzname (für Seitenleiste, max. 14 Zeichen) *</label>
          <input
            id="mod-short"
            type="text"
            maxLength={14}
            placeholder="z. B. Mobile UI"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            autoFocus
            disabled={busy}
          />
          <span className="hint">
            Server-Raumname: {previewServerName} ({previewServerName.length}/30 Zeichen)
          </span>
        </div>
        <div className="field">
          <label htmlFor="mod-full">Vollständiger Modulname</label>
          <input
            id="mod-full"
            type="text"
            placeholder="z. B. Mobile User Interfaces"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={busy}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field">
            <label htmlFor="mod-code">Modul-Code</label>
            <input
              id="mod-code"
              type="text"
              placeholder="z. B. INFB501"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="mod-prof">Dozent/in</label>
            <input
              id="mod-prof"
              type="text"
              placeholder="z. B. Prof. Kohl"
              value={prof}
              onChange={(e) => setProf(e.target.value)}
              disabled={busy}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="mod-cat">Kategorie</label>
          <select
            id="mod-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={busy}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary md" disabled={!shortName.trim() || busy}>
          {busy ? 'Erstelle Modul…' : 'Modul & Hauptkanal erstellen'}
        </button>
        <button type="button" className="btn-secondary" onClick={close} disabled={busy}>
          Abbrechen
        </button>
      </form>
    </div>
  );
}
