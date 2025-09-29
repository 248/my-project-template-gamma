import type { Metadata } from 'next';
import './globals.css';

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
      <body className="min-h-screen bg-gray-50">
        <div className="min-h-screen flex flex-col">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900">
                    Template Gamma
                  </h1>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="bg-white border-t">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <p className="text-center text-sm text-gray-500">
                © 2024 Template Gamma. Next.js 15.5.2 + React 19.0.0 +
                Cloudflare Workers
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
