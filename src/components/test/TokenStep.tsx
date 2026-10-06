import type { ApiResponse } from '../../types';
import { StepCard } from './StepCard';

interface TokenStepProps {
  token: string | null;
  lastResponse: ApiResponse | null;
}

/** Step 2: show the token and the raw server response. */
export function TokenStep({ token, lastResponse }: TokenStepProps) {
  return (
    <StepCard step={2} title="Note token">
      {token ? (
        <div className="break-all rounded-lg border border-emerald-300 bg-emerald-50 p-2 font-mono text-xs select-all">
          {token}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-slate-400">
          No token yet – run step 1.
        </p>
      )}

      {lastResponse && (
        <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs">
          {JSON.stringify(lastResponse, null, 2)}
        </pre>
      )}
    </StepCard>
  );
}
