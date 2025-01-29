/* v1.1 */ 
let DOMEvents = (function () {

    let local = {
        commonEventTypes: {
            onclick: 'click',
            ondblclick: 'dblclick',
            onmousedown: 'mousedown',
            onmouseup: 'mouseup',
            onmousemove: 'mousemove',
            onmouseover: 'mouseover',
            onmouseout: 'mouseout',
            ontouchstart: 'touchstart',

            onkeypress: 'keypress',
            onkeydown: 'keydown',
            onkeyup: 'keyup',
            onfocus: 'focus',
            onblur: 'blur',

            oninput: 'input',
            onchange: 'change',
            onsubmit: 'submit',
            onreset: 'reset'
        },
    };

    let attachListeners = function (attr, eventType, callbacks, containerEl) {
        let elements = containerEl.querySelectorAll(`[${attr}]`);
        for (let el of elements) {
            let callbackFunc = callbacks?.[el.getAttribute(attr)];
            if (!callbackFunc) continue;

            el.addEventListener(eventType, callbackFunc);
        }
    };

    function Listen(eventsMap, containerEl = document) {
        let { groupKey } = eventsMap;
        let infix = groupKey ? `-${groupKey}` : '';

        for (let key in eventsMap) {
            if (key == 'groupKey') continue;

            let callbackMap = eventsMap[key];
            let eventType = callbackMap.eventType ?? getCommonEventType(key);

            if (!eventType) {
                console.error('Event type not defined:', key);
                continue;
            }
            attachListeners(`data${infix}-${key}`, eventType, callbackMap, containerEl);
        }
    }

    function getCommonEventType(key) {
        return local.commonEventTypes[key];
    }

    function Configure(commonEventTypes) {
        local.commonEventTypes = {
            ...local.commonEventTypes,
            ...commonEventTypes,
        }
    }

    return {
        Configure,
        Listen,
    };

})();