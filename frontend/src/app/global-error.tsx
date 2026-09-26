'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#FAFAF9', color: '#1C1917' }}>
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16, textAlign: 'center' }}>
          <div>
            <h1 style={{ fontSize: 24 }}>حدث خطأ غير متوقع</h1>
            <p style={{ color: '#57534E' }}>حاول تحديث الصفحة.</p>
            <button
              onClick={reset}
              style={{ minHeight: 44, padding: '0 20px', borderRadius: 12, border: 0, background: '#047857', color: '#fff', fontSize: 16, cursor: 'pointer' }}
            >
              إعادة المحاولة
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
