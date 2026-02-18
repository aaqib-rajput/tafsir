import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tafsir Session Manager',
  description: 'Tafsir session attendance and speaker management app',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
