
export const  PODLITE_CSS =
`.EditorApp {
    /* text-align: center; */
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  .App-logo {
    height: 40vmin;
    pointer-events: none;
  }
  
  @media (prefers-reduced-motion: no-preference) {
    .App-logo {
      animation: App-logo-spin infinite 20s linear;
    }
  }
  
  .App-header {
    background-color: #282c34;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: calc(10px + 2vmin);
    color: white;
  }
  
  .App-link {
    color: #61dafb;
  }
  .layout {
    position: absolute;
    width: 100%;
    /* height: 100%; */
  }
  .Editor {
    text-align: left;
    white-space: pre-wrap;
      word-break: break-word;
      word-wrap: break-word;
  }
  
  [contenteditable]:focus {
    outline: 0px solid transparent;
  }
  .layout__panel {
    position: relative;
    width: 100%;
    height: 100%;
    flex: none;
    overflow: hidden;
  }
  
  .flex--row {
    flex-direction: row;
  }
  .flex {
    display: flex;
  }
  
  .CodeMirror {
    height: auto;
    font-family: inherit;
  }
  
  pre {
    overflow-x: auto;
    white-space: pre-wrap;
    white-space: -moz-pre-wrap;
    white-space: -pre-wrap;
    white-space: -o-pre-wrap;
    word-wrap: break-word;
  }
  .title {
    margin:0em;
  }
  .Editorleft {
    border-right: 1px dotted lightgrey;
    white-space: pre-wrap;
    word-break: break-word;
    word-wrap: break-word;
    width: 50%;
    font-size: 15px;
    text-align: left;
  }
  
  /* .Editorright {
    text-align: left;
    word-break: break-word;
    word-wrap: break-word;
    margin : 0 1em;
    font-size: 15px;
  } */
  
  /* Start pod6 */ 
  body {
    margin: 0;
    font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }
  
  
  pre {
    padding: 9.5px;
    display: block;
    word-break: break-all;
    word-wrap: break-word;
    background-color:  #f8f8f8;
    border-radius:  4px;
  }
  
  code {
    padding: 0;
    font-size: 15px;
    color: inherit;
    white-space: pre-wrap;
    background-color: transparent;
    border-radius: 0;
  }
  
  img {
    max-width: 1024px;
  }
  
  table {
    word-break: normal;
    min-width: 70%;
    max-width: 100%;
    margin: 0 auto;
    border-spacing: 0;
    border-collapse: collapse;
    text-align: center;
    margin-top: 2em;
  }
  table caption {
    margin-bottom: 0.8em;
  }
  
  table tbody tr:hover {
    background-color:  #eee;
    -webkit-transition: .5s;
    transition: .5s
  }
  
  tr th {
    vertical-align: bottom;
    border-bottom: 2px solid #eee;
  }
  
  td {
    padding: 8px;
    border: 1px solid #eee;
  }
  
  .footnote a {
    text-decoration: none;
  }
  .footnotes {
  border-top-style: solid;
  border-top-width: 1px;
  border-top-color: #eee;
  }
  
  img {
    display: block;
    margin: 0 auto;
    max-width: 100%;
  }
  
  .shadow {
    -webkit-box-shadow: 3px 3px 5px 6px #ccc;  /* Safari 3-4, iOS 4.0.2 - 4.2, Android 2.3+ */
    -moz-box-shadow:    3px 3px 5px 6px #ccc;  /* Firefox 3.5 - 3.6 */
    box-shadow:         3px 3px 5px 6px #ccc;  /* Opera 10.5, IE 9, Firefox 4+, Chrome 6+, iOS 5 */
  }
  .box {
    box-shadow:
    0 2.8px 2.2px rgba(0, 0, 0, 0.034),
    0 6.7px 5.3px rgba(0, 0, 0, 0.048),
    0 12.5px 10px rgba(0, 0, 0, 0.06),
    0 22.3px 17.9px rgba(0, 0, 0, 0.072),
    0 41.8px 33.4px rgba(0, 0, 0, 0.086),
    0 100px 80px rgba(0, 0, 0, 0.12)
  ;
    margin: 100px auto;
    background: white;
    border-radius: 5px;
  }
  
  .video {
    max-width: 90%;
    margin: 0 auto;
  }
  
  div.video video{
    width: 100%;
    outline: none;
    border: none;
  }
  
  /* plugins */
  .mermaid svg {
    display: block;
    margin: auto;
  }
  
  /* End of pod6 */ 
  
  
  
  .CodeMirror {
    height: auto;
    font-family: inherit;
  }
  
  .title {
    margin:0em;
  }

  .Editorright img  {
        display: block;
        margin: 0 auto;
        max-width: 100%;
  }
  
  
  .layoutPreview .Editorright {
    position: absolute;
    width: 80%;
    /* z-index: -999999; */
    float: right;
    top: 0;
    right: 0;
    width: 100%;
    background-color: white;
  }
  
  .layoutPreview .content {
    width: 90%;
    margin: 0 auto;
    // height: 100%;
    // overflow-y: initial;
  }
 
  `