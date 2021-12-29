const createElement = (component1, props, ...children)=>{
    const isIntrinsicComponent = (component)=>typeof component === "string"
    ;
    if (isIntrinsicComponent(component1)) {
        return {
            name: component1,
            props,
            children: children.length === 1 ? children[0] : children
        };
    }
    return component1({
        children,
        ...props
    });
};
const render = (target, context1, ...jsxElements)=>{
    const isTextElement = (element)=>typeof element === "string" || typeof element === "boolean" || typeof element === "number"
    ;
    const isDOMElement = (element)=>"name" in element
    ;
    const isStatefulElement = (element)=>"next" in element
    ;
    jsxElements.forEach((jsxElement, index)=>{
        if (isTextElement(jsxElement)) {
            const node = document.createTextNode(`${jsxElement}`);
            const old = context1[index];
            context1[index] = node;
            if (old) target.replaceChild(node, old);
            else target.appendChild(node);
        } else if (isDOMElement(jsxElement)) {
            const { name: name1 , props , children  } = jsxElement;
            const node = document.createElement(name1);
            if (props) Object.keys(props).forEach((name)=>node.setAttribute(name, `${props[name]}`)
            );
            if (children) (Array.isArray(children) ? children : [
                children
            ]).forEach((child)=>render(node, [], child)
            );
            const old = context1[index];
            context1[index] = node;
            if (old) target.replaceChild(node, old);
            else target.appendChild(node);
        } else if (isStatefulElement(jsxElement)) {
            const context = [];
            (async ()=>{
                for await (const element of {
                    [Symbol.asyncIterator]: ()=>jsxElement
                }){
                    render(target, context, element);
                }
            })();
        } else if (Array.isArray(jsxElement)) {
            render(target, [], ...jsxElement);
        } else {
            console.log(`unsupported element`, jsxElement);
        }
    });
};
const ParentElement = ({ children  })=>createElement("div", {
        id: "parent"
    }, children)
;
const Hello = ({ to  })=>createElement("div", null, "hello, ", to, "!!!")
;
async function* CounterElement({ delay , initial , children  }) {
    let counter = initial;
    while(true){
        await new Promise((resolve)=>setTimeout(resolve, delay)
        );
        yield createElement("div", null, createElement("div", null, counter++), children);
    }
}
render(document.body, [], createElement(CounterElement, {
    delay: 1000,
    initial: 1000
}, createElement(ParentElement, null, createElement(Hello, {
    to: "world"
}))));
