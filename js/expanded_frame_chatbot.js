let chatPanel, chatMessages, imageUpload;
let uploadedBase64 = null;
let lastHumanUploadBase64 = null;

const frameOrder = ["A8", "A7", "A6", "A5", "A4"];
let stage = "A8";

// ===============================
// DOM READY
// ===============================
window.addEventListener("DOMContentLoaded", () => {
    chatPanel = document.querySelector(".chat-panel");
    chatMessages = chatPanel?.querySelector(".chat-messages");
    imageUpload = document.getElementById("imageUpload");

    addBotMessage(`
Welcome to <em>Expanded Frames</em>.<br/>
Upload your <b>A8</b> image to begin.<br/>
Then click “Expand” to let AI extend your artwork step by step (A8 → A7 → A6 → A5 → A4).<br/>
After A4, you can start again with a new image.
    `);

    const uploadBtn = document.getElementById("uploadBtn");
    uploadBtn?.addEventListener("click", () => imageUpload.click());
    imageUpload?.addEventListener("change", handleImageUpload);
});

// ===============================
// MESSAGE HELPERS
// ===============================
function addMessage(text, sender = "bot", node = null) {
    const msg = document.createElement("div");
    msg.className = `message ${sender === "user" ? "user-align" : ""}`;

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");

    const content = document.createElement("div");
    content.classList.add("text");

    if (node) content.appendChild(node);

    if (text) {
        const p = document.createElement("p");
        p.innerHTML = text;
        content.appendChild(p);
    }

    msg.appendChild(avatar);
    msg.appendChild(content);
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addBotMessage(html) {
    addMessage(html, "bot");
}

function addImageBubble(src, extraBelow = null) {
    const wrap = document.createElement("div");
    const img = document.createElement("img");
    img.src = src;
    img.classList.add("chat-image-preview", "zoomable");
    wrap.appendChild(img);
    if (extraBelow) wrap.appendChild(extraBelow);
    addMessage(null, "bot", wrap);
    return { wrap, img };
}

// ===============================
// TYPING INDICATOR
// ===============================
function showTyping() {
    if (!chatMessages) return;

    const existing = chatMessages.querySelector(".message.typing");
    if (existing) return;

    const msg = document.createElement("div");
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
    if (!chatMessages) return;
    const bubble = chatMessages.querySelector(".message.typing");
    if (bubble) bubble.remove();
}

// ===============================
// IMAGE UPLOAD
// ===============================
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
        uploadedBase64 = ev.target.result;
        lastHumanUploadBase64 = ev.target.result;
        stage = "A8";
        addBotMessage("Image uploaded as A8.");
        appendExpandButton();
    };
    reader.readAsDataURL(file);
}

// ===============================
// EXPAND LOGIC
// ===============================
function appendExpandButton() {
    const nextStage = getNextStage();
    if (!nextStage) return;

    const expandBtn = document.createElement("button");
    expandBtn.className = "expand-btn";
    expandBtn.textContent = `Expand to ${nextStage}`;
    expandBtn.onclick = async () => {
        expandBtn.disabled = true;
        expandBtn.textContent = "Expanding …";
        await expandWithAI(nextStage, expandBtn);
    };
    addMessage(null, "bot", expandBtn);
}

function getNextStage() {
    const i = frameOrder.indexOf(stage);
    return i >= 0 ? frameOrder[i + 1] : null;
}

async function expandWithAI(nextStage, btnEl) {
    addBotMessage(`Expanding to <b>${nextStage}</b> …`);
    showTyping();

    try {
        const resp = await fetch("/expand_canvas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: uploadedBase64 }),
        });

        if (!resp.ok) throw new Error(`Server error: ${resp.status}`);

        const { image_url } = await resp.json();
        hideTyping();

        const { wrap } = addImageBubble(image_url);

        const dl = document.createElement("button");
        dl.className = "download-btn";
        dl.textContent = "Download image";
        dl.onclick = () => {
            const a = document.createElement("a");
            a.href = image_url;
            a.download = `${nextStage}_expanded.png`;
            a.click();
        };
        wrap.appendChild(dl);

        // Update stage and data
        stage = nextStage;
        uploadedBase64 = image_url;
        lastHumanUploadBase64 = image_url;

        const next = getNextStage();
        if (next) {
            appendExpandButton();
        } else {
            addBotMessage("Expansion completed. A4 frame reached.");
            const newRoundBtn = document.createElement("button");
            newRoundBtn.className = "expand-btn";
            newRoundBtn.textContent = "Start new round (upload new image)";
            newRoundBtn.onclick = () => {
                stage = "A8";
                uploadedBase64 = null;
                addBotMessage("Upload a new A8 image to begin again.");
            };
            addMessage(null, "bot", newRoundBtn);
        }
    } catch (err) {
        console.error(err);
        hideTyping();
        addBotMessage("Expansion failed. Please check the server logs.");
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.textContent = `Expand again`;
        }
    }
}

// ===============================
// HELPERS
// ===============================
function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}
