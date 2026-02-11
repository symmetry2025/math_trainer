import './globals.css';

import type { ReactNode } from 'react';

import '@fontsource/nunito/400.css';
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';

export const metadata = {
  title: 'Тренажёры по математике',
  description: 'Тренажёры по математике (демо)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <script
          // Set initial theme before paint to avoid flash.
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var keyDark = 'smmtry.dark';
    var savedDark = localStorage.getItem(keyDark);
    var legacy = localStorage.getItem('smmtry_trainer_theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark =
      savedDark === '1' ? true :
      savedDark === '0' ? false :
      legacy === 'dark' ? true :
      legacy === 'light' ? false :
      (prefersDark ? true : false);
    document.documentElement.classList.toggle('dark', !!isDark);
    try { localStorage.setItem(keyDark, isDark ? '1' : '0'); } catch (e) {}
    try { localStorage.setItem('smmtry_trainer_theme', isDark ? 'dark' : 'light'); } catch (e) {}
  } catch (e) {}
})();`,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

