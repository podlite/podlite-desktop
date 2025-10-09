import * as React from 'react'
import { ConverterResult } from '@podlite/editor-react'
import { Editor2 } from '@podlite/editor-react'
import { podlite as podlite_core } from 'podlite'
import Podlite from '@podlite/to-jsx'
const { remote } = window.require('electron')
import { useEffect, useState } from 'react'
import { Rules, makeInterator, Node, getTextContentFromNode, PodliteDocument, setFn } from '@podlite/schema'

import { PODLITE_CSS } from '../utils/export-html'
import './App.css'

import '@podlite/to-jsx/lib/podlite.css'
import '@podlite/editor-react/lib/podlite-vars.css'
import '@podlite/editor-react/lib/Editor.css'

import * as ReactDOM from 'react-dom'
import { htmlToPdfBuffer } from '../utils/export-pdf'

declare var vmd: any

const getPathToOpen = (filepath, parentDocPath) => {
  const isRemoteReg = new RegExp(/^(https?|ftp):/)
  const isRemote = isRemoteReg.test(filepath)
  if (isRemote) {
    return { isRemote, path: filepath }
  }
  const path = require('path')
  const docDirPath = path.dirname(parentDocPath)
  return {
    isRemote,
    path: path.isAbsolute(filepath)
      ? `file://${filepath}`
      : 'file:///' + path.normalize(path.join(docDirPath, filepath)),
  }
}

// wrap all elements and add line link info
const wrapFunction = (node: Node, children) => {
  if (node?.location?.start?.line) {
    const line = node.location.start.line
    return (
      <div key={line} className="line-src" data-line={line} id={`line-${line}`}>
        {children}
      </div>
    )
  } else {
    return children
  }
}

const wrapFunctionNoLines = (node: Node, children) => children

export const onConvertSource = (text: string, filePath: string, skipLineNumbers: boolean = false): ConverterResult => {
  let podlite = podlite_core({ importPlugins: true }).use({
    image: {
      toAst: () => node => {
        console.warn(JSON.stringify(node, null, 2))
        return node
      },
    },
  })
  const plugins = (makeComponent): Partial<Rules> => {
    const mkComponent = (src, attr?: {}) => () => (node, ctx, interator) => {
      // check if node.content defined
      return makeComponent(src, node, 'content' in node ? interator(node.content, { ...ctx }) : [], { ...attr })
    }
    return {
      useReact: setFn(node => {
        const text = getTextContentFromNode(node)
        return mkComponent(({ key }) => (
          <div key={key}>
            <i>=useReact</i> {text}
          </div>
        ))
      }),
      'L<>': setFn((node, ctx) => {
        let { meta } = node
        if (meta === null) {
          meta = getTextContentFromNode(node)
        }
        const text_content = getTextContentFromNode(node)
        let processedUrl = meta
        if (processedUrl.startsWith('file:')) {
          const filePathOpen = processedUrl.replace('file:', '')

          // Filenames that don't begin with / or ~ are relative to current document's location
          if (!filePathOpen.startsWith('/') && !filePathOpen.startsWith('~')) {
            // Get directory from global filepath variable
            const path = require('path')
            const currentDocDir = path.dirname(filePath)
            // Convert relative path to absolute
            const absolutePath = path.resolve(currentDocDir, filePathOpen)
            processedUrl = `file://${absolutePath}`
          }

          // Otherwise, if the path starts with ~, replace it with the user's home directory
          else if (filePathOpen.startsWith('~')) {
            const homeDir = require('os').homedir()
            const path = require('path')
            const absolutePath = path.join(homeDir, filePathOpen.slice(1))
            processedUrl = `file://${absolutePath}`
          }
        }
        return mkComponent(({ children, key }) => (
          <a href={processedUrl} key={key}>
            {children}
          </a>
        ))
      }),
      React: () => (node, ctx, interator) => {
        const text = getTextContentFromNode(node)
        let podlite = podlite_core({ importPlugins: true }).use({})
        let tree = podlite.parse(text)
        const asAst = podlite.toAstResult(tree).interator as PodliteDocument
        const childrens = interator(asAst.content, ctx)
        return makeComponent(
          ({ key, children }) => {
            return (
              <div className="react" key={key}>
                {children.map((i, id) => (
                  <div id={id} style={{ border: '1px dotted #ff000033', padding: '5px', margin: '1px' }}>
                    {i}
                  </div>
                ))}
              </div>
            )
          },
          node,
          childrens,
        )
      },
      ':image': setFn(node => {
        // const {path} = getPathToOpen(node.src, filePath)
        // const filePathToOpen = path

        if (node.src.match(/(mp4|mov)$/)) {
          return mkComponent(() => (
            <div className="video shadow">
              {' '}
              <video controls>
                {' '}
                <source src={node.src} type="video/mp4" />{' '}
              </video>
            </div>
          ))
        } else {
          return mkComponent(({ key }) => <img key={key} src={node.src} alt={node.alt} />)
        }
      }),
    }
  }
  let tree = podlite.parse(text)
  const { interator: astTree, ...astResult } = podlite.toAstResult(tree)
  // process ast tree by converting paths to absolute
  const rules = {
    ':image': node => {
      const { path } = getPathToOpen(node.src, filePath)
      return { ...node, src: path }
    },
  }
  const astProcessed = makeInterator(rules)(astTree, {})
  const asAst = {
    interator: astProcessed,
    ...astResult,
  }
  //@ts-ignore
  return {
    result: (
      <Podlite plugins={plugins} wrapElement={skipLineNumbers ? wrapFunctionNoLines : wrapFunction} tree={asAst} />
    ),
    errors: asAst.errors,
  }
}

const preparePDF = async (text: string, filePath: string) => {
  const html = await prepareHTML(text, filePath)
  const pdfBuf = await htmlToPdfBuffer(html, {
    pdfOptions: {
      landscape: false,
      pageSize: 'A4',
      printBackground: true,
      printSelectionOnly: false,
      marginsType: 0,
    },
  })
  return pdfBuf
}

const prepareHTML = (text: string, filePath: string): Promise<string> => {
  return new Promise(resolve => {
    var newDiv = document.createElement('div')
    newDiv.hidden = true
    document.body.appendChild(newDiv)
    ReactDOM.render(
      <React.StrictMode>
        <div>{onConvertSource(text, filePath, true).result}</div>
      </React.StrictMode>,
      newDiv,
      async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        const rendered = newDiv.innerHTML
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
      },
    )
  })
}

const App = () => {
  const [text, updateText] = useState('')
  const [filePath, setFilePath] = useState('')
  const [isPreviewMode, setPreviewMode] = useState(false)
  const [isHalfPreviewMode, setHalfPreviewMode] = useState(false)
  const [isTextChanged, setTextChanged] = useState(false)

  useEffect(() => {
    const fileName = filePath ? vmd.path.parse(filePath)['name'] : filePath
    vmd.setWindowTitle(`${fileName || '[new]'}${isTextChanged ? ' *' : ''}`)
  }, [isTextChanged, filePath])

  useEffect(() => {
    const handlerFileSaved = (_, { filePath }) => {
      setTextChanged(false)
      setFilePath(filePath)
    }
    vmd.on('file-saved', handlerFileSaved)
    return function cleanup() {
      vmd.off('file-saved', handlerFileSaved)
    }
  })

  // hot keys
  useEffect(() => {
    const saveFileAction = () => {
      if (isTextChanged) {
        vmd.saveFile({ content: text, filePath })
      }
    }
    const saveFileAsAction = () => {
      vmd.saveFileAs({ content: text })
    }
    const togglePreviewMode = e => {
      Object.hasOwnProperty.call(e, 'preventDefault') && e.preventDefault()
      if (isHalfPreviewMode && !isPreviewMode) {
        setHalfPreviewMode(false)
      }
      setPreviewMode(!isPreviewMode)
    }
    const toggleHalfPreviewMode = e => {
      Object.hasOwnProperty.call(e, 'preventDefault') && e.preventDefault()
      setHalfPreviewMode(!isHalfPreviewMode)
    }

    // make menu command listeners
    vmd.on('menu-file-save', saveFileAction)
    vmd.on('menu-file-save-as', saveFileAsAction)
    vmd.on('view-preview-toggle', togglePreviewMode)
    vmd.on('view-halfpreview-toggle', toggleHalfPreviewMode)

    return () => {
      vmd.off('menu-file-save', saveFileAction)
      vmd.off('menu-file-save-as', saveFileAsAction)
      vmd.off('view-preview-toggle', togglePreviewMode)
      vmd.off('view-halfpreview-toggle', toggleHalfPreviewMode)
    }
  })

  useEffect(() => {
    // handle export to html
    const exportToHtml = async (): Promise<void> => {
      const fileName = filePath ? vmd.path.parse(filePath)['name'] : filePath
      const { canceled, filePath: filePath1 } = await remote.dialog.showSaveDialog({
        defaultPath: `*/${fileName}.html`,
        buttonLabel: 'Export',
      })
      if (!canceled && filePath1) {
        const html = await prepareHTML(text, filePath)
        vmd.fs.writeFileSync(filePath1, html)
      }
    }

    vmd.on('exportHtml', exportToHtml)
    return () => vmd.off('exportHtml', exportToHtml)
  })

  useEffect(() => {
    // handle export to pdf
    const exportPdf = async (): Promise<void> => {
      const fileName = filePath ? vmd.path.parse(filePath)['name'] : filePath
      const { canceled, filePath: filePath1 } = await remote.dialog.showSaveDialog({
        defaultPath: `*/${fileName}.pdf`,
        buttonLabel: 'Export',
      })
      if (!canceled && filePath1) {
        const html = await preparePDF(text, filePath)
        vmd.fs.writeFileSync(filePath1, html)
      }
    }

    vmd.on('exportPdf', exportPdf)
    return () => vmd.off('exportPdf', exportPdf)
  })

  // desktop section - start
  useEffect(() => {
    const handlerContent = async (_, { content, filePath: newFilePath }) => {
      try {
        // Check if current file has unsaved changes
        if (isTextChanged) {
          const { remote } = window.require('electron')
          const confirmResult = await remote.dialog.showMessageBox(remote.getCurrentWindow(), {
            type: 'warning',
            buttons: ['Save', 'Discard', 'Cancel'],
            defaultId: 0,
            cancelId: 2,
            message: 'The current file has unsaved changes.',
            detail: 'Do you want to save it before opening the new file?',
          })

          if (confirmResult.response === 2) {
            // Cancel
            return
          } else if (confirmResult.response === 0) {
            // Save current file first
            await new Promise(resolve => {
              const saveHandler = () => {
                vmd.off('file-saved', saveHandler)
                resolve(true)
              }
              vmd.on('file-saved', saveHandler)
              vmd.saveFile({ content: text, filePath })
            })
          }
          // If response === 1 (Discard), continue without saving
        }

        setFilePath(newFilePath)
        updateText(content)
        setTextChanged(false)
      } catch (error) {
        console.error('Error in handlerContent:', error)
        // Fallback: load the new file anyway
        setFilePath(newFilePath)
        updateText(content)
        setTextChanged(false)
      }
    }
    vmd.on('file', handlerContent)
    return () => {
      vmd.off('file', handlerContent)
    }
  }, [isTextChanged, text, filePath])

  const onConvertSourceComponent = (text: string) => {
    return onConvertSource(text, filePath)
  }

  return (
    <Editor2
      onChange={(content: string) => {
        updateText(content)
        setTextChanged(true)
      }}
      onOpenLink={(url: string) => {
        console.log(url)

        let processedUrl = url
        // If URL contains |, use all text after |
        if (url.includes('|')) {
          processedUrl = url.split('|').slice(1).join('|').trim()
        }

        // Handle file scheme with relative paths
        if (processedUrl.startsWith('file:')) {
          const filePathOpen = processedUrl.replace('file:', '')

          // Filenames that don't begin with / or ~ are relative to current document's location
          if (!filePathOpen.startsWith('/') && !filePathOpen.startsWith('~')) {
            // Get directory from global filepath variable
            const path = require('path')
            const currentDocDir = path.dirname(filePath)

            // Convert relative path to absolute
            const absolutePath = path.resolve(currentDocDir, filePathOpen)
            processedUrl = `file://${absolutePath}`
          }
        }
        vmd.onOpenUrl(processedUrl)
      }}
      makePreviewComponent={onConvertSourceComponent}
      value={text}
      enablePreview={isPreviewMode || isHalfPreviewMode}
      previewWidth={isPreviewMode || isHalfPreviewMode ? (isHalfPreviewMode ? '50%' : '100%') : '0%'}
      readOnly={false}
      isFullscreen={true}
    />
  )
}
export default App
