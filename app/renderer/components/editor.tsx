import * as React from 'react'
import {Controlled as CodeMirror} from 'react-codemirror2'
import {EditorConfiguration} from 'codemirror'
import { useState, useEffect, useRef } from 'react'
// import Electron from 'electron'
import Mousetrap from 'mousetrap'
; // global-bind must be import after Mousetrap
import 'mousetrap-global-bind';
import '../../../node_modules/codemirror/lib/codemirror.css';
import './App.css';
//@ts-ignore
import { toHtml , version, parse } from 'pod6'

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

export default () => {

  const [text, updateText] = useState('')
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
  // const [marks, updateMarks] = useState([])
  const makeHtml = (text:string) => {
    const addons = {
      'Image:namedBlock': ( writer, processor ) => ( node, ctx, interator ) =>{
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
  
  
        // get image addr
        const addr = node.content[0].value
        if ( addr ) {
        // clean up addr
        const filename = addr.replace(/\s+/g,'')
        // check if file relative
        const { isRemote, path } = getPathToOpen( filename, filePath )
        const filePathToOpen = path
        writer.writeRaw(`<img src="${filePathToOpen}"/>`)
        }
      }
    }
  // @ts-ignore
  const getLine = ( node ) => {
    if (node.location) {
        return node.location.start.line
    }
    return undefined
  }
  const exportRule = {
    //@ts-ignore
    '*':( writer, processor ) => ( node, ctx, interator, def ) => {
        if (['block','para'].includes(node.type) || ['pod'].includes(node.name)) {
          // @ts-ignore
            const codeLine = getLine(node)
            if (codeLine) { writer.writeRaw(`<div class="line-src" data-line="${getLine(node)}" id="line-${getLine(node)}">`) }
            if (def) def(node, ctx, interator)
            if (codeLine) { writer.writeRaw("</div>") }
  
        } else {
            if (def) def(node, ctx, interator)
        }
        
        }
    }
    try {
     // for files with ext  '.pod6' and '.rakudoc' 
     // parse as pod without =begin pod blocks
     const isDefaultInPodMode = ['.pod6','.rakudoc'].includes(fileExt)
     return toHtml({processor:( src ) => parse( src, { podMode: isDefaultInPodMode }) }).use(addons).use(exportRule).run(text)
    } catch(e) {
      return `<p>There may have been an error.
  Check pod6 syntax at <a target="_blank" href="https://raw.githubusercontent.com/zag/js-pod6/master/doc/S26-documentation.pod6">Synopsis 26</a>
  or please, fill issue <a target="_blank" href="https://github.com/zag/js-pod6/issues">here</a>.</p><p>Technical details (please, attach this to issue):</p><pre><code>${e}</code></pre>`
    }

  }
  const [result, updateResult] = useState(makeHtml(''))
  
  useDebouncedEffect(() => {
    updateResult(makeHtml(text));
  }, [text], 100)
 
  const inputEl = useRef(null)

useEffect(()=>{
  setFileName( filePath ? vmd.path.parse(filePath)['name'] : filePath )
  setFileExt( filePath ? vmd.path.parse(filePath)['ext'] : filePath )
},[filePath])

useEffect(()=>{
  setWindowTitle (`${fileName}${isChanged ? ' *' : '' }`)
},[isChanged])


useEffect(() =>{ setChanged(true) },[text])
  // desktop section - start
  useEffect(() => {
  const handlerContent = (_, {content, filePath }) => { 
                                                        updateText(content)
                                                        setFilePath(filePath)
                                                        setChanged(false)
 }
  vmd.on('file', handlerContent)
  return function cleanup() { vmd.off( 'file', handlerContent ) }
})
// hot keys
  useEffect( () => {
  const saveFileAction  =  (e) => {
    e.preventDefault()
    if (isChanged)  vmd.saveFile({content:text, filePath})
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

  Mousetrap.reset()
  Mousetrap.bindGlobal(['ctrl+s', 'command+s'], saveFileAction )
  Mousetrap.bindGlobal(['command+/'], togglePreviewMode )

  return () => Mousetrap.unbind(['ctrl+s', 'command+s', 'command+/'])
})


  useEffect(() => {
  const handlerFileSaved = (_, { filePath }) => {
  setChanged(false)
  setFilePath(filePath)
 }
  vmd.on('file-saved', handlerFileSaved)
  return function cleanup() { vmd.off('file-saved', handlerFileSaved ) }
})
// const pathId = vmd.windowid
// desktop section - end
useDebouncedEffect(() => {
  updateResult(makeHtml(text));
}, [text], 100)

useEffect(() => {
    refValue.current = isPreviewScroll;
});
var options: EditorConfiguration = {
  lineNumbers: true,
   inputStyle: "contenteditable",
   //@ts-ignore
   spellcheck: true,
   autofocus:true,
};

//  const result = JSON.stringify(parse(text), null, 2) ||  makeHtml(text)

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
// const previewCode = <div  className=" right"><pre><code className="right" style={{textAlign:"left"}}>{JSON.stringify(parse(text), null, 2)}</code></pre></div>

//@ts-ignore
const previewHtml =  <div onMouseEnter={()=>setPreviewScrolling(true)} 
                        onMouseMove={()=>setPreviewScrolling(true)} ref={previewEl} className="right"
dangerouslySetInnerHTML={{__html: result}} ></div>
//@ts-ignore
const scrollEditorHandler = (editor) => {
if (refValue.current) { return }
let scrollInfo = editor.getScrollInfo();
// get line number of the top line in the page
let lineNumber = editor.lineAtHeight(scrollInfo.top, 'local');
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
  <div className="App">
    <div className={ isPreviewMode ? "layoutPreview": "layout"}>
        <div className="left" onMouseEnter={()=>setPreviewScrolling(false)}
                               onMouseMove={()=>setPreviewScrolling(false)}
        >
        <CodeMirror 
            value={text}
            editorDidMount={ editor => { instanceCM = editor } }
            onBeforeChange={ (editor, data, value) => { updateText(value) } }
            onScroll={scrollEditorHandler}
            options={options} 
            className="editor"
         />
         </div>
         {previewHtml}
    </div>
  </div>
);
}
