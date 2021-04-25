import * as React from 'react'
import Editor from './EditorNG'
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