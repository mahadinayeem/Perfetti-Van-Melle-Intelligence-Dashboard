import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Perfetti Van Melle - MT Visit Status & SFA Report Portal',
  description: 'Live Modern Trade Visit Status & Operations Dashboard for Perfetti Van Melle Bangladesh',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
