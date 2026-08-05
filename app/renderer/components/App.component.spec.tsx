// block ids are random, and they would land in the snapshots below
jest.mock('nanoid', () => ({ nanoid: () => 'id' }))

import { onConvertSource } from './App'
import React from 'react'
import ReactDOM from 'react-dom'

const root = document.body.appendChild(document.createElement('div'))

function render(jsx) {
  return ReactDOM.render(jsx, root)
}

afterEach(() => ReactDOM.unmountComponentAtNode(root))

it('accepts =Image', () => {
  render(
    onConvertSource(
      `
=Image test.jpg
sdsd
`,
      '/tmp/test.pod6',
    ).result,
  )
  expect(root.innerHTML).toMatchInlineSnapshot(`
    <div class="line-src"
         data-line="2"
         id="line-2"
    >
      <div class="image_block"
           id="id"
      >
        <img src="file:///tmp/test.jpg">
        <div class="caption">
          sdsd
        </div>
      </div>
    </div>
  `)
})

it('accepts =alias', () => {
  render(
    onConvertSource(
      `
  =alias img test.jpg1
  =para
  test A<img>
  `,
      '/tmp/test.pod6',
    ).result,
  )
  expect(root.innerHTML).toMatchInlineSnapshot(`
    <div class="line-src"
         data-line="3"
         id="line-3"
    >
      <div id="id">
        <div class="line-src"
             data-line="3"
             id="line-3"
        >
          <p>
            test test.jpg1
          </p>
        </div>
      </div>
    </div>
  `)
})
