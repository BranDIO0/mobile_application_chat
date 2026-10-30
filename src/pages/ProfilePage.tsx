import { useCallback, useEffect, useState } from 'react';
import { formatError } from '../api/client';
import { chatApi } from '../api/chatApi';
import type { UserProfile } from '../types';
import { Modal } from '../components/Modal';

interface ProfilePageProps {
  token: string;
  userId: string;
  onDeleteAccount: () => Promise<void>;
}

export function ProfilePage({ token, userId, onDeleteAccount }: ProfilePageProps) {
  const currentKey = `${token}:${userId}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    profile: UserProfile | null;
    error: string | null;
  }>({
    key: '',
    profile: null,
    error: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchProfile = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const res = await chatApi.getProfiles(token);
        const match =
          res.profiles?.find((p) => p.userid.toLowerCase() === userId.toLowerCase()) ?? null;
        setLoaded({ key: currentKey, profile: match, error: null });
      } catch (e) {
        setLoaded({ key: currentKey, profile: null, error: formatError(e) });
      } finally {
        if (isManual) setRefreshing(false);
      }
    },
    [token, userId, currentKey],
  );

  useEffect(() => {
    let cancelled = false;

    chatApi
      .getProfiles(token)
      .then((res) => {
        if (cancelled) return;
        const match =
          res.profiles?.find((p) => p.userid.toLowerCase() === userId.toLowerCase()) ?? null;
        setLoaded({ key: currentKey, profile: match, error: null });
      })
      .catch((e) => {
        if (!cancelled) {
          setLoaded({ key: currentKey, profile: null, error: formatError(e) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, userId, currentKey]);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteAccount();
      setConfirmOpen(false);
    } catch (e) {
      setDeleteError(formatError(e));
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const loadingProfile = loaded.key !== currentKey || refreshing;
  const profile = loaded.key === currentKey ? loaded.profile : null;
  const error = deleteError ?? (loaded.key === currentKey ? loaded.error : null);

  const dismissError = () => {
    setDeleteError(null);
    setLoaded((prev) => ({ ...prev, error: null }));
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          <span>{error}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchProfile(true)}
              disabled={loadingProfile}
              className="rounded border border-red-300 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
            >
              Erneut versuchen
            </button>
            <button
              type="button"
              onClick={dismissError}
              className="font-bold text-red-600 hover:text-red-900"
              aria-label="Fehlermeldung schließen"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <section className="card space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Mein Profil</h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              Aktive Sitzung
            </span>
          </div>
          <button
            type="button"
            onClick={() => fetchProfile(true)}
            disabled={loadingProfile}
            className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {loadingProfile ? 'Lädt…' : '↻ Aktualisieren'}
          </button>
        </div>

        {loadingProfile ? (
          <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Lade Profildaten (getprofiles)…</span>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-slate-500">Hochschulkürzel (User-ID)</dt>
              <dd className="mt-0.5 font-mono text-sm font-bold text-blue-600">{userId}</dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-slate-500">Nickname</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                {profile?.nickname ?? '—'}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-slate-500">Vollständiger Name</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                {profile?.fullname ?? '—'}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-slate-500">User-Hash</dt>
              <dd
                className="mt-0.5 truncate font-mono text-slate-700"
                title={profile?.hash}
              >
                {profile?.hash ?? '—'}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="card space-y-3 border-red-200">
        <h2 className="border-b border-red-100 pb-2 text-sm font-bold text-red-700">
          Account-Verwaltung
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Account dauerhaft löschen</p>
            <p>Entfernt deinen Account ({userId}) über deregister vom HSE-Chat-Server.</p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
            className="btn-danger"
          >
            Account löschen
          </button>
        </div>
      </section>

      {confirmOpen && (
        <Modal title="Account wirklich löschen?" onClose={() => setConfirmOpen(false)}>
          <div className="space-y-4 text-xs text-slate-600">
            <p>
              Möchtest du den Account{' '}
              <b className="font-mono text-slate-900">{userId}</b> wirklich unwiderruflich löschen?
              Dies ruft <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">deregister</code>{' '}
              auf dem Server auf.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="btn-secondary text-xs"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? 'Lösche Account…' : 'Ja, Account löschen'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
