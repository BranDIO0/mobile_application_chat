import { useState } from 'react';
import type { ApiResponse } from '../types';
import { RegisterStep } from '../components/test/RegisterStep';
import { TokenStep } from '../components/test/TokenStep';
import { ValidateStep } from '../components/test/ValidateStep';
import { ErrorCodeStep } from '../components/test/ErrorCodeStep';

interface ApiTestPageProps {
  userId: string;
  setUserId: (id: string) => void;
  token: string | null;
  setToken: (token: string) => void;
}

/** Exercise "Gemeinsamer API-Test": the four steps from the lecture. */
export function ApiTestPage({ userId, setUserId, token, setToken }: ApiTestPageProps) {
  const [lastResponse, setLastResponse] = useState<ApiResponse | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <RegisterStep userId={userId} setUserId={setUserId} onToken={setToken} onResponse={setLastResponse} />
        <TokenStep token={token} lastResponse={lastResponse} />
        <ValidateStep token={token} />
      </div>
      <ErrorCodeStep userId={userId} loggedIn={!!token} />
    </div>
  );
}
