import { Suspense } from 'react';

import LoginClient from './LoginClient';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6 md:p-10">
          <div className="card-elevated p-6 md:p-8">Загрузка…</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}

