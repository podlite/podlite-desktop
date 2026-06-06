import * as React from 'react'
import { ConverterResult, EditorSessionState, HighlightedCode, SaveAssetCallback } from '@podlite/editor-react'
import { Editor2 } from '@podlite/editor-react'
import { podlite as podlite_core } from 'podlite'
import Podlite from '@podlite/to-jsx'
const { ipcRenderer } = window.require('electron')
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

type IncludeReader = (path: string, baseDir?: string) => string | null
type ExpandPaths = (pattern: string, baseDir?: string) => string[]

export const onConvertSource = (
  text: string,
  filePath: string,
  skipLineNumbers: boolean = false,
  includeReader?: IncludeReader,
  expandPaths?: ExpandPaths,
): ConverterResult => {
  let podlite = podlite_core({ importPlugins: true }).use({})
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
        if (processedUrl?.startsWith('file:')) {
          const filePathOpen = processedUrl.replace('file:', '')

          // Filenames that don't begin with / or ~ are relative to current document's location
          if (!filePathOpen?.startsWith('/') && !filePathOpen?.startsWith('~')) {
            // Get directory from global filepath variable
            const path = require('path')
            const currentDocDir = path.dirname(filePath)
            // Convert relative path to absolute
            const absolutePath = path.resolve(currentDocDir, filePathOpen)
            processedUrl = `file://${absolutePath}`
          }

          // Otherwise, if the path starts with ~, replace it with the user's home directory
          else if (filePathOpen?.startsWith('~')) {
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
      ':code': mkComponent(({ children, key, ...node }, ctx) => (
        <HighlightedCode node={node} keyProp={key} ctx={ctx}>
          {children}
        </HighlightedCode>
      )),
      code: mkComponent(({ children, key, ...node }, ctx) => (
        <HighlightedCode node={node} keyProp={key} ctx={ctx}>
          {children}
        </HighlightedCode>
      )),
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
      <Podlite
        plugins={plugins}
        wrapElement={skipLineNumbers ? wrapFunctionNoLines : wrapFunction}
        tree={asAst}
        includeReader={includeReader}
        includeBaseDir={filePath ? require('path').dirname(filePath) : undefined}
        expandPaths={expandPaths}
      />
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
        <footer id="pageFooter">Made in <a href="https://github.com/podlite/podlite-desktop">podlite</a></footer>
        </body>
        </html>`
        resolve(html)
      },
    )
  })
}

const App = () => {
  const textRef = React.useRef('')
  const [text, updateText] = useState('')
  // Stable setter that updates ref immediately, defers state update
  const updateTextFromEditor = React.useCallback((content: string) => {
    textRef.current = content
  }, [])
  const [filePath, setFilePath] = useState('')
  const [isPreviewMode, setPreviewMode] = useState(false)
  const [isHalfPreviewMode, setHalfPreviewMode] = useState(false)
  const [isTextChanged, setTextChanged] = useState(false)
  const [initialEditorState, setInitialEditorState] = useState<EditorSessionState | undefined>(undefined)
  const editorStateRef = React.useRef<EditorSessionState>({})
  const editorComponentRef = React.useRef<any>(null)
  // Refs mirror live state for IPC listeners that are attached once (with []
  // deps) so they read the latest value without re-attaching on every render.
  const isTextChangedRef = React.useRef(false)
  const filePathRef = React.useRef('')
  const isPreviewModeRef = React.useRef(false)
  const isHalfPreviewModeRef = React.useRef(false)
  isTextChangedRef.current = isTextChanged
  filePathRef.current = filePath
  isPreviewModeRef.current = isPreviewMode
  isHalfPreviewModeRef.current = isHalfPreviewMode
  const setEditorState = React.useCallback(
    (state: EditorSessionState) => {
      editorStateRef.current = state
      ;(window as any).__podliteEditorState = {
        ...state,
        isPreviewMode,
        isHalfPreviewMode,
      }
    },
    [isPreviewMode, isHalfPreviewMode],
  )

  // Expose state to main process via window globals
  useEffect(() => {
    ;(window as any).__podliteHasUnsavedChanges = isTextChanged
    ;(window as any).__podliteCurrentFilePath = filePath
    ;(window as any).__podliteEditorState = {
      ...editorStateRef.current,
      isPreviewMode,
      isHalfPreviewMode,
    }
  }, [isTextChanged, filePath, isPreviewMode, isHalfPreviewMode])

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
    return () => {
      vmd.off('file-saved', handlerFileSaved)
    }
  }, [])

  // hot keys
  useEffect(() => {
    const saveFileAction = () => {
      // Trigger save when there are unsaved edits OR when the document is
      // untitled (no path yet). For an untitled doc the main-process save
      // handler falls back to a Save-As dialog so the user can name it.
      if (isTextChangedRef.current || !filePathRef.current) {
        vmd.saveFile({ content: textRef.current, filePath: filePathRef.current })
      }
    }
    const saveFileAsAction = () => {
      vmd.saveFileAs({ content: textRef.current })
    }
    const togglePreviewMode = e => {
      Object.hasOwnProperty.call(e, 'preventDefault') && e.preventDefault()
      if (isHalfPreviewModeRef.current && !isPreviewModeRef.current) {
        setHalfPreviewMode(false)
      }
      setPreviewMode(!isPreviewModeRef.current)
    }
    const toggleHalfPreviewMode = e => {
      Object.hasOwnProperty.call(e, 'preventDefault') && e.preventDefault()
      setHalfPreviewMode(!isHalfPreviewModeRef.current)
    }

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
  }, [])

  useEffect(() => {
    const exportToHtml = async (): Promise<void> => {
      const filePath = filePathRef.current
      const fileName = filePath ? vmd.path.parse(filePath)['name'] : filePath
      const { canceled, filePath: filePath1 } = await ipcRenderer.invoke('show-save-dialog', {
        defaultPath: `*/${fileName}.html`,
        buttonLabel: 'Export',
      })
      if (!canceled && filePath1) {
        const html = await prepareHTML(textRef.current, filePath)
        vmd.fs.writeFileSync(filePath1, html)
      }
    }
    vmd.on('exportHtml', exportToHtml)
    return () => vmd.off('exportHtml', exportToHtml)
  }, [])

  useEffect(() => {
    const exportPdf = async (): Promise<void> => {
      const filePath = filePathRef.current
      const fileName = filePath ? vmd.path.parse(filePath)['name'] : filePath
      const { canceled, filePath: filePath1 } = await ipcRenderer.invoke('show-save-dialog', {
        defaultPath: `*/${fileName}.pdf`,
        buttonLabel: 'Export',
      })
      if (!canceled && filePath1) {
        const html = await preparePDF(textRef.current, filePath)
        vmd.fs.writeFileSync(filePath1, html)
      }
    }
    vmd.on('exportPdf', exportPdf)
    return () => vmd.off('exportPdf', exportPdf)
  }, [])

  // desktop section - start
  useEffect(() => {
    const handlerContent = async (
      _,
      { content, filePath: newFilePath, editorState: savedEditorState, openInPreview },
    ) => {
      try {
        // Check if current file has unsaved changes
        if (isTextChanged) {
          const confirmResult = await ipcRenderer.invoke('show-message-box', {
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
              vmd.saveFile({ content: textRef.current, filePath })
            })
          }
          // If response === 1 (Discard), continue without saving
        }

        setFilePath(newFilePath)
        textRef.current = content
        updateText(content)
        setTextChanged(false)

        // Reset view mode before applying new state
        setPreviewMode(false)
        setHalfPreviewMode(false)

        // Restore view mode: per-file saved → openInPreview setting → editor
        if (savedEditorState && (savedEditorState.isPreviewMode || savedEditorState.isHalfPreviewMode)) {
          if (savedEditorState.isPreviewMode) setPreviewMode(true)
          if (savedEditorState.isHalfPreviewMode) setHalfPreviewMode(true)
        } else if (openInPreview && newFilePath) {
          setPreviewMode(true)
        }
        setInitialEditorState(savedEditorState || {})
      } catch (error) {
        console.error('Error in handlerContent:', error)
        // Fallback: load the new file anyway
        setFilePath(newFilePath)
        textRef.current = content
        updateText(content)
        setTextChanged(false)
      }
    }
    vmd.on('file', handlerContent)
    return () => {
      vmd.off('file', handlerContent)
    }
  }, [isTextChanged, filePath])

  // Handle external file changes (file watcher in main process)
  useEffect(() => {
    const handleFileChangedOnDisk = (_, { content }) => {
      // Save cursor position before replacing text
      const savedCursor = editorStateRef.current.cursorOffset ?? 0

      textRef.current = content
      updateText(content)
      setTextChanged(false)

      // Restore cursor position and focus after React re-render + CodeMirror update
      requestAnimationFrame(() => {
        const view = editorComponentRef.current?.editor?.current?.view
        if (view) {
          const maxPos = view.state.doc.length
          const clampedPos = Math.min(savedCursor, maxPos)
          view.dispatch({ selection: { anchor: clampedPos } })
          view.focus()
        }
      })
    }
    vmd.on('file-changed-on-disk', handleFileChangedOnDisk)
    return () => {
      vmd.off('file-changed-on-disk', handleFileChangedOnDisk)
    }
  }, [])

  // Cache for resolved =include sources, keyed by absolute path. Each entry
  // stores the source text and the mtime observed when read. On every
  // resolution we stat the file: if mtime is unchanged we serve from cache,
  // otherwise we re-read. fs.statSync is fast enough for per-render checks
  // and saves the larger cost of re-parsing the included document.
  const includeCacheRef = React.useRef<Map<string, { source: string; mtime: number }>>(new Map())
  // Cache for glob expansion results, keyed by `baseDir|pattern`. Walking
  // the filesystem is the slowest step in =include resolution; the same
  // glob is otherwise re-evaluated on every preview re-render (parent
  // state changes, scroll, etc.), which stalls the initial load. Cache
  // is cleared on file open and on watcher events so newly created or
  // deleted files are picked up.
  const expandCacheRef = React.useRef<Map<string, string[]>>(new Map())
  const [includeChangeVersion, setIncludeChangeVersion] = useState(0)

  // Clear caches whenever the active file changes. Stale entries from a
  // previous document should not bleed into the new one.
  React.useEffect(() => {
    includeCacheRef.current.clear()
    expandCacheRef.current.clear()
  }, [filePath])

  // Listen for filesystem changes to files referenced by =include. The
  // main process emits this event from the recursive directory watcher
  // around the active document.
  //
  // Only Podlite-shaped files (`.podlite`, `.pod6`, `.md`) can become
  // include targets, so non-text changes don't trigger preview rerenders.
  // We invalidate the matching cache entry (defensive: any path whose
  // resolved absolute form equals the event's absPath) and always bump
  // the version when an applicable file changes — `includeReader` then
  // re-stat's during the render and serves the cached source if mtime
  // is unchanged, so the cost of a forced re-render is one stat per
  // active include.
  React.useEffect(() => {
    const path = require('path')
    const handler = (_evt: unknown, payload: { absPath?: string } | undefined) => {
      const absPath = payload?.absPath
      if (!absPath) return
      const ext = path.extname(absPath).toLowerCase()
      if (!['.podlite', '.pod6', '.md', '.markdown'].includes(ext)) return
      const target = path.resolve(absPath)
      for (const k of Array.from(includeCacheRef.current.keys())) {
        if (path.resolve(k) === target) includeCacheRef.current.delete(k)
      }
      // The expansion cache holds lists of files that match a glob; a
      // newly created or deleted file changes those lists, so flush it.
      expandCacheRef.current.clear()
      // Bump the version unconditionally: a file that previously had no
      // cache entry (e.g. a brand-new file matching a glob pattern) won't
      // be picked up unless we re-render. The mtime check inside
      // includeReader keeps the cost of forced re-renders to one stat
      // per active include.
      setIncludeChangeVersion(v => v + 1)
    }
    vmd.on('include-target-changed', handler)
    return () => {
      vmd.off('include-target-changed', handler)
    }
  }, [])

  const includeReader: IncludeReader = React.useCallback((targetPath, baseDir) => {
    try {
      const path = require('path')
      const fs = require('fs')
      const absPath = path.isAbsolute(targetPath)
        ? targetPath
        : path.resolve(baseDir ?? '.', targetPath)
      const stat = fs.statSync(absPath)
      const mtime = stat.mtimeMs
      const cached = includeCacheRef.current.get(absPath)
      if (cached && cached.mtime === mtime) return cached.source
      const source = fs.readFileSync(absPath, 'utf8')
      includeCacheRef.current.set(absPath, { source, mtime })
      return source
    } catch {
      return null
    }
  }, [])

  const expandPaths: ExpandPaths = React.useCallback((pattern, baseDir) => {
    const cacheKey = `${baseDir ?? ''}|${pattern}`
    const cached = expandCacheRef.current.get(cacheKey)
    if (cached) return cached
    try {
      const path = require('path')
      const fs = require('fs')
      const absRoot = path.isAbsolute(pattern)
        ? path.parse(pattern).root
        : path.resolve(baseDir ?? '.')

      // Convert a glob to a RegExp anchored to a normalised forward-slash path.
      //   **/   →  (?:.*/)?     zero or more directory segments
      //   **    →  .*           any chars including /
      //   *     →  [^/]*        any chars within a segment
      //   ?     →  [^/]         single char within a segment
      const globToRe = (g: string): RegExp => {
        let re = ''
        let i = 0
        while (i < g.length) {
          const c = g[i]
          const next = g[i + 1]
          if (c === '*' && next === '*' && g[i + 2] === '/') {
            re += '(?:.*/)?'
            i += 3
          } else if (c === '*' && next === '*') {
            re += '.*'
            i += 2
          } else if (c === '*') {
            re += '[^/]*'
            i += 1
          } else if (c === '?') {
            re += '[^/]'
            i += 1
          } else if (/[\\^$.()+|{}[\]]/.test(c)) {
            re += '\\' + c
            i += 1
          } else {
            re += c
            i += 1
          }
        }
        return new RegExp(`^${re}$`)
      }

      const normalize = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '')
      const targetGlob = path.isAbsolute(pattern)
        ? normalize(pattern)
        : normalize(path.resolve(baseDir ?? '.', pattern)).replace(normalize(absRoot) + '/', '')
      const rx = globToRe(targetGlob)

      // Walk only the smallest subtree that could possibly match — the
      // segments preceding the first glob character. For
      // `00-DayByDay/2026/04/*.podlite` this is `00-DayByDay/2026/04/`,
      // which avoids descending into thousands of unrelated files in a
      // large knowledge base.
      const segments = targetGlob.split('/')
      let fixedDepth = 0
      for (let i = 0; i < segments.length - 1; i++) {
        if (/[*?[]/.test(segments[i])) break
        fixedDepth++
      }
      const fixedPrefix = segments.slice(0, fixedDepth).join('/')
      const walkRoot = fixedPrefix ? path.join(absRoot, fixedPrefix) : absRoot

      const matches: string[] = []
      const walk = (dir: string) => {
        let entries: any[]
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true })
        } catch {
          return
        }
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            walk(full)
          } else if (entry.isFile()) {
            const rel = normalize(path.relative(absRoot, full))
            if (rx.test(rel)) matches.push(full)
          }
        }
      }
      walk(walkRoot)
      expandCacheRef.current.set(cacheKey, matches)
      return matches
    } catch {
      return []
    }
  }, [])

  const onConvertSourceComponent = (text: string) => {
    return onConvertSource(text, filePath, false, includeReader, expandPaths)
  }

  const saveAsset: SaveAssetCallback = React.useCallback(async (file, source) => {
    const currentPath = filePathRef.current
    if (!currentPath) {
      await vmd.showMessageBox({
        type: 'info',
        message: 'Save the file first',
        detail: 'Images are stored in a "media/" folder next to your document. Save this file to a location, then paste or drop the image again.',
        buttons: ['OK'],
      })
      return null
    }
    const path = vmd.path
    const fs = vmd.fs
    const mediaDir = path.join(path.dirname(currentPath), 'media')

    // If a dropped file already lives inside this document's media/ folder,
    // just reference it in place — don't copy or rename. Electron 32+ removed
    // the legacy `File.path` property; use webUtils.getPathForFile() instead.
    if (source === 'drop') {
      const existingPath = vmd.getPathForFile ? vmd.getPathForFile(file) : (file as { path?: string }).path
      if (existingPath) {
        const resolved = path.resolve(existingPath)
        const absMediaDir = path.resolve(mediaDir)
        const prefix = absMediaDir + path.sep
        if (resolved === absMediaDir || resolved.startsWith(prefix)) {
          return path.join('media', path.relative(absMediaDir, resolved))
        }
      }
    }

    fs.mkdirSync(mediaDir, { recursive: true })

    const mimeToExt: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    }

    let filename: string
    if (source === 'paste') {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const stamp =
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
        `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
      const ext = mimeToExt[file.type] || 'png'
      filename = `${stamp}-screenshot.${ext}`
    } else {
      const baseName = file.name || 'image'
      const dot = baseName.lastIndexOf('.')
      const stem = dot > 0 ? baseName.slice(0, dot) : baseName
      const ext = dot > 0 ? baseName.slice(dot + 1) : mimeToExt[file.type] || 'bin'
      let candidate = `${stem}.${ext}`
      let n = 2
      while (fs.existsSync(path.join(mediaDir, candidate))) {
        candidate = `${stem}-${n}.${ext}`
        n++
      }
      filename = candidate
    }

    const fullPath = path.join(mediaDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(fullPath, buffer)
    return path.join('media', filename)
  }, [])

  return (
    <Editor2
      ref={editorComponentRef}
      onChange={(content: string) => {
        updateTextFromEditor(content)
        if (!isTextChanged) setTextChanged(true)
      }}
      onOpenLink={(url: string) => {
        console.log(url)

        let processedUrl = url
        // If URL contains |, use all text after |
        if (url.includes('|')) {
          processedUrl = url.split('|').slice(1).join('|').trim()
        }

        // Handle file scheme with relative paths
        if (processedUrl?.startsWith('file:')) {
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
      initialEditorState={initialEditorState}
      onEditorStateChange={setEditorState}
      onSaveAsset={saveAsset}
    />
  )
}
export default App
