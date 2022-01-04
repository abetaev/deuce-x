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
const render = (target, children1, previous = [])=>{
    const current = [];
    const cleanState = (state)=>{
        if (state.type === "static") state.children.forEach((child)=>cleanState(child)
        );
        else if (state.type === "active") state.stop();
        else console.warn('future state was not resolved', state);
    };
    const createStaticTextState = (data)=>({
            type: "static",
            node: document.createTextNode(data ? `${data}` : ""),
            children: []
        })
    ;
    const createStaticNodeState = (data)=>{
        const { name: name1 , props , children  } = data;
        const node = document.createElement(name1);
        function transformStyle(input) {
            return Object.keys(input).map((key)=>`${kebabize(key)}: ${input[key]}`
            ).join(';');
        }
        if (props) Object.keys(props).map((name)=>[
                name,
                props[name]
            ]
        ).forEach(([name, value])=>{
            if (typeof value === "function" && name === "socket") value(node);
            else if (Array.isArray(value) && name === "class") node.setAttribute("class", value.join(' '));
            else if (typeof value === "object" && value && name === "style") node.setAttribute("style", transformStyle(value));
            else if (typeof value === "function" && name.match(/on[A-Z].*/)) node.addEventListener(name.substring(2).toLowerCase(), value);
            else node.setAttribute(name.toLowerCase(), `${value}`);
        });
        return {
            type: "static",
            node,
            children: children ? render(node, children) : []
        };
    };
    const createActiveState = (iterator)=>{
        let live = false;
        const substate = createStaticTextState("💩");
        return {
            type: "active",
            start: async ()=>{
                if (live) return;
                let context = [
                    substate
                ];
                let result = await iterator.next();
                live = true;
                while(live && !result.done){
                    context = render(target, result.value, context);
                    result = await iterator.next();
                }
                context.forEach((node)=>cleanState(node)
                );
            },
            stop: ()=>live = false
            ,
            substate
        };
    };
    const createFutureState = (promise)=>{
        let substate = createStaticTextState("💩");
        return {
            type: "future",
            promise: promise.then((element)=>render(target, element, [
                    substate
                ])[0]
            ).then((state)=>substate = state
            ),
            substate: ()=>substate
        };
    };
    const isTextElement = (element)=>typeof element === "string" || typeof element === "boolean" || typeof element === "number" || typeof element === "undefined"
    ;
    const isNodeElement = (element)=>element !== null && typeof element === "object" && "name" in element
    ;
    const isIteratorElement = (element)=>element !== null && typeof element === "object" && "next" in element
    ;
    const isPromiseElement = (element)=>element !== null && typeof element === "object" && "then" in element
    ;
    children1 && (Array.isArray(children1) ? children1 : [
        children1
    ]).forEach((jsxElement, index)=>{
        if (isTextElement(jsxElement)) current[index] = createStaticTextState(jsxElement);
        else if (isNodeElement(jsxElement)) current[index] = createStaticNodeState(jsxElement);
        else if (isIteratorElement(jsxElement)) current[index] = createActiveState(jsxElement);
        else if (isPromiseElement(jsxElement)) current[index] = createFutureState(jsxElement);
        else if (jsxElement === null) current[index] = createStaticTextState("💩");
        else throw `unsupported element ${typeof jsxElement}: ${JSON.stringify(jsxElement)}`;
    });
    const mergeState = (currentState, previousState)=>{
        function getNode(state) {
            if (state) switch(state.type){
                case "active":
                    return state.substate.node;
                case "future":
                    return getNode(state.substate());
                case "static":
                    return state.node;
            }
        }
        const replacement = getNode(currentState) || document.createTextNode("💩");
        const placeholder = getNode(previousState);
        if (placeholder) target.replaceChild(replacement, placeholder);
        else target.appendChild(replacement);
        if (currentState.type === "active") currentState.start();
        previousState && cleanState(previousState);
    };
    for(let index = 0; index < current.length; index++)mergeState(current[index], previous[index]);
    for(let index1 = current.length; index1 < previous.length; index1++)cleanState(previous[index1]);
    return current;
};
function kebabize(input) {
    return input.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}
function useEvent() {
    let subscriptions = [];
    return [
        (event)=>subscriptions.forEach((handle)=>handle(event)
            )
        ,
        (handler)=>{
            subscriptions.push(handler);
            return ()=>subscriptions = subscriptions.filter((that)=>that !== handler
                )
            ;
        }
    ];
}
function useWait() {
    let release = ()=>{
    };
    return [
        ()=>new Promise((resolve)=>release = resolve
            )
        ,
        ()=>release()
    ];
}
function usePipe() {
    const [send, onReceive] = useEvent();
    return [
        send,
        async function*() {
            const [lock, open] = useWait();
            let value = undefined;
            onReceive((newValue)=>{
                value = newValue;
                open();
            });
            while(true){
                await lock();
                if (value !== undefined) yield value;
            }
        }
    ];
}
function useMux(input) {
    const [send, target] = usePipe();
    Object.keys(input).map((name)=>name
    ).forEach(async (type)=>{
        for await (const value of input[type]())send({
            type,
            value
        });
    });
    return target;
}
function useLink() {
    let socket = undefined;
    const plug = new Promise((resolve)=>socket = resolve
    );
    if (!socket) throw 'unable to create link';
    return [
        socket,
        plug
    ];
}
const Group = ({ children  })=>createElement("div", {
        class: "group"
    }, children)
;
const IconButton = ({ icon , class: className , ...rest })=>createElement("button", Object.assign({
        class: [
            "material-icons",
            ...Array.isArray(className) ? className : className ? [
                className
            ] : []
        ]
    }, rest), icon)
;
async function* TODOItem({ onDelete , onToggle , onChange , item  }) {
    let editing = false;
    const View = ()=>createElement("span", {
            onClick: ()=>{
                editing = true;
                update();
            }
        }, item.text)
    ;
    const Edit = ()=>{
        const [socket, plug] = useLink();
        async function save() {
            const input = await plug;
            const { value  } = input;
            console.log(value);
            onChange(value);
            toggleEdit();
        }
        return createElement("span", null, createElement(Group, null, createElement("input", {
            value: item.text,
            socket: socket,
            onKeyDown: ({ key  })=>{
                switch(key){
                    case "Enter":
                        save();
                        break;
                    case "Escape":
                        toggleEdit();
                        break;
                }
            },
            size: 1
        }), createElement(IconButton, {
            icon: "save",
            class: "primary",
            onClick: save
        }), createElement(IconButton, {
            icon: "clear",
            class: "secondary",
            onClick: toggleEdit
        })));
    };
    const [pause, update] = useWait();
    function toggleEdit() {
        editing = !editing;
        update();
    }
    while(true){
        yield createElement("li", null, createElement(IconButton, {
            icon: item.done ? 'check_box' : 'check_box_outline_blank',
            onClick: onToggle
        }), editing ? createElement(Edit, null) : createElement(View, null), createElement(IconButton, {
            icon: "delete",
            class: "danger",
            onClick: onDelete
        }));
        await pause();
    }
}
async function* TODOList({ items , onChange , inputSource  }) {
    const [remove, removeSource] = usePipe();
    const [toggle, toggleSource] = usePipe();
    const eventSource = useMux({
        remove: removeSource,
        input: inputSource,
        toggle: toggleSource
    });
    const List = ()=>createElement("ul", null, items.map((item, id)=>createElement(TODOItem, {
                onDelete: ()=>remove(id)
                ,
                item: item,
                onToggle: ()=>toggle(id)
                ,
                onChange: (text)=>{
                    items[id].text = text;
                }
            })
        ))
    ;
    yield createElement(List, null);
    for await (const message of eventSource()){
        switch(message.type){
            case "input":
                items.push({
                    done: false,
                    text: message.value
                });
                break;
            case "remove":
                items.splice(message.value, 1);
                break;
            case "toggle":
                items[message.value].done = !items[message.value].done;
                break;
        }
        onChange(items);
        yield createElement(List, null);
    }
}
const TODO = ({ source  })=>{
    const items1 = JSON.parse(localStorage.getItem(source) || "[]");
    const [addMessage, messagePipe] = usePipe();
    const [socket, plug] = useLink();
    async function create() {
        const input = await plug;
        const value = input.value;
        input.value = "";
        addMessage(value);
    }
    return createElement("div", {
        class: "todo"
    }, createElement("header", null, "deuce-x TODO demo"), createElement("main", null, createElement(TODOList, {
        items: items1,
        inputSource: messagePipe,
        onChange: (items)=>localStorage.setItem(source, JSON.stringify(items))
    })), createElement("footer", null, createElement(Group, null, createElement(IconButton, {
        icon: "filter_list",
        onClick: ()=>alert("not implemented")
        ,
        class: "secondary"
    }), createElement("input", {
        type: "text",
        socket: socket,
        onKeyDown: ({ key  })=>key === "Enter" && create()
        ,
        size: 1
    }), createElement(IconButton, {
        icon: "add",
        class: "primary",
        onClick: create
    }))));
};
const Load = async ({ child  })=>{
    await new Promise((resolve)=>setTimeout(resolve, Math.random() * 1000)
    );
    return child;
};
render(document.body, createElement(Load, {
    child: createElement(TODO, {
        source: "todo"
    })
}));
