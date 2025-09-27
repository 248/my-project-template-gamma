export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Template Gamma</h1>
        <p className="text-lg text-gray-600 mb-8">
          Next.js 15.5.2 + React 19.0.0 + Cloudflare Workers
        </p>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          ログイン
        </button>
      </div>
    </main>
  );
}
