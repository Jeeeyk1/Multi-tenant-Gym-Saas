import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Manrope, Inter } from 'next/font/google';
import { UIProviders } from '@/providers/ui-providers';
import './globals.css';

// Headings and large numbers only; Inter carries all other text.
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['500', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'FitOps — Staff',
  description: 'Run your gym: members, check-ins, renewals and community.',
};

const themeScript = `
(function(){try{
  var s=localStorage.getItem('theme');
  var d=window.matchMedia('(prefers-color-scheme:dark)').matches;
  if(s==='dark'||(s===null&&d))document.documentElement.classList.add('dark');
}catch{}})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <UIProviders>{children}</UIProviders>
      </body>
    </html>
  );
}
