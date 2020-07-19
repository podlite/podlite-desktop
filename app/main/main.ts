import { App } from './app'
const fs = require('fs')
const { BrowserWindow, app,  ipcMain, dialog } = require('electron')
const setMainMenu = require('./menu').default 

// // Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (squirrelStartup) {
//   app.quit();
// }

app.commandLine.appendArgument("enable-transparent-visuals");
app.commandLine.appendArgument("disable-gpu");
app.disableHardwareAcceleration();

ipcMain.on('save-file', async (event, {content, filePath}) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if ( filePath ) {
    fs.writeFileSync(filePath, content)
    event.returnValue = 'pong'
    win.webContents.send('file-saved', {filePath})
    } else {

    const saveDialogResult = await dialog.showSaveDialog(win, {})
    if (saveDialogResult.canceled) {return}
    fs.writeFileSync(saveDialogResult.filePath, content)
    win.webContents.send('file-saved', { filePath: saveDialogResult.filePath })
  }

})

ipcMain.on('open-dev', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.webContents.openDevTools({ mode: 'detach' })
})
ipcMain.on('set-title', (event,title) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.setTitle(title)
})
app.on('save-file', () => console.log('app.save-file'))


app.on('window-all-closed', () => {
      // This is a Window's specific UX pattern
      if (process.platform !== 'darwin') { app.quit() }
      }
)
const mainApp = new App()

let initOpenFileQueue = []
// Attempt to bind file opening #2
app.on('will-finish-launching', () => {
  // Event fired When someone drags files onto the icon while your app is running
  app.on('open-file', (event, file) => {
    if (app.isReady() === false) {
      // dialog.showMessageBox({message: file})
      initOpenFileQueue.push(file)
    } else {
      mainApp.createWindow({id:0, filePath:file})
    }
    event.preventDefault()
  })
})

app.on('ready', () => {
  setMainMenu(mainApp)
  mainApp.run()
  console.log(app.getPath('userData') +'  ' + app.getPath('appData'))
if (initOpenFileQueue.length) {
    initOpenFileQueue.forEach((file) => mainApp.createWindow ({id:0,filePath: file}))
  } else {
   console.log('openFileDialog(undefined, true)')
  //  openFileInReader(undefined, undefined, true)
   // openFileDialog(undefined, true)
  }
})
