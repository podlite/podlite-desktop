'use strict'

import { BrowserWindow, Rectangle } from 'electron'
import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'

const { format } = require('url')
const isDev = require('electron-is-dev')

export interface EditorSessionState {
  cursorOffset?: number
  scrollTop?: number
  foldedRanges?: Array<{ from: number; to: number }>
  isPreviewMode?: boolean
  isHalfPreviewMode?: boolean
}

export interface WindowConfig {
  filePath?: string
  id?: number
  type?: 'open' | 'importMarkdown'
  bounds?: Rectangle
  isMaximized?: boolean
  isFullScreen?: boolean
  editorState?: EditorSessionState
  openInPreview?: boolean
  win?: BrowserWindow
}
export class Window extends EventEmitter {
  public browserWindow: BrowserWindow
  public id: number
  public filePath: string
  public type: string
  public editorState: EditorSessionState | undefined
  public openInPreview: boolean
  private fileWatcher: fs.FSWatcher | null = null
  private ignoreSaveUntil: number = 0

  constructor(options: WindowConfig) {
    super()
    this.id = options.id
    //@ts-ignore
    this.filePath = options.filePath
    this.type = options.type || 'open'
    this.editorState = options.editorState
    this.openInPreview = options.openInPreview || false
    const windowTitle = options.filePath ? path.parse(options.filePath)['name'] : '[new]'
    this.browserWindow = new BrowserWindow({
      webPreferences: {
        preload: `${__dirname}/client-api.js`,
        nodeIntegration: true,
        contextIsolation: false,
        spellcheck: true,
        webSecurity: false,
        enableRemoteModule: true,
      },
      x: options.bounds?.x,
      y: options.bounds?.y,
      height: options.bounds?.height,
      width: options.bounds?.width,
      minHeight: 600,
      minWidth: 800,
      title: windowTitle,
    })

    if (options.isMaximized) {
      this.browserWindow.maximize()
    }
    if (options.isFullScreen) {
      this.browserWindow.setFullScreen(true)
    }
    const devPath = 'http://localhost:1124/?id=' + this.id
    const prodPath = format({
      pathname: `${__dirname}/index.html`,
      protocol: 'file:',
      slashes: true,
      query: {
        id: this.id,
      },
    })
    const url = isDev ? devPath : prodPath
    this.browserWindow.loadURL(url)

    // Handle window close event to check for unsaved changes
    this.browserWindow.on('close', async e => {
      console.log('window close event')
      e.preventDefault()

      // Request current state from renderer
      const hasUnsavedChanges = await this.browserWindow.webContents.executeJavaScript(
        'window.__podliteHasUnsavedChanges || false',
      )
      const currentFilePath = await this.browserWindow.webContents.executeJavaScript(
        'window.__podliteCurrentFilePath || ""',
      )

      // Check if there are unsaved changes
      if (hasUnsavedChanges) {
        const { dialog } = require('electron')
        const confirmResult = await dialog.showMessageBox(this.browserWindow, {
          type: 'warning',
          buttons: ['Save', 'Discard', 'Cancel'],
          defaultId: 0,
          cancelId: 2,
          message: 'The current file has unsaved changes.',
          detail: 'Do you want to save it before closing?',
        })

        if (confirmResult.response === 2) {
          // Cancel - don't close
          return
        } else if (confirmResult.response === 0) {
          // Save before closing
          const { ipcMain } = require('electron')
          await new Promise<void>(resolve => {
            const saveHandler = (_event: any, data: any) => {
              if (data.filePath === currentFilePath || !currentFilePath) {
                ipcMain.off('file-saved-confirmation', saveHandler)
                resolve()
              }
            }
            ipcMain.on('file-saved-confirmation', saveHandler)
            this.browserWindow.webContents.send('menu-file-save')
          })
        }
        // If response === 1 (Discard), continue to close
      }

      // Clean up file watcher and close the window
      this.unwatchFile()
      this.browserWindow.removeAllListeners('close')
      this.browserWindow.close()
    })

    const importMarkdownFile = filePath => {
      this.browserWindow.webContents.send('importMarkdown', {
        content: fs.readFileSync(filePath, { encoding: 'utf8' }),
      })
    }
    this.browserWindow.webContents.on('before-input-event', (event, input) => {
      if (
        input.control &&
        input.alt &&
        !input.meta &&
        input.isAutoRepeat &&
        input.type === 'keyDown' &&
        input.code === 'KeyO'
      ) {
        if (!this.browserWindow.webContents.isDevToolsOpened()) {
          this.browserWindow.webContents.openDevTools({ mode: 'detach' })
        }
      }
    })
    this.browserWindow.webContents.on('did-finish-load', () => {
      console.log('did-finish-load')
      switch (this.type) {
        case 'open':
          if (this.filePath) {
            this.loadFile(this.filePath, this.openInPreview)
          } else {
            this.loadFile('')
          }
          break
        case 'importMarkdown':
          console.log('importMarkdown ' + this.filePath)
          importMarkdownFile(this.filePath)
          break
          break
        default:
          break
      }
    })
    //@ts-ignore
    this.browserWindow.webContents.on('save-file', () => {
      console.log('webContents.save-file')
    })
  }
  watchFile(filePath: string) {
    this.unwatchFile()
    if (!filePath) return

    let debounceTimer: NodeJS.Timeout | null = null

    // Watch the parent directory, not the file itself. Atomic writes
    // (tmp + rename) replace the target's inode; a file-level watcher
    // stays bound to the dangling inode and silently stops firing.
    //
    // Recursive mode lets us notice when files referenced by `=include`
    // (under any subdirectory of the document root) change on disk. The
    // renderer's include cache invalidates per-path so live preview stays
    // in sync with externally edited dependencies.
    const dir = path.dirname(filePath)
    const base = path.basename(filePath)

    const handler = (_eventType: string, changedName: string | Buffer | null) => {
      if (!changedName) return

      // Other-file change → notify renderer so it can invalidate its
      // =include cache for that path. No reload of the current document.
      if (changedName !== base) {
        const absPath = path.resolve(dir, changedName as string)
        this.browserWindow.webContents.send('include-target-changed', { absPath })
        return
      }

      // Ignore changes triggered by our own save (within 2 seconds)
      if (Date.now() < this.ignoreSaveUntil) return

      // Debounce rapid changes (e.g. Syncthing)
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(async () => {
        if (!this.isExist()) return

        try {
          const hasUnsavedChanges = await this.browserWindow.webContents.executeJavaScript(
            'window.__podliteHasUnsavedChanges || false',
          )

          if (!hasUnsavedChanges) {
            // No unsaved changes — silently reload
            const content = fs.readFileSync(filePath, { encoding: 'utf8' })
            this.browserWindow.webContents.send('file-changed-on-disk', { content, filePath })
          } else {
            // Has unsaved changes — ask user
            const { dialog } = require('electron')
            const result = await dialog.showMessageBox(this.browserWindow, {
              type: 'question',
              buttons: ['Reload', 'Keep mine'],
              defaultId: 1,
              message: 'File changed on disk.',
              detail: 'The file has been modified externally. Reload and lose your changes?',
            })
            if (result.response === 0) {
              const content = fs.readFileSync(filePath, { encoding: 'utf8' })
              this.browserWindow.webContents.send('file-changed-on-disk', { content, filePath })
            }
          }
        } catch (e) {
          // Window may be closing
        }
      }, 300)
    }

    try {
      this.fileWatcher = fs.watch(dir, { recursive: true }, handler)
    } catch (err) {
      console.warn('file watcher unavailable; auto-reload disabled:', (err as Error).message)
      this.fileWatcher = null
      return
    }

    this.fileWatcher.on('error', err => {
      console.warn('file watcher error; auto-reload disabled:', err.message)
      this.unwatchFile()
    })
  }

  unwatchFile() {
    if (this.fileWatcher) {
      this.fileWatcher.close()
      this.fileWatcher = null
    }
  }

  // Call before saving to suppress self-triggered watch events
  markSaving() {
    this.ignoreSaveUntil = Date.now() + 2000
  }

  loadFile(filePath: string, openInPreview: boolean = false) {
    if (this.isExist()) {
      if (!filePath) {
        this.filePath = null
        this.browserWindow.webContents.send('file', {
          content: '',
          filePath: '',
        })
      } else {
        try {
          const stat = fs.statSync(filePath)
          if (stat.isDirectory()) return
        } catch (e) {
          return
        }
        this.filePath = filePath
        this.browserWindow.webContents.send('file', {
          content: fs.readFileSync(filePath, { encoding: 'utf8' }),
          filePath,
          editorState: this.editorState,
          openInPreview,
        })
        this.watchFile(filePath)
      }
    }
  }
  isExist() {
    return this.browserWindow && !this.browserWindow.isDestroyed()
  }
}
