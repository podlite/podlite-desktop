'use strinct'

import { EventEmitter } from "events";
import { BrowserWindow, dialog, OpenDialogOptions } from "electron";
import { Window, WindowConfig } from './window'

import { app } from "electron"
import  * as path  from 'path'
const fs = require('fs')
export class App extends EventEmitter {
    private storePath : string
    public windowsPull : WindowsPull
    public quitting: boolean

    constructor(){
        super()
        this.storePath  =  path.join(app.getPath('userData'), 'storage')
        fs.mkdirSync(this.storePath, { recursive: true })
        this.windowsPull = new WindowsPull()
        this.quitting = false
        app.once('before-quit', () => { this.quitting = true })
    }

    async run() {
        // restore windows
        const tmpstate =  await this.load('app.json') || {windows:[]} 
        if (tmpstate.windows.length < 1 && this.windowsPull.all().length < 1 ) { 
            // create window dd
              this.createWindow({id:0})
          } else {
                tmpstate.windows.map(async (opt) => this.createWindow(opt))

          }
          await this.store('app.json', this.windowsPull.getState())
    }

    pathForKey(key) { return path.join(this.storePath, key) }
    
    store(name, object) {
        return new Promise((resolve, reject) => {
          fs.writeFile(this.pathForKey(name), JSON.stringify(object), 'utf8', error =>
            error ? reject(error) : resolve()
          )
        })
      }

    async createWindow( options: WindowConfig, isSkipSaveState:boolean = false ) {
        let id = options.id || this.windowsPull.getNextId()
        const win = new Window( { ...options, id })
        this.windowsPull.add(win)
        win.browserWindow.once('closed', async () => { 
            console.log('before Closed quitting:' + this.quitting)
            })
        win.browserWindow.once('close', async () => {
              console.log('Close quitting:' + this.quitting)
              console.log('Close' + id)
              if (!this.quitting) {
              await this.closeWindow(win) }
        })
        if (!isSkipSaveState) {
          await this.store('app.json', this.windowsPull.getState())
        }
    }

    async closeWindow(win:Window) {
        this.windowsPull.remove(win)
        console.log({'this.windowsPull.getState()':this.windowsPull.getState()})
        await this.store('app.json', this.windowsPull.getState())
    }

    load(name): Promise<{ windows: Array<any>}> {
        return new Promise(resolve => {
          console.log({'this.storePath':this.storePath}) //
          if (!this.storePath) return resolve(null)
          const statePath = this.pathForKey(name)
          console.log({statePath}) //
          fs.readFile(statePath, 'utf8', (error, stateString) => {
            if (error && error.code !== 'ENOENT') {
              console.warn(`Error reading state file: ${statePath}`, error.stack, error)
            }
    
            if (!stateString) return resolve(null)
    
            try {
              resolve(JSON.parse(stateString))
            } catch (error) {
              console.warn(`Error parsing state file: ${statePath}`, error.stack, error)
              resolve(null)
            }
          })
        })
    }

    openFileDialog( win:BrowserWindow ) {
        const dialogOptions  = {
            // title: 'Select pod file',
            properties: [ 'openFile'],
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
              return;
            } //
            this.createWindow({id:0, filePath: filePaths[0]}).then();
          });
    }

    openImportMakdownDialog( win:BrowserWindow ) {
      const dialogOptions  = {
          title: 'Select Markdown file',
          properties: [ 'openFile'],
          filters: [
            {
              name: 'Markdown',
              extensions: ['md', 'mkdn', 'mkd', 'mdown','markdown'],
            },
          ],
        } as OpenDialogOptions
      dialog.showOpenDialog( dialogOptions).then(({ filePaths }) => {
          if (!Array.isArray(filePaths) || !filePaths.length) {
            return;
          } //
          this.createWindow({id:0, type:'importMarkdown',filePath: filePaths[0]}).then();
        });
  }
}


export class WindowsPull  {
    private windows: Array<any>
    constructor(){
      this.windows = []
    }
    getState(): any {
        return { windows: this.all().map(item =>{ return { id: item.id, filePath:item.filePath} }) || []}
    }
    remove (win) {
        const currentIndex = this.windows.indexOf(win)
        if (currentIndex > -1) {
          return this.windows.splice(currentIndex, 1)
        }
      }
    add (win) { 
        this.remove(win)
        return this.windows.unshift(win)
    }
    all () { return this.windows }
    getNextId () {
      let id:number = 1
      while ( this.windows.filter(item => item.id === id ).length ) {
        id++
      }
      return id
    }
}