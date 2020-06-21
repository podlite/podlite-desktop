
import { App } from './app'
const {  app, Menu  } = require('electron')


function menuLabel(label) {
    if (process.platform === 'darwin') {
      return label.replace('&', '')
    }
    return label
  }


  export default function setMainMenu(mainApp:App){


    const template = [
        {
          label: menuLabel('&File'),
          submenu: [
            {
              label: menuLabel('&Open'),
              accelerator: 'CmdOrCtrl+O',
              click(model, item, win) {
                mainApp.openFileDialog(win)
              },
              {
                label: menuLabel('&OpenDev'),
                accelerator: 'CmdOrCtrl+D',
                click(model, item, win) {
                  item.webContents.openDevTools({ mode: 'detach' })
                },
                
            },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            // { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'delete' },
            { role: 'selectall' },
          ],
        },
        {
          label: 'View',
          submenu: [
            { role: 'reload' },
            { role: 'forcereload' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
          ],
        },
      ]
      
      if (process.platform === 'darwin') {
        template.unshift({
          label: 'app.name',
          submenu: [
            // {
            //   label: `About ${app.name}`,
            //   click: () =>{ },
            // },
            { type: 'separator' },
            // { role: 'services', submenu: [] },
            { type: 'separator' },
            // {
            //   label: 'Hide',
            //   accelerator: 'CmdOrCtrl+H',
            // //   click: () => { mainWindow.hide() }
            // },
            { role: 'hideothers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        })
      
        // // Window menu
        // template[3].submenu = [
        //   { role: 'close' },
        //   { role: 'minimize' },
        //   { role: 'zoom' },
        //   { type: 'separator' },
        //   { role: 'front' },
        // ]
      }


    
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }