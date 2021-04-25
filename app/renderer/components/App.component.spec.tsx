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
