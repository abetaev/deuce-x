/// <reference no-default-lib="true" />
/// <reference lib="DOM" />
/// <reference lib="ES2021" />
/// <reference lib="deno.ns" />

import { Document as DocumentImpl, Node, ElementCreationOptions } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

class DocumentMock extends DocumentImpl {

  createElement(tagname: string, options?: ElementCreationOptions) {
    const element = super.createElement(tagname, options)

    Object.defineProperty(element, "replaceChildren", {
      value: (...children: Node[]) => {
        while (element.firstChild)
          element.removeChild(element.firstChild)
        children.forEach(child => element.appendChild(child))
      }
    })

    return element
  }

}

globalThis.document = new DocumentMock as unknown as Document
