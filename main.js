const { app, BrowserWindow, session } = require('electron');
const electronServe = require('electron-serve');
const serve = electronServe.default || electronServe;
const path = require('path');

const loadURL = serve({ directory: 'out' });

let mainWindow;

app.on('ready', () => {
    // Configure safe Content Security Policy
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' https: data:; connect-src 'self' https: data:;"]
            }
        });
    });

    mainWindow = new BrowserWindow({
        width: 420,
        height: 850,
        minWidth: 360,
        minHeight: 700,
        title: "Kurd Fit",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`did-fail-load: ${errorCode} - ${errorDescription} at ${validatedURL}`);
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer Console] ${message} (${sourceId}:${line})`);
    });

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('did-finish-load successful');
    });

    loadURL(mainWindow).catch(err => {
        console.error('loadURL error:', err);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
