import * as React from 'react'
import * as ReactDOM from 'react-dom'

import Router from './router'
import ExampleApp from './components/exampleapp'
// import ExampleApp2 from './components/exampleapp2'
import Editor from './components/editor'

// const App = () => <div><span>{React.version} - </span><ExampleApp2 /></div>

const render = (Component) => {
  ReactDOM.render(
    <Component />,
    document.getElementById('root')
  )
}

// render(Router)
// render(ExampleApp)
render(Editor)
