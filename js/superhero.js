document.addEventListener("DOMContentLoaded", () => {
    const uploadBtn = document.getElementById("uploadBtn");
    const imageInput = document.getElementById("imageUpload");

    // Open file picker when upload button is clicked
    uploadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        imageInput.click();
    });

    // Handle image selection
    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            console.log("Image selected:", file.name);

            const chatMessages = document.querySelector(".chat-messages");
            const msg = document.createElement("div");
            msg.className = "message user-align";
            msg.innerHTML = `
                <div class="avatar"></div>
                <div class="text">
                    <img src="${base64}" alt="Uploaded image" class="chat-image-preview" />
                </div>`;
            chatMessages.appendChild(msg);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Save globally
            window.uploadedSuperheroBase64 = base64;
        };
        reader.readAsDataURL(file);
    });
});

let chatPanel, chatMessages, chatEditor, sendBtn;
let isProcessing = false;

window.addEventListener("DOMContentLoaded", () => {
    chatPanel = document.querySelector(".chat-panel");
    chatMessages = chatPanel.querySelector(".chat-messages");
    chatEditor = document.getElementById("chatEditor");
    sendBtn = chatPanel.querySelector(".send-btn");

    // Press Enter to send message
    chatEditor.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    // Send message button
    sendBtn.addEventListener("click", handleSendMessage);

    addBotMessage(`
Welcome to <em>AI Superhero</em>.<br>
Upload a photo or drawing of yourself and describe your superhero idea.<br>
The AI will reimagine you as an ethical AI defender.
    `);
});

// =============================================================
// Chat Utilities
// =============================================================
function addBotMessage(html) {
    const msg = document.createElement("div");
    msg.className = "message ai-message";
    msg.innerHTML = `<div class="avatar"></div><div class="text">${html}</div>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(text) {
    const msg = document.createElement("div");
    msg.className = "message user-align";
    msg.innerHTML = `<div class="avatar"></div><div class="text">${text}</div>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addImageMessage(src, sender = "ai") {
    const msg = document.createElement("div");
    msg.className = `message ${sender === "user" ? "user-align" : "ai-message"}`;
    msg.innerHTML = `
        <div class="avatar"></div>
        <div class="text">
            <img src="${src}" alt="Generated superhero" class="chat-image-preview"/>
        </div>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// =============================================================
// Message Handler
// =============================================================
async function handleSendMessage() {
    if (isProcessing) return;

    const prompt = chatEditor.innerText.trim();
    if (!prompt) return;

    addUserMessage(prompt);
    chatEditor.innerText = "";

    if (!window.uploadedSuperheroBase64) {
        addBotMessage("Please upload an image first before sending a description.");
        return;
    }

    try {
        isProcessing = true;
        addBotMessage("Generating your AI superhero… please wait.");
        const API_BASE =
            window.location.hostname.includes("onrender.com")
                ? "https://aiethics-5ncx.onrender.com"
                : "http://localhost:3000";
        const response = await fetch(`${API_BASE}/generate-superhero`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                imageBase64: window.uploadedSuperheroBase64,
                prompt: `Transform this person or drawing into an AI superhero that embodies ethical AI principles. ${prompt}`,
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Server error");

        addImageMessage(data.image, "ai");
        addBotMessage(`
Here’s your superhero.<br>
You can refine the description or upload another image to create variations.
        `);

        // Add Restart Button
        const restartBtn = document.createElement("button");
        restartBtn.className = "download-btn";
        restartBtn.textContent = "Start new superhero";
        restartBtn.onclick = () => {
            resetSession();
        };
        const wrap = document.createElement("div");
        wrap.className = "restart-controls";
        wrap.appendChild(restartBtn);
        addMessageNode(wrap);

    } catch (err) {
        console.error("Generation error:", err);
        addBotMessage(`An error occurred: ${err.message}`);
    } finally {
        isProcessing = false;
    }
}

// =============================================================
// Restart Helper
// =============================================================
function resetSession() {
    window.uploadedSuperheroBase64 = null;
    chatEditor.innerText = "";
    addBotMessage(`
Session reset.<br>
You can now upload a new photo or drawing to start creating another superhero.
    `);

    const imageInput = document.getElementById("imageUpload");
    if (imageInput) imageInput.click();
}

function addMessageNode(node) {
    const msg = document.createElement("div");
    msg.className = "message ai-message";
    const container = document.createElement("div");
    container.classList.add("text");
    container.appendChild(node);
    msg.appendChild(document.createElement("div")).classList.add("avatar");
    msg.appendChild(container);
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
