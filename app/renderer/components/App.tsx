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


=begin Dia
graph LR
A --- B
B-->C[fa:fa-ban forbidden]
B-->D(fa:fa-spinner);
=end Dia

`


const onConvertSource = (src) => {
    return src
// console.log(src)
// return AstToReact(src)
}
const App = ()=><Editor
    isDarkTheme={false}
    content={content}
    onChangeSource={()=>{}}
    sourceType={'pod6'}
    onConvertSource={onConvertSource}
    onSavePressed={()=>{}}
/>
export default App;