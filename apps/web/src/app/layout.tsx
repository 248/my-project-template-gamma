import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Template Gamma',
  description: 'Next.js 15.5.2 + React 19.0.0 template for Cloudflare Workers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
