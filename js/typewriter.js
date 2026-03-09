/**
 * typeWrite – animate bot message text character by character.
 *
 * Works with plain text, text with \n line-breaks, and rich HTML
 * (e.g. <br>, <em>, <strong>).  Element nodes are inserted instantly
 * so structure/styling is preserved; only text characters are animated.
 *
 * @param {HTMLElement} element  - The .text container to write into.
 * @param {string}      html     - HTML string (or plain text) to animate.
 * @param {number}      speed    - Milliseconds between characters (default 14).
 * @param {Function}    [onDone] - Optional callback when animation finishes.
 */
function typeWrite(element, html, speed = 14, onDone) {
    return new Promise(resolve => {
    element.innerHTML = "";

    // Parse the html into a real DOM tree
    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    // Build a flat list of operations:
    //   { type: "attach", node, parent }  → insert a DOM element immediately
    //   { type: "char",   char, parent }  → append one character to parent
    const ops = [];

    function collect(src, destParent) {
        if (src.nodeType === Node.TEXT_NODE) {
            for (const ch of src.textContent) {
                ops.push({ type: "char", parent: destParent, char: ch });
            }
        } else if (src.nodeType === Node.ELEMENT_NODE) {
            const clone = src.cloneNode(false); // shallow – no children yet
            ops.push({ type: "attach", node: clone, parent: destParent });
            src.childNodes.forEach(child => collect(child, clone));
        }
    }

    tmp.childNodes.forEach(child => collect(child, element));

    const chatMessages = element.closest(".chat-messages");
    let i = 0;

    function tick() {
        if (i >= ops.length) {
            if (onDone) onDone();
            resolve();
            return;
        }

        const op = ops[i++];

        if (op.type === "attach") {
            op.parent.appendChild(op.node);
        } else {
            // Reuse an existing trailing text node to avoid creating hundreds of nodes
            const last = op.parent.lastChild;
            if (last && last.nodeType === Node.TEXT_NODE) {
                last.textContent += op.char;
            } else {
                op.parent.appendChild(document.createTextNode(op.char));
            }
        }

        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        setTimeout(tick, speed);
    }

    tick();
    }); // end Promise
}
