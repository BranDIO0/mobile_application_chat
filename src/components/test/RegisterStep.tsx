import { useState } from 'react';
import { ApiError } from '../../api/client';
import { chatApi } from '../../api/chatApi';
import type { ApiResponse } from '../../types';
import { StepCard } from './StepCard';

interface RegisterStepProps {
  userId: string;
  setUserId: (id: string) => void;
  onToken: (token: string) => void;
  onResponse: (res: ApiResponse) => void;
}

/** Step 1: register (or login if the user already exists → 452). */
export function RegisterStep({ userId, setUserId, onToken, onResponse }: RegisterStepProps) {
  const [form, setForm] = useState({ password: '', nickname: 'Jae', fullname: 'Jae Student' });
  const [lastCode, setLastCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  /** Shared handler for register and login. */
  const authenticate = async (call: () => Promise<ApiResponse>) => {
    setLoading(true);
    try {
      const res = await call();
      setLastCode(200);
      onResponse(res);
      if (res.token) onToken(res.token);
    } catch (e) {
      const res = e instanceof ApiError ? e.response : { status: 'error' as const, code: 0, message: String(e) };
      setLastCode(res.code);
      onResponse(res);
    } finally {
      setLoading(false);
    }
  };

  const register = () => authenticate(() => chatApi.register(userId, form.password, form.nickname, form.fullname));
  const login = () => authenticate(() => chatApi.login(userId, form.password));

  return (
    <StepCard step={1} title="Register">
      <label className="block text-xs text-slate-600">
        User ID (HSE login)
        <input value={userId} onChange={(e) => setUserId(e.target.value)} className="input font-mono" />
      </label>
      <label className="block text-xs text-slate-600">
        Password (min. 6, <b>not</b> your real HE password)
        <input type="password" value={form.password} onChange={update('password')} className="input" />
      </label>
      <label className="block text-xs text-slate-600">
        Nickname
        <input value={form.nickname} onChange={update('nickname')} className="input" />
      </label>
      <label className="block text-xs text-slate-600">
        Full name
        <input value={form.fullname} onChange={update('fullname')} className="input" />
      </label>

      <div className="flex gap-2">
        <button onClick={register} disabled={loading} className="btn-primary flex-1">
          Register
        </button>
        <button onClick={login} disabled={loading} className="btn-secondary flex-1">
          Login
        </button>
      </div>

      {lastCode === 452 && (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          452: User already exists → click <b>Login</b>.
        </p>
      )}
    </StepCard>
  );
}
