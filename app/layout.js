import './globals.css'

export const metadata = {
  title: 'BQ GYM',
  description: 'BQ GYM - Smart Fitness & Nutrition Coach',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ku" dir="rtl">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BQ GYM" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#030014" />
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http: capacitor:; img-src 'self' data: blob: https: http: capacitor:; media-src 'self' data: blob: https: http: capacitor:; font-src 'self' https: http: data: capacitor:; connect-src 'self' https: http: data: blob: capacitor: wss:;" />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // 1. Strictly prevent all pinch-to-zoom, double-tap zoom, and gesture zoom on iOS WKWebView
                var preventZoom = function(e) {
                  if (e.touches && e.touches.length > 1) {
                    e.preventDefault();
                  }
                };
                var preventGesture = function(e) {
                  e.preventDefault();
                };
                document.addEventListener('gesturestart', preventGesture, { passive: false });
                document.addEventListener('gesturechange', preventGesture, { passive: false });
                document.addEventListener('gestureend', preventGesture, { passive: false });
                document.addEventListener('touchstart', preventZoom, { passive: false });
                document.addEventListener('touchmove', preventZoom, { passive: false });

                var lastTouchEnd = 0;
                document.addEventListener('touchend', function(e) {
                  var now = Date.now();
                  if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                  }
                  lastTouchEnd = now;
                }, { passive: false });

                document.addEventListener('wheel', function(e) {
                  if (e.ctrlKey) e.preventDefault();
                }, { passive: false });

                // 2. Unregister stale service workers & clear old static HTML/JS caches so updates apply immediately
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var i = 0; i < regs.length; i++) {
                      regs[i].unregister();
                    }
                  }).catch(function() {});
                }
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (var j = 0; j < names.length; j++) {
                      if (names[j].indexOf('static') !== -1 || names[j].indexOf('kurdfit') !== -1) {
                        caches.delete(names[j]);
                      }
                    }
                  }).catch(function() {});
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
