import * as React from 'react'
import * as ReactDOM from 'react-dom'

import Editor from './components/editor'
import App from './components/App'
const render = (Component) => {
  ReactDOM.render(
    <Component />,
    document.getElementById('root')
  )
}

render(App)
