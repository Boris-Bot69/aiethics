// ===============================
// Magazine Cut-Outs Chatbot Script
// ===============================

let chatPanel, chatMessages, editor, sendBtn, imageUpload;
let uploadedBase64 = null;
let stage = 1; // 1st upload/edit → 2nd upload/edit


// ===============================
// DOM READY
// ===============================
window.addEventListener("DOMContentLoaded", () => {
    console.log(" Magazine chatbot loaded");

    chatPanel = document.querySelector(".chat-panel");
    chatMessages = chatPanel?.querySelector(".chat-messages");
    editor = document.getElementById("chatEditor");
    sendBtn = chatPanel.querySelector(".send-btn");
    imageUpload = document.getElementById("imageUpload");

    const uploadBtn = document.getElementById("uploadBtn");
    if (uploadBtn && imageUpload) {
        uploadBtn.addEventListener("click", () => imageUpload.click());
    } else {
        console.error(" Upload button or file input not found in DOM!");
    }

    if (!chatMessages) {
        console.error("Chat messages container not found!");
        return;
    }

    // ---- Image Upload Logic (inside DOM ready!) ----
    imageUpload.addEventListener("change", e => {
        const file = e.target.files[0];
        if (!file) {
            console.warn(" No file selected");
            return;
        }

        const reader = new FileReader();
        reader.onload = ev => {
            uploadedBase64 = ev.target.result;
            console.log("Image uploaded successfully, length:", uploadedBase64?.length);

            // 🧹 Remove previous "upload" or "instruction" messages to avoid duplicates
            const existingMsgs = chatMessages.querySelectorAll(".ai-message .text");
            existingMsgs.forEach(el => {
                const text = el.textContent.trim();
                if (
                    text.startsWith(" Image uploaded!") ||
                    text.startsWith("Great — image uploaded!") ||
                    text.includes("Now type a short prompt")
                ) {
                    el.parentElement.remove(); // remove the message container
                }
            });

            showImagePreview(uploadedBase64);

            appendMessage(
                "Image uploaded! Now type a short prompt describing how you'd like the AI to modify it (e.g., *Add a small bird on the tree*).",
                "ai"
            );

            enableEditor();
            editor.focus();
        };

        reader.onerror = err => console.error("FileReader error:", err);
        reader.readAsDataURL(file);
    });

    setupEditorControls();

    // Intro messages
    appendMessage(
        "Welcome to*Magazine Cut-Outs! This activity combines your drawings, collage layers, and AI edits to visualize how ideas evolve.",
        "ai"
    );
    appendMessage(
        "Step 1: Upload your black-and-white drawing, then describe how you'd like the AI to edit it (e.g., Add a small bird on the branch).",
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
// Chat Input / Upload setup
// ===============================
function setupEditorControls() {
    editor.addEventListener("paste", e => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text");
        document.execCommand("insertText", false, text);
    });

    editor.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleUserInput();
        }
    });

    sendBtn.addEventListener("click", handleUserInput);
}

function disableEditor(placeholderText) {
    editor.setAttribute("contenteditable", "false");
    editor.setAttribute("data-placeholder", placeholderText);
    editor.style.opacity = "0.5";
    editor.style.pointerEvents = "none";
}

function enableEditor() {
    editor.setAttribute("contenteditable", "true");
    editor.removeAttribute("disabled");
    editor.style.opacity = "1";
    editor.style.pointerEvents = "auto";
    editor.focus();
}

// ===============================
// Chat Helpers
// ===============================
function appendMessage(text, sender = "ai") {
    const msg = document.createElement("div");
    msg.classList.add("message");
    if (sender === "user") {
        msg.classList.add("user-align");
    } else {
        msg.classList.add("ai-message");
    }
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
// Handle Input (upload + text)
// ===============================
function handleUserInput() {
    const text = editor.innerText.trim();
    const hasImage = !!uploadedBase64;

    if (!text && !hasImage) {
        appendMessage("Please upload your drawing or collage first.", "ai");
        return;
    }

    if (hasImage && !text) {
        appendMessage("Great — image uploaded! Now please describe how you'd like it edited (then press ▶).", "ai");
        return;
    }

    if (text) {
        appendMessage(text, "user");
        editor.innerHTML = "";
        editor.blur();

        if (hasImage) {
            sendToAI(uploadedBase64, text);
        } else {
            appendMessage("Please upload your drawing or collage first.", "ai");
        }
    }
}

// ===============================
// Preview Uploaded Image
// ===============================
function showImagePreview(base64) {
    const container = appendAIContainer();
    const img = document.createElement("img");
    img.src = base64;
    img.alt = "Uploaded artwork";
    img.classList.add("chat-image-preview", "zoomable");
    img.style.maxWidth = "100%";
    img.style.borderRadius = "10px";
    img.style.marginTop = "10px";
    container.appendChild(img);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ===============================
// Backend Call + Guided Flow
// ===============================
async function sendToAI(imageBase64, prompt) {
    showTyping();

    try {
        const res = await fetch("/edit-magazine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64, prompt }),
        });

        const data = await res.json();
        hideTyping();

        if (data?.image) {
            // Show AI-edited result
            const container = appendAIContainer();
            const img = document.createElement("img");
            img.src = data.image;
            img.alt = "AI edited artwork";
            img.classList.add("zoomable");
            img.style.maxWidth = "100%";
            img.style.borderRadius = "10px";
            container.appendChild(img);

            // Download button
            const dlBtn = document.createElement("button");
            dlBtn.textContent = "Download edited image";
            dlBtn.style.marginTop = "8px";
            dlBtn.style.cursor = "pointer";
            dlBtn.style.border = "none";
            dlBtn.style.padding = "6px 10px";
            dlBtn.style.borderRadius = "6px";
            dlBtn.style.background = "#fff0e6";
            dlBtn.style.color = "#d9534f";
            dlBtn.addEventListener("click", () =>
                downloadSingle(`magazine-edit-${stage}.png`, data.image)
            );
            container.appendChild(dlBtn);

            addImageToHistory(data.image, prompt, `Edit ${stage}`);

            // Guided responses
            if (stage === 1) {
                appendMessage(
                    " Great! Now take your printed drawing, layer it with magazine cutouts, and take a photo of your collage.",
                    "ai"
                );
                appendMessage(
                    "When ready, upload your collage photo to begin Step 2. I’ll help you edit it again with AI.",
                    "ai"
                );

                stage = 2;
                uploadedBase64 = null; // reset for next upload
                disableEditor("Please upload your collage image for Step 2...");
            } else if (stage === 2) {
                appendMessage(
                    "Both edits completed! You now have four artworks — your original, AI-edited, collage, and final AI remix.",
                    "ai"
                );

                uploadedBase64 = null;
                disableEditor("Activity complete!");
                askToRestart();
            }
        } else {
            appendMessage("No image returned from AI.", "ai");
        }
    } catch (err) {
        hideTyping();
        appendMessage(`Error: ${err.message}`, "ai");
    }
}

// ===============================
// Image History
// ===============================
function addImageToHistory(dataUrl, promptText, label) {
    const historySection = document.getElementById("imageHistory");
    const grid = document.getElementById("imageHistoryGrid");
    if (!historySection || !grid) return;

    historySection.style.display = "block";

    const card = document.createElement("div");
    card.className = "history-card";

    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = label;
    img.className = "history-thumb zoomable";

    const lbl = document.createElement("div");
    lbl.className = "history-label";
    lbl.textContent = `${label}: ${promptText}`;

    const dl = document.createElement("a");
    dl.href = dataUrl;
    dl.download = `${label.toLowerCase().replace(/\s+/g, "-")}.png`;
    dl.className = "history-download";
    dl.textContent = "Download";

    card.appendChild(img);
    card.appendChild(lbl);
    card.appendChild(dl);
    grid.appendChild(card);
}

// ===============================
// Restart Logic
// ===============================
function askToRestart() {
    const container = appendAIContainer();

    const question = document.createElement("div");
    question.textContent = "Do you want to start a new round?";
    question.style.marginBottom = "8px";
    container.appendChild(question);

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "8px";

    const yesBtn = document.createElement("button");
    yesBtn.textContent = "Yes";
    yesBtn.style.cssText = "cursor:pointer;border:none;padding:8px 12px;border-radius:8px;background:#e6ffe6;color:#2d7a2d;";

    const noBtn = document.createElement("button");
    noBtn.textContent = "No";
    noBtn.style.cssText = "cursor:pointer;border:none;padding:8px 12px;border-radius:8px;background:#ffe6e6;color:#a33a3a;";

    row.appendChild(yesBtn);
    row.appendChild(noBtn);
    container.appendChild(row);

    yesBtn.addEventListener("click", () => {
        yesBtn.disabled = true;
        noBtn.disabled = true;
        startNewRound();
    });

    noBtn.addEventListener("click", () => {
        yesBtn.disabled = true;
        noBtn.disabled = true;
        appendMessage("Okay! Your images are saved in the history below.", "ai");
    });
}

function startNewRound() {
    stage = 1;
    uploadedBase64 = null;
    imageUpload.value = "";
    enableEditor();
    editor.setAttribute("data-placeholder", "Describe your edit...");
    appendMessage("Let's start fresh! Upload your drawing and describe how you'd like the AI to edit it.", "ai");
}

// ===============================
// File Download Helper
// ===============================
function downloadSingle(filename, base64) {
    const a = document.createElement("a");
    a.href = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
