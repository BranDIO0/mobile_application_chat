import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { chatApi } from '../api/chatApi';
import { ERROR_CODES, type UserProfile } from '../types';
import { Modal } from '../components/Modal';

interface ProfilePageProps {
  token: string | null;
  userId: string;
  onDeleteAccount: () => Promise<void>;
}

export function ProfilePage({ token, userId, onDeleteAccount }: ProfilePageProps) {
  const currentKey = token ? `${token}:${userId}` : '';
  const [loaded, setLoaded] = useState<{ key: string; profile: UserProfile | null }>({ key: '', profile: null });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletedUser, setDeletedUser] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    chatApi
      .getProfiles(token)
      .then((res) => {
        if (cancelled) return;
        const match = res.profiles?.find((p) => p.userid === userId) ?? null;
        setLoaded({ key: currentKey, profile: match });
      })
      .catch((e) => {
        if (!cancelled) {
          setLoaded({ key: currentKey, profile: null });
          setError(e instanceof ApiError ? (ERROR_CODES[e.code] ?? e.message) : String(e));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, userId, currentKey]);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onDeleteAccount();
      setConfirmOpen(false);
      setDeletedUser(userId);
    } catch (e) {
      setError(e instanceof ApiError ? (ERROR_CODES[e.code] ?? e.message) : String(e));
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md space-y-3">
        {deletedUser && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-xs text-emerald-800">
            Account <b className="font-mono">{deletedUser}</b> has been permanently deleted.
          </p>
        )}
        <p className="card text-center text-sm">Please register or log in on the API Test tab first.</p>
      </div>
    );
  }

  const loadingProfile = loaded.key !== currentKey;
  const profile = loaded.key === currentKey ? loaded.profile : null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {error && (
        <p className="flex justify-between rounded-lg bg-red-50 p-3 text-xs text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss error">
            ✕
          </button>
        </p>
      )}

      <section className="card space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-sm font-bold">My Profile</h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            Active session
          </span>
        </div>

        {loadingProfile ? (
          <p className="text-xs text-slate-500">Loading profile details…</p>
        ) : (
          <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-lg border bg-slate-50 p-3">
              <dt className="text-slate-500">User ID</dt>
              <dd className="mt-0.5 font-mono text-sm font-bold text-blue-600">{userId}</dd>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <dt className="text-slate-500">Nickname</dt>
              <dd className="mt-0.5 text-sm font-semibold">{profile?.nickname ?? '—'}</dd>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <dt className="text-slate-500">Full Name</dt>
              <dd className="mt-0.5 text-sm font-semibold">{profile?.fullname ?? '—'}</dd>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <dt className="text-slate-500">User Hash</dt>
              <dd className="mt-0.5 truncate font-mono text-slate-700" title={profile?.hash}>
                {profile?.hash ?? '—'}
              </dd>
            </div>
          </dl>
        )}
      </section>

      <section className="card space-y-3 border-red-200">
        <h2 className="border-b pb-2 text-sm font-bold text-red-700">Danger Zone</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Delete this account</p>
            <p>Permanently removes your account ({userId}) from the HSE chat server.</p>
          </div>
          <button onClick={() => setConfirmOpen(true)} disabled={deleting} className="btn-danger">
            Delete Account
          </button>
        </div>
      </section>

      {confirmOpen && (
        <Modal title="Delete account?" onClose={() => setConfirmOpen(false)}>
          <div className="space-y-4 text-xs text-slate-600">
            <p>
              Are you sure you want to permanently delete the account{' '}
              <b className="font-mono text-slate-900">{userId}</b>? This action calls{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">deregister</code> on the server and cannot
              be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={deleting} className="btn-secondary text-xs">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="btn-danger">
                {deleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
