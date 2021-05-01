'use strict'

import { EventEmitter } from "events"
import { BrowserWindow, Rectangle } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const { resolve } = require('app-root-path')
const { format } = require('url')
const isDev = require('electron-is-dev')

export interface WindowConfig {
  filePath? : string,
  id: number,
  type?: 'open'|'importMarkdown'
  bounds?: Rectangle,
  isMaximized?: boolean,
  isFullScreen?:boolean,
}
export class Window extends EventEmitter {
    public browserWindow:BrowserWindow 
    public id:number
    public filePath: string
    public type: string
   
    constructor( options: WindowConfig ) {
      super()
      this.id = options.id
      this.filePath = options.filePath
      this.type = options.type || 'open'
      const windowTitle = options.filePath ? path.parse( options.filePath )['name'] : "[new]"
      this.browserWindow = new BrowserWindow({
        webPreferences: {
          preload: resolve('build/client-api.js'),
          nodeIntegration: true,
          spellcheck: true,
          webSecurity: false,
          enableRemoteModule: true
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
        this.browserWindow.maximize();
      }
      if (options.isFullScreen) {
        this.browserWindow.setFullScreen(true);
      }
      const devPath = 'http://localhost:1124/?id=' + this.id
      const prodPath = format({
      pathname: resolve('build/index.html'),
      protocol: 'file:',
      slashes: true,
      query: {
        id: this.id
      }
    })
    const url = isDev ? devPath : prodPath
    this.browserWindow.loadURL(url)
  /**
    this.browserWindow.on('close', () => {
      // mainWindow = null
      console.log("close window: "  + this.id) //   + mainWindow.id)
     })
   
    this.browserWindow.on('closed', () => {
     // mainWindow = null
     console.log("closed window: " ) //   + mainWindow.id)
    })
    */
    const sendFile = (filePath) => {
      console.log('send ' + filePath)
      this.browserWindow.webContents.send('file', { content: fs.readFileSync(filePath, { encoding: 'utf8' }), filePath})
    }
    const importMarkdownFile = (filePath) => {
      this.browserWindow.webContents.send('importMarkdown', { content: fs.readFileSync(filePath, { encoding: 'utf8' })})
    }
    this.browserWindow.webContents.on('before-input-event', (event, input) => {
      if (
          input.control &&
          input.alt && !input.meta && input.isAutoRepeat &&
          input.type === 'keyDown' && input.code === 'KeyO') {
         if (!this.browserWindow.webContents.isDevToolsOpened()) {
          this.browserWindow.webContents.openDevTools({ mode: 'detach' })
        }
      }
    })
    this.browserWindow.webContents.on('did-finish-load', () => { 
        console.log('did-finish-load'); 
        switch (this.type) {
          case 'open':
            if (this.filePath) { sendFile(this.filePath) } ;
            break;
          case 'importMarkdown':
              console.log('importMarkdown ' + this.filePath);
              importMarkdownFile(this.filePath);
              break;
              break;
          default:
            break;
        }
      }
    )
    this.browserWindow.webContents.on('save-file', () => {console.log('webContents.save-file')})

    }

  }
