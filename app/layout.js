import './globals.css'

export const metadata = {
  title: 'Calorify AI Tracker',
  description: 'AI powered calorie tracker with Dark Glassmorphism UI',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ku" dir="rtl">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Calorify AI" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#030014" />
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' https: data:; connect-src 'self' https: data:;" />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('KurdFit Service Worker active:', reg.scope);
                  }).catch(function(err) {
                    console.debug('Service Worker reg notice:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
