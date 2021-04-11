import * as React from 'react'
import Editor from './EditorNG'
import './App.css';
import './Editor.scss'
import { useMemo } from 'react';
import toAny  from 'pod6/built/exportAny'
import { parse } from 'pod6';
// import {AstToReact} from './ast-to-react'

const content = `
=begin Dia
graph LR
A --- B
B-->C[fa:fa-ban forbidden]
B-->D(fa:fa-spinner);
=end Dia
test

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