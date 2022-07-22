import {resolveComponent, TransitionGroup} from "vue";

function cached(fn) {
  const cache = Object.create(null);
  return function cachedFn(str) {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
}

const regex = /-(\w)/g;
const camelize = cached(str => str.replace(regex, (_, c) => c.toUpperCase()));


const tags = [
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "math",
  "menu",
  "menuitem",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rb",
  "rp",
  "rt",
  "rtc",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "slot",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "svg",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr"
];

function isHtmlTag(name) {
  return tags.includes(name);
}

function isTransition(name) {
  return ["transition-group", "TransitionGroup"].includes(name);
}

function isHtmlAttribute(value) {
  return (
      ["id", "class", "role", "style"].includes(value) ||
      value.startsWith("data-") ||
      value.startsWith("aria-") ||
      value.startsWith("on")
  );
}

function removeNode(node) {
  if (node.parentElement !== null) {
    node.parentElement.removeChild(node);
  }
}

function insertNodeAt(fatherNode, node, position) {
  const refNode =
      position === 0
          ? fatherNode.children[0]
          : fatherNode.children[position - 1].nextSibling;
  fatherNode.insertBefore(node, refNode);
}

const manageAndEmit = ["Start", "Add", "Remove", "Update", "End"];
const emit = ["Choose", "Unchoose", "Sort", "Filter", "Clone"];
const manage = ["Move"];
const eventHandlerNames = [manage, manageAndEmit, emit]
    .flatMap(events => events)
    .map(evt => `on${evt}`);

const events = {
  manage,
  manageAndEmit,
  emit
};

function isReadOnly(eventName) {
  return eventHandlerNames.indexOf(eventName) !== -1;
}

function project(entries) {
  return entries.reduce((res, [key, value]) => {
    res[key] = value;
    return res;
  }, {});
}

function getComponentAttributes({ $attrs, componentData = {} }) {
  const attributes = project(
    Object.entries($attrs).filter(([key, _]) => isHtmlAttribute(key))
  );
  return {
    ...attributes,
    ...componentData
  };
}

function createSortableOption({ $attrs, callBackBuilder }) {
  const options = project(getValidSortableEntries($attrs));
  Object.entries(callBackBuilder).forEach(([eventType, eventBuilder]) => {
    events[eventType].forEach(event => {
      options[`on${event}`] = eventBuilder(event);
    });
  });
  const draggable = `[data-draggable]${options.draggable || ""}`;
  return {
    ...options,
    draggable
  };
}

function getValidSortableEntries(value) {
  return Object.entries(value)
    .filter(([key, _]) => !isHtmlAttribute(key))
    .map(([key, value]) => [camelize(key), value])
    .filter(([key, _]) => !isReadOnly(key));
}




const getHtmlElementFromNode = ({ el }) => el;
const addContext = (domElement, context) =>
    (domElement.__draggable_context = context);
const getContext = domElement => domElement.__draggable_context;

class ComponentStructure {
  constructor({
                nodes: { header, default: defaultNodes, footer },
                root,
                realList
              }) {
    this.defaultNodes = defaultNodes;
    this.children = [...header, ...defaultNodes, ...footer];
    this.externalComponent = root.externalComponent;
    this.rootTransition = root.transition;
    this.tag = root.tag;
    this.realList = realList;
  }

  get _isRootComponent() {
    return this.externalComponent || this.rootTransition;
  }

  render(h, attributes) {
    const { tag, children, _isRootComponent } = this;
    const option = !_isRootComponent ? children : { default: () => children };
    return h(tag, attributes, option);
  }

  updated() {
    const { defaultNodes, realList } = this;
    defaultNodes.forEach((node, index) => {
      addContext(getHtmlElementFromNode(node), {
        element: realList[index],
        index
      });
    });
  }

  getUnderlyingVm(domElement) {
    return getContext(domElement);
  }

  getVmIndexFromDomIndex(domIndex, element) {
    const { defaultNodes } = this;
    const { length } = defaultNodes;
    const domChildren = element.children;
    const domElement = domChildren.item(domIndex);

    if (domElement === null) {
      return length;
    }
    const context = getContext(domElement);
    if (context) {
      return context.index;
    }

    if (length === 0) {
      return 0;
    }
    const firstDomListElement = getHtmlElementFromNode(defaultNodes[0]);
    const indexFirstDomListElement = [...domChildren].findIndex(
        element => element === firstDomListElement
    );
    return domIndex < indexFirstDomListElement ? 0 : length;
  }
}


function getSlot(slots, key) {
  const slotValue = slots[key];
  return slotValue ? slotValue() : [];
}

function computeNodes({ $slots, realList, getKey }) {
  const normalizedList = realList || [];
  const [header, footer] = ["header", "footer"].map(name =>
      getSlot($slots, name)
  );
  const { item } = $slots;
  if (!item) {
    throw new Error("draggable element must have an item slot");
  }
  const defaultNodes = normalizedList.flatMap((element, index) =>
      item({ element, index }).map(node => {
        node.key = getKey(element);
        node.props = { ...(node.props || {}), "data-draggable": true };
        return node;
      })
  );
  if (defaultNodes.length !== normalizedList.length) {
    throw new Error("Item slot must have only one child");
  }
  return {
    header,
    footer,
    default: defaultNodes
  };
}

function getRootInformation(tag) {
  const transition = isTransition(tag);
  const externalComponent = !isHtmlTag(tag) && !transition;
  return {
    transition,
    externalComponent,
    tag: externalComponent
        ? resolveComponent(tag)
        : transition
            ? TransitionGroup
            : tag
  };
}

function computeComponentStructure({ $slots, tag, realList, getKey }) {
  const nodes = computeNodes({ $slots, realList, getKey });
  const root = getRootInformation(tag);
  return new ComponentStructure({ nodes, root, realList });
}

export {
  insertNodeAt, removeNode,
    events,
  ComponentStructure,
  getComponentAttributes,
  createSortableOption,
  getValidSortableEntries,
  computeComponentStructure
};
