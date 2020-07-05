import * as React from 'react'
import * as ReactDOM from 'react-dom'

import Editor from './components/editor'

const render = (Component) => {
  ReactDOM.render(
    <Component />,
    document.getElementById('root')
  )
}

render(Editor)
