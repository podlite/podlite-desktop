import * as React from 'react'
import { HashRouter, Route, Switch } from 'react-router-dom'

import Root from './pages/root'
import Start from './pages/start'

//@ts-ignore
vmd.on('file', () => console.log('handlerContent2'))
export default () => {
  return (
    <HashRouter hashType="noslash">
      <Switch>
        <Route exact path="/" component={Start} />
        <Route exact path="/start" component={Start} />
        <Route component={() => <h1>204 No Content</h1>} />
      </Switch>
    </HashRouter>
  )
}
