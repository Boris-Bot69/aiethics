// ===============================
// Homage Chatbot Script
// ===============================

// Global variables (initialized later)
let chatPanel;
let chatMessages;
let editor;
let sendBtn;

let collectedPrompts = [];
let generated = []; // [{ prompt, base64 }]
let awaitingRestartChoice = false;

// ===============================
// DOM READY
// ===============================
window.addEventListener("DOMContentLoaded", () => {
    chatPanel = document.querySelector(".chat-panel");
    chatMessages = chatPanel?.querySelector(".chat-messages");
    editor = document.getElementById("chatEditor");
    sendBtn = chatPanel.querySelector(".send-btn");

    if (!chatMessages) {
        console.error("Chat messages container not found.");
        return;
    }

    // --- Paste plain text only ---
    editor.addEventListener("paste", e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text");
        document.execCommand("insertText", false, text);
    });

    // --- Enter = send, Shift+Enter = newline ---
    editor.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleUserInput();
        }
    });

    // --- Send button ---
    sendBtn.addEventListener("click", handleUserInput);

    // --- Focus editor when clicking red bar ---
    document.getElementById("chatBar")?.addEventListener("click", e => {
        if (e.target === e.currentTarget) editor.focus();
    });

    // --- Intro messages ---
    appendMessage(
        "Hello and welcome to 'Homage to a Local Artist'. In this activity, you describe artworks inspired by Tania Sívertsen’s style, and the AI will turn your descriptions into images.",
        "ai"
    );
    appendMessage(
        "You will create three artworks in total. After each prompt, I will generate one image for you, and you can download them all at the end as a ZIP file.",
        "ai"
    );
    appendMessage(
        "Let us begin. Please describe your first artwork (1/3) below.",
        "ai"
    );
});

// ===============================
// Typing Indicator Helpers
// ===============================
function showTyping() {
    if (!chatMessages) return;

    // Avoid duplicates
    const existing = chatMessages.querySelector(".message.ai-message.typing");
    if (existing) return;

    const msg = document.createElement("div");
    msg.classList.add("message", "ai-message", "typing");

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
    const bubble = chatMessages.querySelector(".message.ai-message.typing");
    if (bubble) bubble.remove();
}

// ===============================
// Input handling
// ===============================
function handleUserInput() {
    const text = editor.innerText.trim();
    if (!text) return;

    if (awaitingRestartChoice) {
        awaitingRestartChoice = false;
        startNewRound();
        return;
    }

    appendMessage(text, "user");
    collectedPrompts.push(text);
    editor.innerHTML = "";
    editor.focus();

    sendPrompt(text);
}

// ===============================
// UI Helpers
// ===============================
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
    return msg;
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

    return container;
}

// ===============================
// Image Display
// ===============================
function appendGeneratedImage(base64, promptText, index) {
    const container = appendAIContainer();

    const img = document.createElement("img");
    img.src = `data:image/png;base64,${base64}`;
    img.alt = "Generated image";
    img.style.maxWidth = "100%";
    img.style.borderRadius = "10px";
    img.style.marginTop = "8px";

    const caption = document.createElement("div");
    caption.style.marginTop = "6px";
    caption.style.fontSize = "0.95rem";
    caption.style.lineHeight = "1.4";
    caption.style.opacity = "0.9";
    caption.textContent = `Prompt: "${promptText}"`;

    const dlBtn = document.createElement("button");
    dlBtn.textContent = "Download PNG";
    dlBtn.style.marginTop = "8px";
    dlBtn.style.cursor = "pointer";
    dlBtn.style.border = "none";
    dlBtn.style.padding = "6px 10px";
    dlBtn.style.borderRadius = "6px";
    dlBtn.style.background = "#fff0e6";
    dlBtn.style.color = "#d9534f";
    dlBtn.addEventListener("click", () =>
        downloadSingle(`image-${index}.png`, base64)
    );

    container.appendChild(img);
    container.appendChild(caption);
    container.appendChild(dlBtn);

    // Progress info
    const progress = document.createElement("div");
    progress.style.marginTop = "10px";
    progress.style.fontWeight = "600";
    progress.textContent = `Image ${index}/3 generated.`;
    container.appendChild(progress);

    // Ask for next step
    if (index < 3) {
        const nextMsg = document.createElement("div");
        nextMsg.style.marginTop = "6px";
        nextMsg.textContent = `Now describe your next artwork (${index + 1}/3).`;
        container.appendChild(nextMsg);
    }
}

// ===============================
// Downloads
// ===============================
function downloadSingle(filename, base64) {
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${base64}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

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
        appendMessage(`ZIP download not available (${e.message}).`, "ai");
    }
}

// ===============================
// Summary
// ===============================
function showSummary() {
    const container = appendAIContainer();

    const title = document.createElement("div");
    title.style.fontWeight = "600";
    title.style.marginBottom = "8px";
    title.textContent = "Summary of your three images";
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

    askToRestart();
}

// ===============================
// Restart Logic
// ===============================
function askToRestart() {
    const container = appendAIContainer();

    const question = document.createElement("div");
    question.textContent = "Do you want to create another set of three images?";
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
        appendMessage(
            "Okay. You can still type a new prompt anytime to start again.",
            "ai"
        );
    });
}

function startNewRound() {
    collectedPrompts = [];
    generated = [];
    appendMessage("Let us start fresh. Please describe your first artwork (1/3).", "ai");
}

// ===============================
// Backend Call
// ===============================
async function sendPrompt(prompt) {
    const index = generated.length + 1;

    showTyping();

    try {
        const res = await fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        hideTyping();

        if (data?.image) {
            appendGeneratedImage(data.image, prompt, index);
            generated.push({ prompt, base64: data.image });

            if (generated.length === 3) {
                showSummary();
            }
        } else {
            appendMessage("No image returned from the model.", "ai");
        }
    } catch (err) {
        hideTyping();
        appendMessage(`Error: ${err.message}`, "ai");
    }
}

document.addEventListener("click", (e) => {
    const zoomable = e.target.closest(".zoomable");
    if (!zoomable) return;

    const overlay = document.createElement("div");
    overlay.className = "zoom-overlay";

    const img = document.createElement("img");
    img.src = zoomable.src;
    img.alt = zoomable.alt || "Zoomed image";
    overlay.appendChild(img);

    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
});