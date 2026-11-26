import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-heading', display: 'swap', weight: ['500', '700', '800'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap', weight: ['400', '500', '600'] });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap', weight: ['400', '600'] });

export const metadata: Metadata = {
  title: { default: 'VerSolutions Console', template: '%s · VerSolutions Console' },
  description: 'VerSolutions internal console for FitOps gyms, billing and support.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
