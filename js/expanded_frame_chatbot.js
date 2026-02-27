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

function addImageBubble(src) {
    const wrap = document.createElement("div");
    const img = document.createElement("img");
    img.src = src;
    img.classList.add("chat-image-preview", "zoomable");
    wrap.appendChild(img);
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
// UPLOAD PANEL VISIBILITY
// ===============================
function setUploadPanelVisible(visible) {
    const bar = document.querySelector(".chat-input-bar");
    if (bar) bar.style.display = visible ? "" : "none";

    let newArtworkBar = chatPanel?.querySelector(".new-artwork-bar");

    if (!visible) {
        if (!newArtworkBar) {
            newArtworkBar = document.createElement("div");
            newArtworkBar.className = "new-artwork-bar";

            const btn = document.createElement("button");
            btn.className = "new-artwork-btn";
            btn.textContent = "↻ New Artwork";
            btn.onclick = () => {
                stage = "A8";
                uploadedBase64 = null;
                lastHumanUploadBase64 = null;
                if (imageUpload) imageUpload.value = "";
                setUploadPanelVisible(true);
                addBotMessage("Upload a new <b>A8</b> image to begin.");
            };

            newArtworkBar.appendChild(btn);
            chatPanel.appendChild(newArtworkBar);
        } else {
            newArtworkBar.style.display = "";
        }
    } else {
        if (newArtworkBar) newArtworkBar.style.display = "none";
    }
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

        // Hide the upload panel and show the "New Artwork" button
        setUploadPanelVisible(false);

        // Show the uploaded image with the expand button directly below it
        const { wrap } = addImageBubble(uploadedBase64);
        const controls = buildExpandControlsDOM();
        if (controls) wrap.appendChild(controls);
    };
    reader.readAsDataURL(file);
}

// ===============================
// EXPAND CONTROLS (button only)
// ===============================
function buildExpandControlsDOM() {
    const nextStage = getNextStage();
    if (!nextStage) return null;

    const container = document.createElement("div");
    container.className = "expand-controls";

    const expandBtn = document.createElement("button");
    expandBtn.className = "expand-btn";
    expandBtn.textContent = `Expand to ${nextStage}`;
    expandBtn.onclick = async () => {
        expandBtn.disabled = true;
        expandBtn.textContent = "Expanding …";
        await expandWithAI(nextStage, expandBtn);
    };

    container.appendChild(expandBtn);
    return container;
}

function appendExpandControls() {
    const container = buildExpandControlsDOM();
    if (container) addMessage(null, "bot", container);
}

function getNextStage() {
    const i = frameOrder.indexOf(stage);
    return i >= 0 ? frameOrder[i + 1] : null;
}

// ===============================
// EXPAND WITH AI
// ===============================
async function expandWithAI(nextStage, btnEl) {
    const expansionNumber = frameOrder.indexOf(nextStage);

    addBotMessage(`Expanding to <b>${nextStage}</b> — this may take a moment …`);
    showTyping();

    try {
        const resp = await fetch("/expand_canvas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                image: uploadedBase64,
                prompt: "",
                stage: nextStage,
                expansionNumber: expansionNumber,
            }),
        });

        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(errData.error || `Server error: ${resp.status}`);
        }

        const { image_url } = await resp.json();
        hideTyping();

        // Update state — the NEW expanded image becomes the input for the next round
        stage = nextStage;
        uploadedBase64 = image_url;

        // Show the expanded image
        const { wrap } = addImageBubble(image_url);

        // Download button below the image
        const dl = document.createElement("button");
        dl.className = "download-btn";
        dl.textContent = `Download ${nextStage}`;
        dl.onclick = () => {
            const a = document.createElement("a");
            a.href = image_url;
            a.download = `${nextStage}_expanded.png`;
            a.click();
        };
        wrap.appendChild(dl);

        // Expand button for the next stage, directly below the image
        const next = getNextStage();
        if (next) {
            const controls = buildExpandControlsDOM();
            if (controls) wrap.appendChild(controls);
        } else {
            addBotMessage(
                "🎉 <b>A4 reached!</b> Your expanded artwork is complete. " +
                "You can download your images above, or start a new round."
            );

            const newRoundBtn = document.createElement("button");
            newRoundBtn.className = "expand-btn";
            newRoundBtn.textContent = "Start new round (upload new image)";
            newRoundBtn.onclick = () => {
                stage = "A8";
                uploadedBase64 = null;
                lastHumanUploadBase64 = null;
                if (imageUpload) imageUpload.value = "";
                setUploadPanelVisible(true);
                addBotMessage("Upload a new <b>A8</b> image to begin again.");
            };
            addMessage(null, "bot", newRoundBtn);
        }
    } catch (err) {
        console.error("[expandWithAI]", err);
        hideTyping();
        addBotMessage(
            `<span style="color:#ff6b6b">Expansion failed:</span> ${err.message}<br/>` +
            `Please try again.`
        );
        appendExpandControls();
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
