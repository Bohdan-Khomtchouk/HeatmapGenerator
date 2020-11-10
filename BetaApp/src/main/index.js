'use strict'

import { app, BrowserWindow } from 'electron'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
let workerWindow
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

const { ipcMain } = require('electron')

function createWindow () {
  /**
   * Initial window options
   */
  function sendWindowMessage (targetWindow, message, payload) {
    if (typeof targetWindow === 'undefined') {
      console.log('Target window does not exist')
      return
    }
    targetWindow.webContents.send(message, payload)
  }
  ipcMain.on('message-from-worker', (event, arg) => {
    console.log('message sent from worker to main')
    sendWindowMessage(mainWindow, 'message-from-worker', arg)
  })
  ipcMain.on('message-from-main', (event, arg) => {
    console.log('message sent from main to worker')
    sendWindowMessage(workerWindow, 'message-from-main', arg)
  })
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      enableRemoteModule: true
      // , devTools: false
    },
    title: 'Heatmap Generator',
    show: false
  })
  mainWindow.loadURL(winURL)
  mainWindow.on('ready-to-show', function () {
    mainWindow.show()
    mainWindow.focus()
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  // create hidden worker window
  /*
  workerWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      enableRemoteModule: true,
      devTools: true
    }
  })
  let path = require('path')
  let workerURL = 'file://' + path.resolve(__dirname, '../renderer/custom/worker.html')
  console.log('workerURL: ' + workerURL)
  workerWindow.loadURL(workerURL)

  workerWindow.on('ready-to-show', function () {
    workerWindow.show()
    workerWindow.focus()
  })
  workerWindow.on('closed', () => {
    workerWindow = null
  }) */
}

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096')
app.allowRendererProcessReuse = false
app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
