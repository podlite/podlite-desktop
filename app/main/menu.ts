import { App } from './app'
const { app, Menu } = require('electron')
import { MenuItemConstructorOptions, shell, BrowserWindow } from 'electron'
import { is } from 'electron-util'
import openAboutWindow from 'about-window'
import { version } from '@podlite/schema'
const join = require('path').join

const BUG_REPORT_URL = 'https://github.com/podlite/podlite-desktop/issues'
const HOME_PAGE = 'https://github.com/podlite/podlite-desktop'
const RELEASE_PAGE = 'https://github.com/podlite/podlite-desktop/releases'
const QUICK_TOUR_PAGE = 'https://podlite.org/quick-tour'
const SPECIFICATION_PAGE = 'https://podlite.org/specification'

function menuLabel(label) {
  if (process.platform === 'darwin') {
    return label.replace('&', '')
  }
  return label
}
const openAbout = () => {
  openAboutWindow({
    icon_path: join(__dirname, 'icon.png'),
    copyright: `Copyright (c) 2020-2025 Alexandr Zahatski, https://podlite.org <br/><p style="text-align:center">@podlite/schema: ${version}</p>`,
    package_json_dir: join(__dirname, '..'),
    about_page_dir: join(__dirname, '..', 'vendors', 'about-window'),
    bug_report_url: BUG_REPORT_URL,
    homepage: HOME_PAGE,
    adjust_window_size: true,
    use_inner_html: true,
    use_version_info: false,
    win_options: {
      //@ts-ignore
      webSecurity: false,
    },
  })
}
export default function setMainMenu(mainApp: App) {
  const appMenu: MenuItemConstructorOptions = {
    label: app.name,
    submenu: [
      {
        label: `About ${app.name}`,
        click(): void {
          openAbout()
        },
      },
      { type: 'separator' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  }
  const fileMenu: MenuItemConstructorOptions = {
    label: menuLabel('&File'),
    submenu: [
      {
        label: menuLabel('&New'),
        accelerator: 'CmdOrCtrl+N',
        click(item, win, event) {
          mainApp.createWindow({})
        },
      },
      {
        label: menuLabel('&Open'),
        accelerator: 'CmdOrCtrl+O',
        click(item, win, event) {
          mainApp.openFileDialog(win)
        },
      },
      {
        label: menuLabel('&Save'),
        accelerator: 'CmdOrCtrl+S',
        click(item, win, event): void {
          if (item) win.webContents.send('menu-file-save')
        },
      },
      {
        label: menuLabel('&Save as'),
        accelerator: 'CmdOrCtrl+Shift+S',
        click(item, win, event): void {
          if (item) win.webContents.send('menu-file-save-as')
        },
      },

      { type: 'separator' },
      {
        label: menuLabel('&Import from...'),
        submenu: [
          {
            label: menuLabel('&Markdown'),
            click(item, win, event) {
              //@ts-ignore
              mainApp.openImportMakdownDialog(win)
            },
          },
        ],
      },
      {
        label: menuLabel('&Export to...'),
        submenu: [
          {
            label: menuLabel('&Html'),
            click(item, win, event) {
              if (win) win.webContents.send('exportHtml')
            },
          },
          {
            label: menuLabel('&Pdf'),
            click(item, win, event) {
              if (win) win.webContents.send('exportPdf')
            },
          },
        ],
      },
      { type: 'separator' },
      {
        label: menuLabel('&Close Window'),
        accelerator: 'CmdOrCtrl+W',
        click(_item, win): void {
          const window = BrowserWindow.getFocusedWindow()
          if (window !== null) {
            window.close()
          }
        },
      },
    ],
  }

  const helpMenu: MenuItemConstructorOptions = {
    role: 'help',
    submenu: [
      {
        label: 'Website',
        click(): void {
          shell.openExternal(HOME_PAGE)
        },
      },
      {
        label: 'Release notes',
        click(): void {
          shell.openExternal(RELEASE_PAGE)
        },
      },
      {
        label: 'Podlite Quick Tour',
        click(): void {
          shell.openExternal(QUICK_TOUR_PAGE)
        },
      },
      {
        label: 'Podlite Specification',
        click(): void {
          shell.openExternal(SPECIFICATION_PAGE)
        },
      },

      { type: 'separator' },
      {
        label: menuLabel('&Open DevTools'),
        click(item, win, event) {
          win.webContents.openDevTools({ mode: 'detach' })
        },
      },

      {
        label: 'Report an Issue...',
        click(): void {
          shell.openExternal(BUG_REPORT_URL)
        },
      },
    ],
  }

  const editMenu: MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'delete' },
      { role: 'selectAll' },
    ],
  }

  const viewMenu: MenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      {
        label: menuLabel('&Toggle Preview'),
        accelerator: 'CmdOrCtrl+\\',
        click(item, win, event): void {
          if (win) win.webContents.send('view-preview-toggle')
        },
      },
      {
        label: menuLabel('&Toggle Half Preview'),
        accelerator: 'CmdOrCtrl+.',
        click(item, win, event): void {
          if (win) win.webContents.send('view-halfpreview-toggle')
        },
      },
    ],
  }
  if (!is.macos) {
    ;(helpMenu.submenu as MenuItemConstructorOptions[]).push({
      label: `About ${app.name}`,
      click(): void {
        openAbout()
      },
    })
  }

  const template: MenuItemConstructorOptions[] = [
    ...(is.macos ? [appMenu] : []),
    fileMenu,
    editMenu,
    viewMenu,
    helpMenu,
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
