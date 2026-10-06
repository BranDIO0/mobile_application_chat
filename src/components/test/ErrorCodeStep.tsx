import { useState } from 'react';
import { ApiError } from '../../api/client';
import { chatApi } from '../../api/chatApi';
import { ERROR_CODES } from '../../types';
import { StepCard } from './StepCard';

interface TestCase {
  code: number;
  label: string;
  run: () => Promise<unknown>;
  /** Only safe once the own account exists (otherwise it would be created). */
  requiresLogin?: boolean;
}

/**
 * Only test cases that can never create an account on the server:
 * invalid id format, re-registering the own (existing) user, login errors and an invalid token.
 */
function buildTestCases(userId: string): TestCase[] {
  return [
    { code: 451, label: 'Invalid user id', run: () => chatApi.register('invalid', 'secret123', 'Nick', 'Name') },
    {
      code: 452,
      label: 'Register own user again',
      run: () => chatApi.register(userId, 'secret123', 'Nick', 'Name'),
      requiresLogin: true,
    },
    { code: 454, label: 'Unknown user', run: () => chatApi.login('zzzzit99', 'secret123') },
    { code: 455, label: 'Wrong password', run: () => chatApi.login(userId, 'definitely-wrong') },
    { code: 456, label: 'Invalid token', run: () => chatApi.logout('invalid-token') },
  ];
}

/** Step 4: trigger error codes and show their meaning. */
export function ErrorCodeStep({ userId, loggedIn }: { userId: string; loggedIn: boolean }) {
  const [result, setResult] = useState<{ expected: number; received: number; message: string } | null>(null);

  const runTest = async ({ code, run }: TestCase) => {
    try {
      await run();
      setResult({ expected: code, received: 200, message: 'No error returned' });
    } catch (e) {
      const received = e instanceof ApiError ? e.code : 0;
      setResult({ expected: code, received, message: (e as Error).message });
    }
  };

  return (
    <StepCard step={4} title="Interpret errors">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {buildTestCases(userId).map((test) => (
          <button
            key={test.code}
            onClick={() => runTest(test)}
            disabled={test.requiresLogin && !loggedIn}
            title={test.requiresLogin && !loggedIn ? 'Register / login first' : undefined}
            className="rounded-lg border p-2 text-left text-xs hover:bg-slate-50 disabled:opacity-40"
          >
            <div className="font-mono font-bold text-blue-600">{test.code}</div>
            <div className="text-slate-500">{test.label}</div>
          </button>
        ))}
      </div>

      {result && (
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <b>Received HTTP {result.received}</b> (expected {result.expected}) – {ERROR_CODES[result.received] ?? result.message}
        </div>
      )}

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer">All error codes</summary>
        <ul className="mt-2 space-y-1">
          {Object.entries(ERROR_CODES).map(([code, text]) => (
            <li key={code}>
              <span className="font-mono font-bold">{code}</span> – {text}
            </li>
          ))}
        </ul>
      </details>
    </StepCard>
  );
}
