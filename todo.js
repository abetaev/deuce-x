const kebabize = (input)=>input.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
;
const createElement = (component1, props, ...children)=>{
    const isIntrinsicComponent = (component)=>typeof component === "string"
    ;
    if (isIntrinsicComponent(component1)) return {
        name: component1,
        props,
        children: children.length === 1 ? children[0] : children
    };
    return component1({
        children,
        ...props
    });
};
function createSlot(value) {
    if (value === null) return absentSlot;
    if (Array.isArray(value)) return createPluralSlot(value);
    if (typeof value === "object") {
        if ("name" in value) return createStaticSlot(value);
        if ("next" in value) return createActiveSlot(value);
        if ("then" in value) return createFutureSlot(value);
    } else if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") return createSimpleSlot(value);
    throw new Error(`unknown element: type="${typeof value}", data="${value}"`);
}
const absentSlot = {
    mount (render1) {
        render1([]);
    },
    unmount () {}
};
function createSimpleSlot(source) {
    return {
        mount (render2) {
            render2([
                document.createTextNode(`${source}`)
            ]);
        },
        unmount () {}
    };
}
function createStaticSlot(source) {
    let children;
    return {
        mount (render3) {
            const element = document.createElement(source.name);
            function update(replacement) {
                element.replaceChildren(...replacement);
            }
            if (source.children) {
                children = createSlot(source.children);
                children.mount(update);
            }
            function transformStyle(input) {
                return Object.keys(input).map((key)=>`${kebabize(key)}: ${input[key]}`
                ).join('; ');
            }
            if (source.props) Object.keys(source.props).map((name)=>[
                    name,
                    source.props[name]
                ]
            ).forEach(([name, value])=>{
                if (typeof value === "function" && name === "socket") value(element);
                else if (Array.isArray(value) && name === "class") element.setAttribute("class", value.join(' '));
                else if (typeof value === "object" && value && name === "style") element.setAttribute("style", transformStyle(value));
                else if (typeof value === "function" && name.match(/on[A-Z].*/)) element.addEventListener(name.substring(2).toLowerCase(), value);
                else element.setAttribute(name.toLowerCase(), `${value}`);
            });
            render3([
                element
            ]);
        },
        unmount () {
            children?.unmount();
        }
    };
}
function createPluralSlot(source) {
    const allNodes = [];
    const slots = [];
    return {
        mount (render4) {
            const updateSlot = (index, nodes)=>{
                allNodes[index] = nodes;
                render4(allNodes.flat());
            };
            source.map(createSlot).map((slot, index)=>{
                slots[index] = slot;
                slot.mount((nodes)=>updateSlot(index, nodes)
                );
            });
        },
        unmount () {
            slots.forEach((slot)=>slot.unmount()
            );
        }
    };
}
function createFutureSlot(source) {
    let live = true;
    let slot;
    return {
        mount (update) {
            source.then((element)=>{
                if (live) {
                    slot = createSlot(element);
                    slot.mount(update);
                }
            });
        },
        unmount () {
            live = false;
            slot?.unmount();
        }
    };
}
function createActiveSlot(source) {
    let live = true;
    let slot = absentSlot;
    return {
        mount (render5) {
            (async ()=>{
                let result;
                do {
                    result = await source.next();
                    slot.unmount();
                    if (result.value !== undefined) slot = createSlot(result.value);
                    else slot = absentSlot;
                    slot.mount(render5);
                }while (live && !result.done)
            })();
        },
        unmount () {
            live = false;
            slot?.unmount();
        }
    };
}
function render(parent, element) {
    const update = (children)=>parent.replaceChildren(...children)
    ;
    createSlot(element).mount(update);
}
const Fragment = ({ children  })=>children
;
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
    let release = ()=>{};
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
    const View = ()=>createElement("div", {
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
        return createElement(Fragment, null, createElement("input", {
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
        }));
    };
    const [pause, update] = useWait();
    function toggleEdit() {
        editing = !editing;
        update();
    }
    while(true){
        yield createElement("li", null, createElement(Group, null, createElement(IconButton, {
            icon: item.done ? 'check_box' : 'check_box_outline_blank',
            onClick: onToggle
        }), editing ? createElement(Edit, null) : createElement(View, null), createElement(IconButton, {
            icon: "delete",
            class: "danger",
            onClick: onDelete
        })));
        await pause();
    }
}
async function* TODOList({ items , onChange , inputSource , filterSource  }) {
    const [remove, removeSource] = usePipe();
    const [toggle, toggleSource] = usePipe();
    const eventSource = useMux({
        remove: removeSource,
        input: inputSource,
        toggle: toggleSource,
        filter: filterSource
    });
    let searchFilter = "";
    let statusFilter = undefined;
    const List = ()=>createElement("ul", null, items.filter(({ text  })=>text.toLowerCase().includes(searchFilter)
        ).filter(({ done  })=>statusFilter === undefined || !!done === statusFilter
        ).map((item, id)=>createElement(TODOItem, {
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
            case "filter":
                switch(message.value.type){
                    case "search":
                        searchFilter = message.value.query;
                        break;
                    case "status":
                        statusFilter = message.value.query;
                        break;
                }
                break;
        }
        onChange(items);
        yield createElement(List, null);
    }
}
const TODO = ({ source  })=>{
    const items1 = JSON.parse(localStorage.getItem(source) || "[]");
    const [addTODO, todoPipe] = usePipe();
    const [filterTODO, filterPipe] = usePipe();
    const [inputSocket, inputPlug] = useLink();
    const [searchFilterSocket, searchFilterPlug] = useLink();
    const [statusFilterSocket, statusFilterPlug] = useLink();
    async function create() {
        const input = await inputPlug;
        const value = input.value;
        input.value = "";
        addTODO(value);
    }
    async function searchFilter() {
        const input = await searchFilterPlug;
        filterTODO({
            type: "search",
            query: input.value
        });
    }
    async function switchStatusFilter() {
        const button = await statusFilterPlug;
        switch(button.innerText){
            case "indeterminate_check_box":
                button.innerText = "check_box";
                filterTODO({
                    type: "status",
                    query: true
                });
                break;
            case "check_box":
                button.innerText = "check_box_outline_blank";
                filterTODO({
                    type: "status",
                    query: false
                });
                break;
            case "check_box_outline_blank":
                button.innerText = "indeterminate_check_box";
                filterTODO({
                    type: "status"
                });
                break;
        }
    }
    return createElement("div", {
        class: "todo"
    }, createElement("header", null, createElement(Group, null, createElement(IconButton, {
        icon: "indeterminate_check_box",
        class: "secondary",
        onClick: switchStatusFilter,
        socket: statusFilterSocket
    }), createElement("input", {
        type: "text",
        socket: searchFilterSocket,
        onInput: searchFilter,
        placeholder: "type to search for memo"
    }), createElement(IconButton, {
        icon: "clear",
        class: "danger",
        onClick: async ()=>{
            (await searchFilterPlug).value = "";
        }
    }))), createElement("main", null, createElement(TODOList, {
        items: items1,
        inputSource: todoPipe,
        filterSource: filterPipe,
        onChange: (items)=>localStorage.setItem(source, JSON.stringify(items))
    })), createElement("footer", null, createElement(Group, null, createElement("input", {
        type: "text",
        socket: inputSocket,
        onKeyDown: ({ key  })=>key === "Enter" && create()
        ,
        size: 1
    }), createElement(IconButton, {
        icon: "add",
        class: "primary",
        onClick: create
    }))));
};
render(document.body, createElement(TODO, {
    source: "todo"
}));
