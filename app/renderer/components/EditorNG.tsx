import * as React from 'react'
import {Controlled as CodeMirror} from 'react-codemirror2'
import {EditorConfiguration} from 'codemirror'
import { useState, useEffect, useRef, useMemo } from 'react'
const { ipcRenderer, remote } = window.require('electron');
//@ts-ignore
import {isValidElementType, isElement} from  'react-is'
import mermaid from 'mermaid';
import {Node} from '@podlite/schema'

import Mousetrap from 'mousetrap'
; // global-bind must be import after Mousetrap
import 'mousetrap-global-bind';
// import '../../../node_modules/codemirror/lib/codemirror.css';
// import './Editor.css';
import {PODLITE_CSS} from './EditorStyles'
import { mdToPod6 } from 'podlite';
import 'codemirror/mode/gfm/gfm';
// import { AstToReact } from './ast-to-react';
// import AstToReact from 'podlite-ast-to-image'
// import {Mermaid} from 'podlite-ast-to-image'
import {Mermaid} from '@podlite/diagrams';
 import Podlite from '@podlite/to-jsx'; 

// import path from 'path'
const path = require('path')
const vmd = {
    path: path,
    setWindowTitle: ()=>{},
    on: ()=>{},
    off: ()=>{},
}

const styles: React.CSSProperties = {
  marginTop: 100,
  textAlign: 'center'
}




//@ts-ignore
function useDebouncedEffect(fn, deps, time) {
  const dependencies = [...deps, time] 
  useEffect(() => {
    const timeout = setTimeout(fn, time);
    return () => {
      clearTimeout(timeout);
    }
  }, dependencies);
}

/* set window title */ 
// @ts-ignore
const setWindowTitle = (title: string) => { vmd.setWindowTitle(title) }

let instanceCM:CodeMirror.Editor 
type Props={
    content: string,
    onChangeSource:Function,
    sourceType: 'pod6' | 'md',
    onConvertSource: Function,
    onSavePressed: Function,
    isDarkTheme : boolean
}
let i =0
const Mermaid1 = React.memo(({chart}: {chart:string})=><Mermaid2 chart={chart}/> )
const Mermaid2 = ({ chart }: {chart:string})=>{
        const inputEl = useRef(null);
              // Mermaid initilize its config
        // mermaid.initialize({...DEFAULT_CONFIG, ...config})
        const config = {
            // startOnLoad: true,
            // theme: "default",
            securityLevel: "loose",
            startOnLoad: false 
        }
        if ( inputEl ) {
        mermaid.initialize(config)
        //@ts-ignore
        mermaid.init( inputEl)
        }
        // useEffect(() => {
        //     mermaid.contentLoaded()
        //   }, [config])

        useEffect(()=>{
            var insertSvg = function(svgCode:any){
                // if ( inputEl.current != null ) {
                    // console.log("memrmr")
                    if (!inputEl.current) {console.log("ok")}
                    //@ts-ignore
                    inputEl.current!.innerHTML = svgCode;
                // }
            };
            console.log("RENDER" + chart)
            try {
                mermaid.render('graph-div' + i++, chart, insertSvg)
                // mermaid.render(id, element.textContent.trim(), (svg, bind) => {element.innerHTML = svg;}, element);
            }  catch (e) {
                console.log('view fail1', e);
              }
            // mermaid.render('graph-div', chart, ()=>{})
        }, [chart])
        return <div className="mermaid1" ref={inputEl}/>
}


const plugins = (makeComponent) => { 
    const mkComponent = (src) => ( writer, processor )=>( node, ctx, interator )=>{
        return makeComponent(src, node, interator(node.content, { ...ctx}) )
    }
    return {
    // 'O<>':({meta, content,children}:any)=>{ 
    //     return <i>{children}</i> },
    //@ts-ignore
    'Dia': mkComponent(({key, content, children})=>{ 
        let srcData = "test"
        if (content) {
            // console.log(children)
            srcData = children[0]
            
            // srcData = content[0]?.value
        }
        return <Mermaid key={key} chart={srcData}/>},
    )
 }
}

// wrap all elements and add line link info
const wrapFunction = (node: Node, children) => {
    if (typeof node !== 'string' && 'type' in node && 'location' in node) {
        const line = node.location.start.line
        return <div key={line} className="line-src" data-line={line} id={`line-${line}`}>{children}</div>
    } else {
        return children
    }
}


export default ({content, isDarkTheme = false , onConvertSource, onSavePressed, sourceType }:Props) => {
  const [text, updateText] = useState(content)

  const [marks, updateMarks] = useState([])
  const [, updateScrollMap] = useState([])
  
  const [isPreviewMode, setPreviewMode] = useState(false)

  const [isPreviewScroll, setPreviewScrolling] = useState(false);
  const refValue = useRef(isPreviewScroll);
  const [showTree, setShowTree] = useState(false)

  const [filePath, setFilePath] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileExt, setFileExt] = useState('')
  const [isChanged, setChanged] = useState(false)

  const [fileLoading, setFileLoading] = useState(true)
  // const [marks, updateMarks] = useState([])
  
//   const [result, updateResult] = useState(makeHtml(''))

useEffect(()=>{
updateText(content)
},[content])

 const [result, updateResult] = useState(useMemo( ()=> onConvertSource(content), []) )
  useDebouncedEffect(() => {
    updateResult(onConvertSource(text))
  }, [text], 50)
 
  const inputEl = useRef(null)

useEffect(()=>{
  console.log(`setWindowTitle ${isChanged}`)
  setWindowTitle (`${fileName}${isChanged ? ' *' : '' }`)
},[isChanged, filePath])

// hot keys
  useEffect( () => {
  const saveFileAction  =  () => {
    if (isChanged)  {
        // vmd.saveFile({content:text, filePath})
        console.warn("Save File")
        onSavePressed(text)

    }
  }

  const togglePreviewMode  =  (e) => {
    e.preventDefault()
    setPreviewMode(!isPreviewMode)
    if (!isPreviewMode) {
      const el = previewEl.current
      console.log({el})
      el.focus()
    }
    if (isPreviewMode) {
      if (instanceCM) {
        console.log({instanceCM})
        instanceCM.focus()
      }
    }
  }

  Mousetrap.bindGlobal(['command+/'], togglePreviewMode )
  Mousetrap.bindGlobal(['ctrl+s', 'command+s'], saveFileAction)
return () => {
    Mousetrap.unbind(['ctrl+s', 'command+s'])
    Mousetrap.unbind(['command+/'])
  }

})


//   useEffect(() => {
//   const handlerFileSaved = (_, { filePath }) => {
//   setChanged(false)
//   setFilePath(filePath)
//  }
//   vmd.on('file-saved', handlerFileSaved)
//   return function cleanup() { vmd.off('file-saved', handlerFileSaved ) }
// })


useEffect(() => {
    refValue.current = isPreviewScroll;
});
var options: EditorConfiguration = {
  lineNumbers: true,
  inputStyle: "contenteditable",
  //@ts-ignore
  spellcheck: true,
  autofocus:true,
  lineWrapping:true,
  viewportMargin:Infinity,
  mode: sourceType !== 'md' ? null : 
                            {
                                name: "gfm",
                                tokenTypeOverrides: {
                                emoji: "emoji"
                                }
                            },
 theme: isDarkTheme ? "duotone-dark" : "default"
};


const previewEl = useRef(null)

useEffect(() => {
 //@ts-ignore
  const newScrollMap = [...document.querySelectorAll('.line-src')]
                  .map(n => {
                              const line = parseInt(n.getAttribute('data-line'),10 )
                              const offsetTop = n.offsetTop
                              return { line, offsetTop}
                  })
  //@ts-ignore                      
  updateScrollMap(newScrollMap)
  //@ts-ignore
  const listener = (e) => { 
    if (!isPreviewScroll ) {return}
    let element = e.target
    //@ts-ignore
    const getLine = (offset) => {
      const c = newScrollMap.filter( i => i.offsetTop > offset )
      const lineElement = c.shift() || newScrollMap[ newScrollMap.length - 1 ]
      return lineElement.line
      }
    const line  =  getLine(element.scrollTop)
    if (instanceCM) {
      const t = element.scrollTop === 0 ? 0 : instanceCM.charCoords({line: line, ch: 0}, "local").top;
      instanceCM.scrollTo(null, t);
    }
    return true
  }
  if (previewEl && previewEl.current) {
      //@ts-ignore
       previewEl.current.addEventListener("scroll", listener);
  }
  return () => {
    // @ts-ignore
    previewEl && previewEl.current && previewEl && previewEl.current.removeEventListener("scroll", listener);
  };
},[text,isPreviewScroll])

useEffect(() => {
 //@ts-ignore
 let cm = instanceCM
 if (!cm) {return}
 //@ts-ignore
marks.forEach(marker => marker.clear())
let cmMrks:Array<never> = []
//@ts-ignore
if (result.errors ) {
  //@ts-ignore
result.errors.map((loc:any)=>{
  // @ts-ignore
  let from = {line: loc.start.line-1, ch: loc.start.column-1 - (loc.start.offset === loc.end.offset)};
  let to = {line: loc.end.line-1, ch: loc.end.column-1};
  cmMrks.push(
              //@ts-ignore
              cm.markText(
                  from,
                  to, 
                  {
                    className: 'syntax-error',
                    title: ';data.error.message',
                    css: "color : red"
                  }
              )
                  
  )
})
}
updateMarks(cmMrks)

},[text])

//@ts-ignore
const previewHtml = <div className={ "Editorright " + (isDarkTheme ? 'dark' : '' )}
                        onMouseEnter={()=>setPreviewScrolling(true)} 
                        onMouseMove={()=>setPreviewScrolling(true)} 
                        ref={previewEl} 
                        >
                     {/* { isElement(result) ? <div className="content">{result}</div> : <div 
                     dangerouslySetInnerHTML={{__html: result}} 
                     className="content" 
                     ></div>
                        } */}
                        < Podlite file={text} plugins={plugins} wrapElement={ wrapFunction } /> 
                        {/* <Mermaid2 key={'key'} chart={`graph LR
A --- B
B-->C[fa:fa-ban forbidden]
B-->D(fa:fa-spinner);`}/> */}
                     </div>
//@ts-ignore
const scrollEditorHandler = (editor) => {
if (refValue.current) { return }
let scrollInfo = editor.getScrollInfo();
// get line number of the top line in the page
let lineNumber = editor.lineAtHeight(scrollInfo.top, 'local') + 1;
if (previewEl) {
  const el = previewEl.current
  const elementId = `#line-${lineNumber}`
  const scrollToElement = document.querySelector(elementId)
  if (scrollToElement) {
    //@ts-ignore
    const scrollTo = scrollToElement.offsetTop
    //@ts-ignore
    el.scrollTo({
      top: scrollTo,
      left: 0,
      behavior: 'smooth'
    })
 }
  
}
}
return (
  <div className="EditorApp">
    <div className={ isPreviewMode ? "layoutPreview": "layout"}>
        <div className="Editorleft" onMouseEnter={()=>setPreviewScrolling(false)}
                               onMouseMove={()=>setPreviewScrolling(false)}
        >
        <CodeMirror 
            value={text}
            editorDidMount={ editor => { instanceCM = editor } }
            onBeforeChange={ (editor, data, value) => { setChanged(true); updateText(value) } }
            onScroll={scrollEditorHandler}
            options={options} 
            className="editorApp"
         />
         </div>
         {previewHtml}
    </div>
  </div>
);
}
