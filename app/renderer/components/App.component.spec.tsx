import { onConvertSource } from "./App";
import React from "react";
import ReactDOM from "react-dom";

const root = document.body.appendChild(document.createElement("div"));

function render(jsx) {
  return ReactDOM.render(jsx, root);
}

afterEach(() => ReactDOM.unmountComponentAtNode(root));

it("accepts =Image", () => {
  render(
    onConvertSource(
      `
=Image test.jpg
sdsd
`,
      "/tmp/test.pod6"
    ).result
  );
  expect(root.innerHTML).toMatchInlineSnapshot(
    `<img src="file:////tmp/test.jpg">`
  );
});

it("accepts =alias", () => {
  render(
    onConvertSource(
      `
  =alias img test.jpg1
  =para
  test A<img>
  `,
      "/tmp/test.pod6"
    ).result
  );
  expect(root.innerHTML).toMatchInlineSnapshot(`
    <div class="line-src"
         data-line="2"
         id="line-2"
    >
      <p>
        =alias img test.jpg1
      </p>
    </div>
    <div class="line-src"
         data-line="3"
         id="line-3"
    >
      <div>
        <div class="line-src"
             data-line="3"
             id="line-3"
        >
          <p>
            test
            <code>
              A&lt;img&gt;
            </code>
          </p>
        </div>
      </div>
    </div>
  `);
});
