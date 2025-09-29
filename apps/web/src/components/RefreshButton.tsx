'use client';

export default function RefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="btn btn-secondary"
    >
      再チェック
    </button>
  );
}
