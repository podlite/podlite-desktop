import * as React from 'react'
import Editor, {ConverterResult} from '@podlite/editor-react'
import { setFn } from 'pod6/built/helpers/handlers'
import { podlite as podlite_core } from "podlite";
import { plugin as DiagramPlugin } from '@podlite/diagram'
import Podlite from '@podlite/to-jsx'
const { ipcRenderer, remote } = window.require('electron');
import { useEffect, useState } from 'react';
import { Rules } from '@podlite/schema';

import {PODLITE_CSS} from '../utils/export-html'
import './App.css';
import 'codemirror/lib/codemirror.css';
import '@podlite/editor-react/lib/index.css'

import * as ReactDOM from 'react-dom';
import { htmlToPdfBuffer } from '../utils/export-pdf';

declare var vmd: any;

    const getPathToOpen = ( filepath, parentDocPath ) => {
        const isRemoteReg = new RegExp(/^(https?|ftp):/)
        const isRemote =  isRemoteReg.test(filepath)
        if (isRemote) {
        return { isRemote, path:filepath }
        }
        const path = require('path')
        const docDirPath = path.dirname(parentDocPath)
        return {isRemote, path:  path.isAbsolute(filepath) ? `file://${filepath}`: 'file:///'+ path.normalize( path.join(docDirPath,filepath) )}
    }

    // wrap all elements and add line link info
    const wrapFunction = (node: Node, children) => {
        if (typeof node !== 'string' && 'type' in node && 'location' in node) {
            //@ts-ignore
            const line = node.location.start.line
            return <div key={line} className="line-src" data-line={line} id={`line-${line}`}>{children}</div>
        } else {
            return children
        }
    }

    const wrapFunctionNoLines = (node: Node, children) => children

export const onConvertSource = (text:string, filePath:string, skipLineNumbers:boolean = false):ConverterResult=>{
        
    let podlite = podlite_core({ importPlugins: true }).use({
        Diagram: DiagramPlugin,
        "image": { 'toAst' : (writer) => (node) => {
                console.warn(JSON.stringify(node, null,2))
                return node
        }
        }

      });
    const plugins = (makeComponent):Partial<Rules> => { 
        
        const mkComponent = (src) => ( writer, processor )=>( node, ctx, interator )=>{
            // check if node.content defined
            return makeComponent(src, node, 'content' in node ? interator(node.content, { ...ctx}) : [] )
        }
        return {
        ':image': setFn(( node, ctx ) => {
            const {path} = getPathToOpen(node.src, filePath)
            const filePathToOpen = path
            if ( filePathToOpen.match(/mp4$/) ) {
                return mkComponent(({ children, key })=><div className="video shadow"> <video controls> <source src={filePathToOpen} type="video/mp4" /> </video></div>)
              } else {
                return mkComponent(({ children, key })=><img key={key} src={path} alt={node.alt}/>)
              }
        }),
    }}
      let tree = podlite.parse(text);
      const asAst = podlite.toAstResult(tree);
    //@ts-ignore
    return { result : <Podlite plugins={plugins} wrapElement={skipLineNumbers ? wrapFunctionNoLines : wrapFunction} tree={asAst} />, errors:asAst.errors }

}
   
const preparePDF = async (text:string, filePath:string) => {
    const html = await prepareHTML(text, filePath)
    const pdfBuf = await htmlToPdfBuffer(html,{pdfOptions:{
        landscape: false,
        pageSize: "A4",
        printBackground: true,
        printSelectionOnly: false,
        marginsType: 0,
    }})
    return pdfBuf
}

const prepareHTML = (text:string, filePath:string):Promise<string> => {
    return new Promise((resolve, reject) => {
        var newDiv = document.createElement("div")
        newDiv.hidden = true;
        document.body.appendChild(newDiv)
        ReactDOM.render(
        <React.StrictMode>
            <div>{onConvertSource(text,filePath,true ).result}</div>
        </React.StrictMode>,
        newDiv, async ()=>{
            await new Promise(resolve => setTimeout(resolve, 500));
            const rendered =  newDiv.innerHTML
            document.body.removeChild(newDiv)
            const html = `<html>
        <head>
        <style>
        ${PODLITE_CSS}

        footer {
            font-size: 9px;
            opacity: 0.3;
            color: gray;
            text-align: right;
        }
        
        footer  a:link {
            color: gray;
        }
          
        @media print {
            body {
                font-size: 20px;
            }
            footer {
              position: fixed;
              bottom: 0px;
              right:0;
            }
        }

        </style>
        </head>
        <body>
        <div class="EditorApp">
            <div class="layoutPreview">
                <div class="Editorright">
                 <div class="content"> 
                    ${rendered}
                </div>
                </div>
            </div>
        </div>
        <footer id="pageFooter">Made in <a href="https://github.com/zag/podlite-desktop">podlite</a></footer>
        </body>
        </html>`
            resolve(html)
        })
    })
}

const App = ()=>{
    
    const [text, updateText] = useState('')
    const [filePath, setFilePath] = useState('')
    const [isPreviewMode, setPreviewMode] = useState(false)
    const [isTextChanged, setTextChanged] = useState(false)

    useEffect(()=>{
        const fileName = filePath ? vmd.path.parse(filePath)['name'] : filePath
        vmd.setWindowTitle(`${fileName||'[new]'}${isTextChanged ? ' *' : '' }`)
      },[isTextChanged, filePath])
    
    useEffect(() => {
        const handlerFileSaved = (_, { filePath }) => {
            setTextChanged(false)
            setFilePath(filePath)
        }
        vmd.on('file-saved', handlerFileSaved)
        return function cleanup() { vmd.off('file-saved', handlerFileSaved ) }
    })

    // hot keys
     useEffect( () => {
        const saveFileAction  =  () => {
            if (isTextChanged)  {
                vmd.saveFile({content:text, filePath})
            }
        }
        const saveFileAsAction  =  () => {
               vmd.saveFileAs({content:text})
        }
        const togglePreviewMode  =  (e) => {
            Object.hasOwnProperty.call(e, 'preventDefault') && e.preventDefault();
            setPreviewMode(!isPreviewMode)
        }

        // make menu command listeners
        vmd.on('menu-file-save', saveFileAction)
        vmd.on('menu-file-save-as', saveFileAsAction)
        vmd.on('view-preview-toggle', togglePreviewMode)
        
        return () => {
            vmd.off('menu-file-save', saveFileAction)
            vmd.off('menu-file-save-as', saveFileAsAction)
            vmd.off('view-preview-toggle', togglePreviewMode)
        }
  
    })

    useEffect( () => {
        // handle export to html
        const exportToHtml = async (): Promise<void> => {
            const fileName = filePath ? vmd.path.parse(filePath)['name'] : filePath
            const { canceled, filePath:filePath1 } = await remote.dialog.showSaveDialog({
            defaultPath: `*/${fileName}.html`,
            buttonLabel: "Export",
            });
            if (!canceled && filePath1) {
                const html = await prepareHTML(text, filePath)
                vmd.fs.writeFileSync(filePath1, html)
            }
        };
        
        vmd.on('exportHtml', exportToHtml)
        return () => vmd.off('exportHtml', exportToHtml )
    })

    useEffect( () => {
        // handle export to pdf
        const exportPdf = async (): Promise<void> => {
          const fileName = filePath ? vmd.path.parse(filePath)['name'] : filePath
          const { canceled, filePath:filePath1 } = await remote.dialog.showSaveDialog({
            defaultPath: `*/${fileName}.pdf`,
            buttonLabel: "Export",
          });
          if (!canceled && filePath1) {
              const html = await preparePDF(text, filePath)
              vmd.fs.writeFileSync(filePath1, html)
          }
        };
        
        vmd.on('exportPdf', exportPdf)
        return () => vmd.off('exportPdf', exportPdf )
    })
          

  // desktop section - start
    useEffect(() => {
        const handlerContent = (_, {content, filePath }) => { 
                setFilePath(filePath)
                updateText(content)                                         
        }
        vmd.on('file', handlerContent)
    })

    const onConvertSourceComponent = ( text:string) => { 
        return onConvertSource(text,filePath ) 
    }

    return <Editor 
    isLineNumbers= {true}
    isControlled = {true}
    isPreviewModeEnabled = {isPreviewMode}
    content={text}  
    onChangeSource = { (content:string)=>{
        updateText(content)
        setTextChanged(true)
    } }
    onConvertSource = { onConvertSourceComponent }
    /> 
}
export default App;