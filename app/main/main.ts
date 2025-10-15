import { App } from './app'
import update from './update'
import log from 'electron-log'
import { protocol, shell } from 'electron'

const fs = require('fs')
const { BrowserWindow, app, ipcMain, dialog } = require('electron')
const setMainMenu = require('./menu').default

// // Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (squirrelStartup) {
//   app.quit();
// }

// https://github.com/electron/electron/issues/15958

if (!process.mas) {
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    app.quit()
  }
}

app.commandLine.appendArgument('enable-transparent-visuals')
app.commandLine.appendArgument('disable-gpu')
app.disableHardwareAcceleration()

ipcMain.on('save-file', async (event, { content, filePath }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (filePath) {
    fs.writeFileSync(filePath, content)
    event.returnValue = 'pong'
    win.webContents.send('file-saved', { filePath })
    // Send confirmation for window close handler
    ipcMain.emit('file-saved-confirmation', event, { filePath })
  } else {
    const saveDialogResult = await dialog.showSaveDialog(win, {})
    if (saveDialogResult.canceled) {
      return
    }
    fs.writeFileSync(saveDialogResult.filePath, content)
    win.webContents.send('file-saved', { filePath: saveDialogResult.filePath })
    // Send confirmation for window close handler
    ipcMain.emit('file-saved-confirmation', event, { filePath: saveDialogResult.filePath })
  }
})

// save windows in new filename
ipcMain.on('save-file-as', async (event, { content, filePath }) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const saveDialogResult = await dialog.showSaveDialog(win, { title: 'Save as' })
  if (saveDialogResult.canceled) {
    return
  }
  fs.writeFileSync(saveDialogResult.filePath, content)
  win.webContents.send('file-saved', { filePath: saveDialogResult.filePath })
})

ipcMain.on('open-dev', event => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.webContents.openDevTools({ mode: 'detach' })
})
ipcMain.on('set-title', (event, title) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.setTitle(title)
})
ipcMain.on('on-open-url', async (event, url: string) => {
  await shell.openExternal(url)
})

// Handle show-save-dialog IPC call
ipcMain.handle('show-save-dialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return await dialog.showSaveDialog(win, options)
})

// Handle show-message-box IPC call
ipcMain.handle('show-message-box', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return await dialog.showMessageBox(win, options)
})

// Handle HTML to PDF conversion
ipcMain.handle('html-to-pdf', async (_event, { htmlData, pdfOptions }) => {
  let pdfWindow = null
  try {
    const htmlEncoded = encodeURIComponent(htmlData)
    pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false, // Required for loading local resources (e.g. images)
      },
    })

    // Set up event listeners BEFORE loading the URL
    await new Promise((resolve, reject) => {
      pdfWindow.webContents.once('did-finish-load', () => {
        resolve(null)
      })
      pdfWindow.webContents.once('did-fail-load', (_event: any, errorCode: number, errorDescription: string) => {
        reject(new Error(`Failed to load HTML: ${errorDescription} (${errorCode})`))
      })
      // Now load the URL
      pdfWindow.loadURL(`data:text/html;charset=UTF-8,${htmlEncoded}`)
    })
    // Generate PDF
    const buffer = await pdfWindow.webContents.printToPDF(pdfOptions)
    return buffer
  } catch (error) {
    log.error('Error generating PDF:', error)
    throw error
  } finally {
    // Clean up the window
    if (pdfWindow && !pdfWindow.isDestroyed()) {
      pdfWindow.close()
    }
  }
})

app.on('save-file', () => console.log('app.save-file'))

app.on('window-all-closed', () => {
  // This is a Window's specific UX pattern
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
const mainApp = new App()

let initOpenFileQueue = []
// Attempt to bind file opening #2
app.on('will-finish-launching', () => {
  // Event fired When someone drags files onto the icon while your app is running
  app.on('open-file', (event, file) => {
    if (app.isReady() === false) {
      initOpenFileQueue.push(file)
    } else {
      mainApp.openFile({ id: 0, filePath: file })
    }
    event.preventDefault()
  })
})

if (process.platform === 'win32') {
  const filePath = process.argv[1]
  if (filePath) initOpenFileQueue.push(filePath)
}

app.on('second-instance', (event, argv) => {
  if (argv[3]) {
    mainApp.openFile({ id: 0, filePath: argv[3] })
  } else {
    log.info('no argv[3]')
    // TODO::
    // lastFocusedWin().focus();
  }
})
const installExtensions = async () => {
  // require('electron-debug')({
  //   showDevTools: true
  // });

  const installer = require('electron-devtools-installer')
  const forceDownload = Boolean(process.env.UPGRADE_EXTENSIONS)
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS']

  for (const name of extensions) {
    try {
      await installer.default(installer[name], forceDownload) // eslint-disable-line babel/no-await-in-loop
    } catch (err) {}
  }
}
app.on('ready', async () => {
  console.log({ 'process.env.NODE_ENV': process.env.NODE_ENV })
  if (process.env.NODE_ENV === 'development') {
    // Install Dev Extensions
    console.log('installExtensions')
    // await installExtensions();
  }

  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''))
    callback(pathname)
  })

  setMainMenu(mainApp)
  mainApp.run()
  if (initOpenFileQueue.length) {
    initOpenFileQueue.forEach(file => mainApp.openFile({ id: 0, filePath: file }, true))
  } else {
    console.log('openFileDialog(undefined, true)')
    //  openFileInReader(undefined, undefined, true)
    // openFileDialog(undefined, true)
  }
  update()
})

app.on('web-contents-created', (event, contents) => {
  const handlerOpenUrl = async (event, urlToOpen) => {
    // Prevent links or window.open from opening new windows
    event.preventDefault()
    const protocol = new URL(urlToOpen).protocol
    if (protocol === 'http:' || protocol === 'https:') {
      await shell.openExternal(urlToOpen)
    }
    if (urlToOpen?.startsWith('file://')) {
      await shell.openExternal(urlToOpen)
    }
  }
  contents.on('new-window', handlerOpenUrl)
  contents.on('will-navigate', handlerOpenUrl)
})

app.once('before-quit', async () => {
  if (mainApp) {
    await mainApp.stop()
  }
})
