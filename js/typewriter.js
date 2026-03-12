function typeWrite(element, html, speed = 14, onDone) {
    return new Promise(resolve => {
    element.innerHTML = "";

    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    const ops = [];

    function collect(src, destParent) {
        if (src.nodeType === Node.TEXT_NODE) {
            for (const ch of src.textContent) {
                ops.push({ type: "char", parent: destParent, char: ch });
            }
        } else if (src.nodeType === Node.ELEMENT_NODE) {
            const clone = src.cloneNode(false);
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
    });
}
