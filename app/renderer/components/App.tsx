import * as React from 'react'
import Editor, {ConverterResult} from '@podlite/editor-react'
import { setFn } from 'pod6/built/helpers/handlers'
import { podlite as podlite_core } from "podlite";
import { plugin as DiagramPlugin } from '@podlite/diagram'
import Podlite from '@podlite/to-jsx'
import Mousetrap from 'mousetrap'
; // global-bind must be import after Mousetrap
import 'mousetrap-global-bind';
const { ipcRenderer, remote } = window.require('electron');
import { useEffect, useState } from 'react';
import { Rules } from '@podlite/schema';

import {PODLITE_CSS} from '../utils/export-html'
// import '@podlite/editor-react/lib/index.css'
import './App.css';
import './Editor.scss'
import { htmlToPdfBuffer } from '../utils/export-pdf';

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

    // hot keys
     useEffect( () => {
    const saveFileAction  =  () => {
        if (isTextChanged)  {
            console.warn("Save File")
            vmd.saveFile({content:text, filePath})
        }
    }

    const togglePreviewMode  =  (e) => {
        e.preventDefault()
        setPreviewMode(!isPreviewMode)
      }

    Mousetrap.bindGlobal(['command+/'], togglePreviewMode )
    Mousetrap.bindGlobal(['ctrl+s', 'command+s'], saveFileAction)
    return () => {
      Mousetrap.unbind(['ctrl+s', 'command+s'])
       Mousetrap.unbind(['command+/'])
    }
  
  })

`


  // desktop section - start
    useEffect(() => {
        const handlerContent = (_, {content, filePath }) => { 
                setFilePath(filePath)
                updateText(content)                                         
        }
        vmd.on('file', handlerContent)
    })

const App = ()=><Editor
    isDarkTheme={false}
    content={content}
    onChangeSource={()=>{}}
    sourceType={'pod6'}
    onConvertSource={onConvertSource}
    onSavePressed={()=>{}}
/>
export default App;