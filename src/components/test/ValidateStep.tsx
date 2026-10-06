import { useState } from 'react';
import { chatApi } from '../../api/chatApi';
import { StepCard } from './StepCard';

/** Step 3: validate the token. The server intentionally answers after ~1 s. */
export function ValidateStep({ token }: { token: string | null }) {
  const [result, setResult] = useState<{ message: string; ms: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    if (!token) return;
    setLoading(true);
    const start = performance.now();
    try {
      const res = await chatApi.validateToken(token);
      setResult({ message: res.message, ms: Math.round(performance.now() - start) });
    } catch (e) {
      setResult({ message: (e as Error).message, ms: Math.round(performance.now() - start) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepCard step={3} title="Validate token">
      <p className="text-xs text-slate-500">Expected: "Token valid" after ~1 s.</p>

      {result && (
        <div className="rounded-lg bg-slate-50 p-2 text-xs">
          <b>"{result.message}"</b> <span className="text-slate-500">({result.ms} ms)</span>
        </div>
      )}

      <button onClick={validate} disabled={!token || loading} className="btn-primary w-full">
        {loading ? 'Waiting…' : 'Validate'}
      </button>
    </StepCard>
  );
}
