'use strinct'

import { EventEmitter } from 'events'
import { BrowserWindow, dialog, OpenDialogOptions } from 'electron'
import { Window, WindowConfig } from './window'

import { app } from 'electron'
import * as path from 'path'
const fs = require('fs')
export class App extends EventEmitter {
  private storePath: string
  public windowsPull: WindowsPull
  public quitting: boolean
  public openInPreview: boolean

  constructor() {
    super()
    this.storePath = path.join(app.getPath('userData'), 'storage')
    fs.mkdirSync(this.storePath, { recursive: true })
    this.windowsPull = new WindowsPull()
    this.quitting = false
    this.openInPreview = false
    app.once('before-quit', () => {
      this.quitting = true
    })
  }

  async run() {
    // restore windows
    const tmpstate = (await this.load('app.json')) || { windows: [] }
    this.openInPreview = tmpstate.openInPreview || false
    if (tmpstate.windows.length < 1 && this.windowsPull.all().length < 1) {
      this.createWindow({ id: 0 })
    } else {
      tmpstate.windows.map(async opt => this.openFile(opt, true))
    }
    const runState = await this.windowsPull.getState()
    await this.store('app.json', { ...runState, openInPreview: this.openInPreview })
  }
  // call when app is closing
  async stop() {
    console.log('Save state before close')
    const state = await this.windowsPull.getState()
    await this.store('app.json', { ...state, openInPreview: this.openInPreview })
  }

  pathForKey(key) {
    return path.join(this.storePath, key)
  }

  store(name, object) {
    console.log(`store ${name}`)
    return new Promise((resolve, reject) => {
      fs.writeFile(this.pathForKey(name), JSON.stringify(object), 'utf8', error => (error ? reject(error) : resolve(0)))
    })
  }

  async openFile(options: WindowConfig, isSkipSaveState: boolean = false) {
    if (!options.filePath) {
      return this.createWindow(options, isSkipSaveState)
    }
    const win = this.windowsPull.findByFilePath(options.filePath)
    if (win && win.isExist()) {
      return win.browserWindow.focus()
    } else {
      // Restore per-file editorState from app.json if not provided
      if (!options.editorState && options.filePath) {
        const saved = await this.load('app.json')
        if (saved && saved.windows) {
          const match = saved.windows.find(w => w.filePath === options.filePath)
          if (match && match.editorState) {
            options.editorState = match.editorState
          }
        }
      }
      options.openInPreview =
        options?.editorState && 'isPreviewMode' in options.editorState
          ? options.editorState.isPreviewMode
          : this.openInPreview
      if (options.win?.webContents) {
        const destWin = this.windowsPull.all().find(item => item.browserWindow === options.win)
        if (!destWin) {
          return this.createWindow(options, isSkipSaveState)
        }
        destWin.loadFile(options.filePath, this.openInPreview)
      } else {
        return this.createWindow(options, isSkipSaveState)
      }
    }
  }

  async createWindow(options: WindowConfig, isSkipSaveState: boolean = false) {
    let id = options.id || this.windowsPull.getNextId()
    const win = new Window({ ...options, id })
    this.windowsPull.add(win)
    win.browserWindow.once('closed', async () => {
      console.log('before Closed quitting:' + this.quitting)
    })
    win.browserWindow.once('close', async () => {
      console.log('Close quitting:' + this.quitting)
      console.log('Close' + id)
      if (!this.quitting) {
        await this.closeWindow(win)
      }
    })
    if (!isSkipSaveState) {
      const createState = await this.windowsPull.getState()
      await this.store('app.json', { ...createState, openInPreview: this.openInPreview })
    }
  }

  async closeWindow(win: Window) {
    this.windowsPull.remove(win)
    const state = await this.windowsPull.getState()
    console.log({ 'this.windowsPull.getState()': state })
    await this.store('app.json', { ...state, openInPreview: this.openInPreview })
  }

  async load(name): Promise<{ windows: Array<WindowConfig> }> {
    const statePath = this.pathForKey(name)
    try {
      const data = fs.readFileSync(statePath, 'utf8').toString()
      return JSON.parse(data)
    } catch (e) {
      console.warn(console.warn(`Error reading state file: ${statePath}`, e.stack, e))
      return null
    }
  }

  openFileDialog(win: BrowserWindow) {
    const dialogOptions = {
      // title: 'Select pod file',
      properties: ['openFile'],
      // filters: [
      //   // {
      //   //   name: 'Pod6',
      //   //   extensions: ['*'],
      //   // },
      //   {
      //     name: 'All files',
      //     extensions: ['*'],
      //   },
      // ],
    } as OpenDialogOptions
    dialog.showOpenDialog(win, dialogOptions).then(({ filePaths }) => {
      if (!Array.isArray(filePaths) || !filePaths.length) {
        return
      }
      this.openFile({ filePath: filePaths[0], win }).then()
    })
  }

  openImportMakdownDialog(win: BrowserWindow) {
    const dialogOptions = {
      title: 'Select Markdown file',
      properties: ['openFile'],
      filters: [
        {
          name: 'Markdown',
          extensions: ['md', 'mkdn', 'mkd', 'mdown', 'markdown'],
        },
      ],
    } as OpenDialogOptions
    dialog.showOpenDialog(dialogOptions).then(({ filePaths }) => {
      if (!Array.isArray(filePaths) || !filePaths.length) {
        return
      } //
      this.openFile({ id: 0, type: 'importMarkdown', filePath: filePaths[0] }).then()
    })
  }
}

export class WindowsPull {
  private windows: Array<Window>
  constructor() {
    this.windows = []
  }

  findByFilePath(filePath: string) {
    return this.windows.find(win => win.filePath === filePath)
  }
  getWinByBrowserWindow(win: BrowserWindow) {
    return this.windows.find(item => item.browserWindow === win)
  }
  async getState(): Promise<{ windows: Array<WindowConfig> }> {
    const windows = await Promise.all(
      this.all().map(async item => {
        let editorState = undefined
        try {
          editorState = await item.browserWindow.webContents.executeJavaScript(
            'window.__podliteEditorState || undefined',
          )
        } catch (e) {
          // Window may be closing or destroyed
        }
        return {
          id: item.id,
          filePath: item.filePath,
          bounds: item.browserWindow.getBounds(),
          isMaximized: item.browserWindow.isMaximized(),
          isFullScreen: item.browserWindow.isFullScreen(),
          editorState,
        }
      }),
    )
    return { windows }
  }
  remove(win) {
    const currentIndex = this.windows.indexOf(win)
    if (currentIndex > -1) {
      return this.windows.splice(currentIndex, 1)
    }
  }
  add(win) {
    this.remove(win)
    return this.windows.unshift(win)
  }
  all() {
    return this.windows
  }
  getNextId() {
    let id: number = 1
    while (this.windows.filter(item => item.id === id).length) {
      id++
    }
    return id
  }
}
