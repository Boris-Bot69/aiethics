// chatbot.js — streamlined horizontal gallery + PDF download
document.addEventListener("DOMContentLoaded", () => {
    const chatPanel = document.querySelector(".chat-panel");
    const chatMessages = document.querySelector(".chat-messages");
    const chatEditor = document.getElementById("chatEditor");
    const sendBtn = chatPanel.querySelector(".send-btn");
    const uploadBtn = document.getElementById("uploadBtn");
    const imageInput = document.getElementById("imageUpload");
    const galleryContainer = chatPanel.querySelector("#panelGallery");

    galleryContainer.id = "panelGallery";
    galleryContainer.className = "panel-gallery";

    const downloadAllBtn = document.getElementById("downloadAllBtn");
    downloadAllBtn.disabled = true;
    downloadAllBtn.style.opacity = "0.6";

    let uploadedBase64 = null;
    let isProcessing = false;
    let sessionId = crypto.randomUUID();
    const API_BASE = window.location.hostname.includes("onrender.com")
        ? "https://aiethics-5ncx.onrender.com"
        : "http://localhost:3000";

    setTimeout(() => {
        addBotMessage(
            "👋 Welcome to <em>AI Superhero Comic Builder!</em><br>Upload your image and describe your hero’s powers to start your story! Add maximum 6 Images! If you want to finish (earlier) the comic, type something related with the word conclusion"
        );
    }, 200);

    // === Upload image ===
    uploadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        imageInput.click();
    });

    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            uploadedBase64 = ev.target.result;
            addUserMessage("Image uploaded!");
            addBotMessage("Now describe your superhero’s powers or mission to begin!");
        };
        reader.readAsDataURL(file);
    });

    // === Send on Enter ===
    chatEditor.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    sendBtn.addEventListener("click", async () => {
        const prompt = chatEditor.innerText.trim();
        if (!prompt) return;
        addUserMessage(prompt);
        chatEditor.innerText = "";
        await generatePanel(prompt);
    });

    // === Generate panel ===
    async function generatePanel(prompt) {
        if (isProcessing) return;
        if (!uploadedBase64) {
            addBotMessage("Please upload an image first.");
            return;
        }

        try {
            isProcessing = true;
            addBotMessage("Generating your next comic panel...");

            const response = await fetch(`${API_BASE}/generate-panel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, imageBase64: uploadedBase64, prompt }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Server error");
            if (data.message) {
                addBotMessage(data.message);
                return;
            }

            addImageMessage(data.image, "ai");
            addPanelToGallery(data.image);

            if (data.ended) {
                addBotMessage("Your story has reached an ending! Generate your final comic PDF by clicking the button");
                await generatePDF();
            } else {
                addBotMessageWithSuggestion("What happens next?");
            }
        } catch (err) {
            console.error("Error generating panel:", err);
            addBotMessage(`Error! Please try again with your prompt`);
        } finally {
            isProcessing = false;
        }
    }

    function addPanelToGallery(imageDataUrl) {
        const wrapper = document.createElement("div");
        wrapper.className = "panel-card";

        const img = document.createElement("img");
        img.src = imageDataUrl;
        img.className = "panel-thumb";

        const delBtn = document.createElement("button");
        delBtn.className = "panel-delete-btn";
        delBtn.textContent = "✖";
        delBtn.title = "Delete panel";
        delBtn.addEventListener("click", () => {
            wrapper.remove();
            fetch(`${API_BASE}/delete-panel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, imageDataUrl }),
            });
        });

        const downloadBtn = document.createElement("a");
        downloadBtn.className = "panel-download-btn";
        downloadBtn.textContent = "⬇️";
        downloadBtn.href = imageDataUrl;
        downloadBtn.download = `panel_${Date.now()}.png`;

        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        wrapper.appendChild(downloadBtn);
        galleryContainer.appendChild(wrapper);

        galleryContainer.classList.add("has-images"); // ⬅ add this

        downloadAllBtn.disabled = false;
        downloadAllBtn.style.opacity = "1";
    }


    // === Generate final PDF ===
    async function generatePDF() {
        try {
            const res = await fetch(`${API_BASE}/generate-comic-pdf?sessionId=${sessionId}`);
            const data = await res.json();
            if (res.ok && data.pdf) {
                const link = document.createElement("a");
                link.href = data.pdf;
                link.download = "AI_Superhero_Comic.pdf";
                link.textContent = "📄 Download your Comic PDF";
                const msg = document.createElement("div");
                msg.className = "message ai-message";
                msg.appendChild(link);
                chatMessages.appendChild(msg);
            } else {
                addBotMessage("Could not generate final PDF.");
            }
        } catch (err) {
            console.error("PDF error:", err);
        }
    }

    downloadAllBtn.addEventListener("click", generatePDF);

    // === Chat helpers ===
    function addBotMessage(html) {
        const msg = document.createElement("div");
        msg.className = "message ai-message";
        msg.innerHTML = `<div class="avatar"></div><div class="text">${html}</div>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    function addBotMessageWithSuggestion(text) {
        const msg = document.createElement("div");
        msg.className = "message ai-message";
        msg.innerHTML = `
      <div class="avatar"></div>
      <div class="text">
        ${text}
        <div class="suggest-inline">
          <button class="suggest-inline-btn">Suggest Prompt</button>
          <button class="reset-inline-btn">New Hero</button>
        </div>
      </div>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // === Suggest Prompt button ===
        msg.querySelector(".suggest-inline-btn").addEventListener("click", async (e) => {
            const btn = e.target;
            btn.disabled = true;
            const originalText = btn.textContent;
            btn.textContent = "⏳ Wait for a second...";
            btn.style.opacity = "0.6";

            try {
                const res = await fetch(`${API_BASE}/suggest-panel-prompt`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId }),
                });
                const data = await res.json();

                if (data.suggestion) {
                    // 💡 Create new message with Accept button
                    const suggestionMsg = document.createElement("div");
                    suggestionMsg.className = "message ai-message";
                    suggestionMsg.innerHTML = `
                  <div class="avatar"></div>
                  <div class="text">
                    💡 Suggestion: <em>${data.suggestion}</em>
                    <div class="suggest-accept">
                      <button class="accept-suggestion-btn">Accept</button>
                    </div>
                  </div>`;
                    chatMessages.appendChild(suggestionMsg);
                    chatMessages.scrollTop = chatMessages.scrollHeight;

                    // === Accept Suggestion button logic ===
                    const acceptBtn = suggestionMsg.querySelector(".accept-suggestion-btn");
                    acceptBtn.addEventListener("click", async () => {
                        addUserMessage(data.suggestion);
                        await generatePanel(data.suggestion);
                    });
                } else {
                    addBotMessage("⚠️ No suggestion available.");
                }
            } catch (err) {
                addBotMessage(`Error fetching suggestion: ${err.message}`);
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
                btn.style.opacity = "1";
            }
        });

        // === Reset Hero button ===
        msg.querySelector(".reset-inline-btn").addEventListener("click", async () => {
            await fetch(`${API_BASE}/reset-story`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
            });
            sessionId = crypto.randomUUID();
            galleryContainer.innerHTML = "";
            addBotMessage("New hero session started!");
        });
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
        msg.innerHTML = `<div class="avatar"></div><div class="text"><img src="${src}" class="chat-image-preview"/></div>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});