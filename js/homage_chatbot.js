// ../../js/homage_chatbot.js

const chatPanel = document.querySelector(".chat-panel");
const chatMessages = chatPanel.querySelector(".chat-messages");
const chatInput = chatPanel.querySelector("#chatInput");
const sendButton = chatPanel.querySelector(".send-btn");

let collectedPrompts = [];
let generated = []; // [{ prompt, base64 }]
let awaitingRestartChoice = false;

// --- UI helpers ---
function appendMessage(text, sender = "ai") {
    const msg = document.createElement("div");
    msg.classList.add("message", `${sender}-message`);

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");

    const textDiv = document.createElement("div");
    textDiv.classList.add("text");
    textDiv.textContent = text;

    msg.appendChild(avatar);
    msg.appendChild(textDiv);
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg; // return for later removal if needed
}

function appendAIContainer() {
    const msg = document.createElement("div");
    msg.classList.add("message", "ai-message");

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");

    const container = document.createElement("div");
    container.classList.add("text");

    msg.appendChild(avatar);
    msg.appendChild(container);
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return container; // the bubble ".text"
}

function appendGeneratedImage(base64, promptText) {
    const container = appendAIContainer();

    // image
    const img = document.createElement("img");
    img.src = `data:image/png;base64,${base64}`;
    img.alt = "Generated image";
    img.style.maxWidth = "100%";
    img.style.borderRadius = "10px";
    img.style.marginTop = "8px";

    // caption with the prompt
    const caption = document.createElement("div");
    caption.style.marginTop = "6px";
    caption.style.fontSize = "0.95rem";
    caption.style.lineHeight = "1.4";
    caption.style.opacity = "0.9";
    caption.textContent = `Prompt: “${promptText}”`;

    container.appendChild(img);
    container.appendChild(caption);
}

function downloadSingle(filename, base64) {
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// Optional lazy loader for JSZip (for "Download all")
function loadJSZip() {
    return new Promise((resolve, reject) => {
        if (window.JSZip) return resolve(window.JSZip);
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
        script.onload = () => resolve(window.JSZip);
        script.onerror = () => reject(new Error("Failed to load JSZip"));
        document.head.appendChild(script);
    });
}

async function downloadAllZip(items) {
    try {
        const JSZip = await loadJSZip();
        const zip = new JSZip();

        items.forEach((it, idx) => {
            const base64 = it.base64.startsWith("data:")
                ? it.base64.split(",")[1]
                : it.base64;
            zip.file(`image-${idx + 1}.png`, base64, { base64: true });
        });

        const promptsTxt = items.map((it, i) => `#${i + 1}: ${it.prompt}`).join("\n");
        zip.file("prompts.txt", promptsTxt);

        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "homage-images.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        appendMessage(`⚠️ ZIP download not available (${e.message}).`, "ai");
    }
}

// --- Summary panel after 3 images ---
function showSummary() {
    const container = appendAIContainer();

    const title = document.createElement("div");
    title.style.fontWeight = "600";
    title.style.marginBottom = "8px";
    title.textContent = "📦 Summary of your 3 images";
    container.appendChild(title);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr";
    grid.style.gap = "12px";
    container.appendChild(grid);

    generated.forEach((item, idx) => {
        const card = document.createElement("div");
        card.style.border = "1px solid var(--border-color)";
        card.style.borderRadius = "10px";
        card.style.padding = "10px";

        const img = document.createElement("img");
        img.src = `data:image/png;base64,${item.base64}`;
        img.alt = `Image ${idx + 1}`;
        img.style.maxWidth = "100%";
        img.style.borderRadius = "8px";

        const caption = document.createElement("div");
        caption.style.marginTop = "6px";
        caption.style.fontSize = "0.95rem";
        caption.style.lineHeight = "1.4";
        caption.textContent = `#${idx + 1} — ${item.prompt}`;

        const btnRow = document.createElement("div");
        btnRow.style.marginTop = "8px";

        const dl = document.createElement("button");
        dl.textContent = "Download PNG";
        dl.style.cursor = "pointer";
        dl.style.border = "none";
        dl.style.padding = "6px 10px";
        dl.style.borderRadius = "6px";
        dl.style.background = "#fff0e6";
        dl.style.color = "#d9534f";
        dl.addEventListener("click", () =>
            downloadSingle(`image-${idx + 1}.png`, item.base64)
        );

        btnRow.appendChild(dl);
        card.appendChild(img);
        card.appendChild(caption);
        card.appendChild(btnRow);
        grid.appendChild(card);
    });

    const actions = document.createElement("div");
    actions.style.marginTop = "10px";
    actions.style.display = "flex";
    actions.style.gap = "10px";
    container.appendChild(actions);

    const zipBtn = document.createElement("button");
    zipBtn.textContent = "Download all (.zip)";
    zipBtn.style.cursor = "pointer";
    zipBtn.style.border = "none";
    zipBtn.style.padding = "8px 12px";
    zipBtn.style.borderRadius = "8px";
    zipBtn.style.background = "#ffe6e6";
    zipBtn.style.color = "#d9534f";
    zipBtn.addEventListener("click", () => downloadAllZip(generated));
    actions.appendChild(zipBtn);

    // Ask to restart
    askToRestart();
}

// --- Ask to start another round ---
function askToRestart() {
    const container = appendAIContainer();

    const question = document.createElement("div");
    question.textContent = "🔁 Do you want to do another set of 3 images?";
    question.style.marginBottom = "8px";
    container.appendChild(question);

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "8px";

    const yesBtn = document.createElement("button");
    yesBtn.textContent = "Yes";
    yesBtn.style.cursor = "pointer";
    yesBtn.style.border = "none";
    yesBtn.style.padding = "8px 12px";
    yesBtn.style.borderRadius = "8px";
    yesBtn.style.background = "#e6ffe6";
    yesBtn.style.color = "#2d7a2d";

    const noBtn = document.createElement("button");
    noBtn.textContent = "No";
    noBtn.style.cursor = "pointer";
    noBtn.style.border = "none";
    noBtn.style.padding = "8px 12px";
    noBtn.style.borderRadius = "8px";
    noBtn.style.background = "#ffe6e6";
    noBtn.style.color = "#a33a3a";

    row.appendChild(yesBtn);
    row.appendChild(noBtn);
    container.appendChild(row);

    awaitingRestartChoice = true;

    yesBtn.addEventListener("click", () => {
        awaitingRestartChoice = false;
        startNewRound();
    });

    noBtn.addEventListener("click", () => {
        awaitingRestartChoice = false;
        appendMessage("👍 Okay. You can still type a new prompt any time to start another set.", "ai");
    });
}

function startNewRound() {
    collectedPrompts = [];
    generated = [];
    appendMessage("✨ New round! Describe the first artwork.", "ai");
}

// --- Backend call: one image per prompt ---
async function sendPrompt(prompt) {
    const typing = appendMessage("🎨 Generating image...", "ai");
    try {
        const res = await fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        typing.remove();

        if (data?.image) {
            appendGeneratedImage(data.image, prompt);
            generated.push({ prompt, base64: data.image });

            // After 3 images, show summary and ask to restart
            if (generated.length === 3) {
                showSummary();
            }
        } else {
            appendMessage("⚠️ No image returned from the model.", "ai");
        }
    } catch (err) {
        typing.remove();
        appendMessage(`❌ Error: ${err.message}`, "ai");
    }
}

// --- Input handling ---
function handleUserInput() {
    const text = chatInput.value.trim();
    if (!text) return;

    // When awaiting restart choice, a user message should dismiss that state and start new
    if (awaitingRestartChoice) {
        awaitingRestartChoice = false;
        startNewRound();
    }

    appendMessage(text, "user");
    collectedPrompts.push(text);
    chatInput.value = "";

    // Generate right away
    sendPrompt(text);
}

sendButton.addEventListener("click", handleUserInput);
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleUserInput();
});


