document.addEventListener("DOMContentLoaded", () => {


    const uploadBtn = document.getElementById("uploadBtn");
    const imageInput = document.getElementById("imageUpload");

    // 🔹 Enable upload button to open file picker
    uploadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        imageInput.click();
    });

    // 🔹 Handle image selection
    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            console.log("📷 Image selected:", file.name);

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

let chatPanel, chatMessages, chatEditor, sendBtn, uploadedBase64;
let isProcessing = false;

window.addEventListener("DOMContentLoaded", () => {
    chatPanel = document.querySelector(".chat-panel");
    chatMessages = chatPanel.querySelector(".chat-messages");
    chatEditor = document.getElementById("chatEditor");
    sendBtn = chatPanel.querySelector(".send-btn");
    uploadedBase64 = null;

    // ---- Press Enter to send ----
    chatEditor.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    // ---- Send Message Button ----
    sendBtn.addEventListener("click", handleSendMessage);

    addBotMessage(
        "👋 Welcome to <em>AI Superhero!</em><br>Upload a photo or drawing of yourself and describe your superhero idea. Gemini will reimagine you as an ethical AI defender!"
    );
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
      <img src="${src}" alt="AI generated superhero" class="chat-image-preview"/>
    </div>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// =============================================================
// Handlers
// =============================================================
async function handleSendMessage() {
    if (isProcessing) return;
    const prompt = chatEditor.innerText.trim(); // ✅ use chatEditor, not chatInput
    if (!prompt) return;

    addUserMessage(prompt);
    chatEditor.innerText = ""; // ✅ clear chat editor

    if (!window.uploadedSuperheroBase64) {
        addBotMessage("⚠️ Please upload an image first before sending a prompt.");
        return;
    }

    try {
        isProcessing = true;
        addBotMessage("🧠 Generating your AI Superhero… please wait ⏳");

        const response = await fetch("http://localhost:3000/generate-superhero", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                imageBase64: window.uploadedSuperheroBase64,
                prompt: `Transform this person or drawing into an AI Superhero that embodies ethical AI principles. ${prompt}`,
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Server error");

        addImageMessage(data.image, "ai");
        addBotMessage(
            "Here’s your superhero! 💫 You can refine the description or upload another image to create variations."
        );
    } catch (err) {
        console.error("❌ Generation error:", err);
        addBotMessage(`Error: ${err.message}`);
    } finally {
        isProcessing = false;
    }
}
