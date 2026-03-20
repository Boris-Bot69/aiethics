let chatPanel, chatMessages, imageUpload;

let uploadedBase64     = null;
let isBusy             = false;
let pendingUploadStage = "A8";

const frameOrder = ["A8", "A7", "A6", "A5", "A4"];
let stage = "A8";


window.addEventListener("DOMContentLoaded", () => {
    chatPanel    = document.querySelector(".chat-panel");
    chatMessages = chatPanel?.querySelector(".chat-messages");
    imageUpload  = document.getElementById("imageUpload");

    document.getElementById("uploadBtn")
        ?.addEventListener("click", () => imageUpload?.click());

    imageUpload?.addEventListener("change", handleImageUpload);

    document.getElementById("restartBtn")
        ?.addEventListener("click", restartAll);


    addBotMessage(
        "Welcome to <b>Expanded Frames</b>!<br><br>" +
        "The loop works like this:<br>" +
        "<b>1.</b> Upload a photo of your artwork<br>" +
        "<b>2.</b> AI expands it, download the result<br>" +
        "<b>3.</b> Draw on the printed/saved image yourself to extend the borders<br>" +
        "<b>4.</b> Upload your new drawing and repeat until you reach A4<br><br>" +
        "Start by uploading your <b>A8 artwork</b> below."
    );
});


function restartAll() {
    stage              = "A8";
    uploadedBase64     = null;
    pendingUploadStage = "A8";
    isBusy             = false;
    if (imageUpload) imageUpload.value = "";

    chatMessages.innerHTML = "";
    showUploadBar("Upload A8");

    addBotMessage("All clear! Upload a new <b>A8 artwork</b> to start again.");
}


function showUploadBar(label) {
    const btn = document.getElementById("uploadBtn");
    if (btn) {
        btn.style.display = "";
        if (label) btn.textContent = label;
    }
}

function hideUploadBar() {
    const btn = document.getElementById("uploadBtn");
    if (btn) btn.style.display = "none";
}


function addMessage(text, sender = "bot", node = null) {
    const msg     = document.createElement("div");
    msg.className = `message ${sender === "user" ? "user-align" : ""}`;

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");

    const content = document.createElement("div");
    content.classList.add("text");

    if (node) content.appendChild(node);
    msg.appendChild(avatar);
    msg.appendChild(content);
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (text) {
        const p = document.createElement("p");
        content.appendChild(p);
        if (sender === "bot") {
            return typeWrite(p, text);
        } else {
            p.innerHTML = text;
        }
    }
}

function addBotMessage(html) { return addMessage(html, "bot"); }

function addStatusMessage(html) {
    const div = document.createElement("div");
    div.className = "status-message";
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addImageBubble(src, sender = "bot") {
    const wrap = document.createElement("div");
    const img  = document.createElement("img");
    img.src = src;
    img.classList.add("chat-image-preview", "zoomable");
    wrap.appendChild(img);
    addMessage(null, sender, wrap);
    return { wrap, img };
}


function showTyping() {
    if (!chatMessages) return;
    if (chatMessages.querySelector(".message.typing")) return;

    const msg    = document.createElement("div");
    msg.className = "message typing";

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");

    const bubble = document.createElement("div");
    bubble.classList.add("typing-indicator");
    bubble.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;

    msg.appendChild(avatar);
    msg.appendChild(bubble);
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    chatMessages?.querySelector(".message.typing")?.remove();
}


function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (imageUpload) imageUpload.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
        const base64 = ev.target.result;
        uploadedBase64 = base64;
        stage = pendingUploadStage;

        hideUploadBar();
        addImageBubble(base64, "user");
        addStatusMessage(`Image uploaded as <b>${stage}</b>`);

        const nextStage = getNextStage();
        if (!nextStage) {

            addBotMessage(
                "🎉 <b>You've reached A4!</b> Your expanded artwork is complete.<br><br>" +
                "Download and display the whole series!"
            );
        } else {
            addBotMessage(`Now click the button below to expand to <b>${nextStage}</b> with AI.`);
            appendExpandButton(nextStage);
        }
    };
    reader.readAsDataURL(file);
}


function appendExpandButton(nextStage) {
    const container = document.createElement("div");
    container.className = "expand-controls";

    const btn = document.createElement("button");
    btn.className   = "expand-btn";
    btn.textContent = `Expand to ${nextStage} with AI`;

    btn.addEventListener("click", async () => {
        if (isBusy) return;
        btn.disabled    = true;
        btn.textContent = "Expanding…";
        isBusy = true;
        await expandWithAI(nextStage);
        isBusy = false;
    });

    container.appendChild(btn);
    addMessage(null, "bot", container);
}

function getNextStage() {
    const i = frameOrder.indexOf(stage);
    return (i >= 0 && i < frameOrder.length - 1) ? frameOrder[i + 1] : null;
}


async function expandWithAI(nextStage) {
    addStatusMessage(`Expanding to <b>${nextStage}</b>. This may take up to 30 seconds…`);
    showTyping();

    try {
        const resp = await fetch("/expand_canvas", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                image:           uploadedBase64,
                prompt:          "",
                stage:           nextStage,
                expansionNumber: frameOrder.indexOf(nextStage),
            }),
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(errData.error || `Server error: ${resp.status}`);
        }

        const { image_url } = await resp.json();
        hideTyping();


        stage          = nextStage;
        uploadedBase64 = image_url;


        const { wrap } = addImageBubble(image_url, "bot");


        const dl = document.createElement("button");
        dl.className   = "download-btn";
        dl.textContent = `⬇ Download ${nextStage}`;
        dl.addEventListener("click", () => {
            const a      = document.createElement("a");
            a.href       = image_url;
            a.download   = `expanded_${nextStage}.png`;
            a.click();
        });
        wrap.appendChild(dl);


        const drawUpTo = frameOrder[frameOrder.indexOf(stage) + 1];
        pendingUploadStage = drawUpTo;

        const instr = document.createElement("div");
        instr.className = "draw-instruction";
        instr.innerHTML =
            `<strong>Your turn!</strong><br>` +
            `Save or print the <b>${stage}</b> image above. ` +
            `Draw on it to extend the borders to <b>${drawUpTo}</b> size. ` +
            `When you're done, upload your <b>${drawUpTo}</b> photo below.`;
        addMessage(null, "bot", instr);

        showUploadBar(`📷 Upload ${drawUpTo}`);

    } catch (err) {
        console.error("[expandWithAI]", err);
        hideTyping();
        addBotMessage(
            `<span style="color:#ff6b6b">Expansion failed:</span> ${err.message}<br>` +
            `Please try again.`
        );

        appendExpandButton(nextStage);
    }
}
