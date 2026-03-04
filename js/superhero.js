// superhero.js
document.addEventListener("DOMContentLoaded", () => {
    const chatPanel       = document.querySelector(".chat-panel");
    const chatMessages    = document.querySelector(".chat-messages");
    const chatEditor      = document.getElementById("chatEditor");
    const sendBtn         = chatPanel.querySelector(".send-btn");
    const uploadBtn       = document.getElementById("uploadBtn");
    const imageInput      = document.getElementById("imageUpload");
    const galleryContainer = chatPanel.querySelector("#panelGallery");
    const downloadAllBtn  = document.getElementById("downloadAllBtn");

    galleryContainer.id        = "panelGallery";
    galleryContainer.className = "panel-gallery";

    downloadAllBtn.disabled     = true;
    downloadAllBtn.style.opacity = "0.6";

    let uploadedBase64 = null;
    let isProcessing   = false;
    let sessionId      = crypto.randomUUID();

    const API_BASE = window.location.hostname.includes("onrender.com")
        ? "https://aiethics-5ncx.onrender.com"
        : "http://localhost:3000";

    // ── Welcome ──
    setTimeout(() => {
        addBotMessage(
            "Welcome to <em>AI Superhero Comic Builder</em>.<br>" +
            "Upload a photo of your hero and describe their powers to begin. " +
            "You can create as many panels as you like — finish whenever you're ready!"
        );
    }, 200);

    // ── Upload ──
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
            addUserMessage("Image uploaded.");
            addBotMessage("Now that we have an idea of how your hero looks — what does the first panel show? What is the beginning of the story?");
        };
        reader.readAsDataURL(file);
    });

    // ── Send on Enter ──
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

    // ── Typing indicator ──
    function showTyping() {
        if (chatMessages.querySelector(".message.typing")) return;
        const msg = document.createElement("div");
        msg.className = "message typing";
        msg.innerHTML = `
            <div class="avatar"></div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTyping() {
        chatMessages.querySelector(".message.typing")?.remove();
    }

    // ── Generate a regular panel ──
    async function generatePanel(prompt) {
        if (isProcessing) return;
        if (!uploadedBase64) {
            addBotMessage("Please upload an image first.");
            return;
        }

        try {
            isProcessing = true;
            addBotMessage("Generating your next comic panel…");
            showTyping();

            const response = await fetch(`${API_BASE}/generate-panel`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ sessionId, imageBase64: uploadedBase64, prompt }),
            });

            const data = await response.json();
            hideTyping();

            if (!response.ok) throw new Error(data.error || "Server error");

            addImageMessage(data.image);
            addPanelToGallery(data.image);

            const count = galleryContainer.querySelectorAll(".panel-card").length;
            showPanelActions(count);

        } catch (err) {
            console.error("generatePanel error:", err);
            hideTyping();
            addBotMessage("Something went wrong. Try a longer or different description.");
        } finally {
            isProcessing = false;
        }
    }

    // ── Finish comic: generate concluding panel then PDF ──
    async function finishComic() {
        if (isProcessing) return;

        try {
            isProcessing = true;
            addBotMessage("Generating your final panel to wrap up the story…");
            showTyping();

            const response = await fetch(`${API_BASE}/finish-story`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ sessionId, imageBase64: uploadedBase64 }),
            });

            const data = await response.json();
            hideTyping();

            if (!response.ok) throw new Error(data.error || "Server error");

            addImageMessage(data.image);
            addPanelToGallery(data.image);

            addBotMessage("Your story has an ending! Generating your comic PDF now…");
            await generatePDF();

        } catch (err) {
            console.error("finishComic error:", err);
            hideTyping();
            addBotMessage("Could not generate the final panel. Try again.");
        } finally {
            isProcessing = false;
        }
    }

    // ── Action buttons shown after every panel ──
    function showPanelActions(panelCount) {
        const page       = Math.ceil(panelCount / 6);
        const panelOnPage = ((panelCount - 1) % 6) + 1;
        const pageLabel  = `Page ${page} · Panel ${panelOnPage}`;

        const row = document.createElement("div");
        row.className = "message ai-message";

        row.innerHTML = `
            <div class="avatar"></div>
            <div class="text">
                <span style="font-size:0.9rem;color:#666">${pageLabel} done — what's next?</span>
                <div class="suggest-inline">
                    <button class="add-panel-btn">Add a panel</button>
                    <button class="suggest-inline-btn">Suggest a prompt</button>
                    <button class="finish-comic-btn">End comic</button>
                    <button class="reset-inline-btn">New hero</button>
                </div>
            </div>`;

        chatMessages.appendChild(row);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Add a panel — user writes their own description
        row.querySelector(".add-panel-btn").addEventListener("click", () => {
            disableRowButtons(row);
            addBotMessage("What happens in the next panel? Describe it below.");
            chatEditor.focus();
        });

        // Suggest a prompt
        row.querySelector(".suggest-inline-btn").addEventListener("click", async (e) => {
            const btn = e.target;
            disableRowButtons(row);
            btn.textContent = "Thinking…";
            showTyping();

            try {
                const res  = await fetch(`${API_BASE}/suggest-panel-prompt`, {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ sessionId }),
                });
                const data = await res.json();
                hideTyping();

                if (data.suggestion) {
                    showSuggestion(data.suggestion);
                } else {
                    addBotMessage("No suggestion available right now.");
                    enableRowButtons(row);
                }
            } catch (err) {
                hideTyping();
                addBotMessage("Could not fetch a suggestion.");
                enableRowButtons(row);
            }
        });

        // End comic
        row.querySelector(".finish-comic-btn").addEventListener("click", async () => {
            disableRowButtons(row);
            await finishComic();
        });

        // New hero
        row.querySelector(".reset-inline-btn").addEventListener("click", async () => {
            disableRowButtons(row);
            await fetch(`${API_BASE}/reset-story`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ sessionId }),
            });
            sessionId      = crypto.randomUUID();
            uploadedBase64 = null;
            galleryContainer.innerHTML = "";
            galleryContainer.classList.remove("has-images");
            downloadAllBtn.disabled      = true;
            downloadAllBtn.style.opacity = "0.6";
            addBotMessage("New hero session started. Upload an image to begin a new story.");
        });
    }

    // ── Suggestion bubble with Use this + Edit + Try another + End comic ──
    function showSuggestion(suggestion) {
        const msg = document.createElement("div");
        msg.className = "message ai-message";
        msg.innerHTML = `
            <div class="avatar"></div>
            <div class="text">
                Here's an idea: <em>${suggestion}</em>
                <div class="suggest-inline">
                    <button class="accept-suggestion-btn">Use this</button>
                    <button class="edit-suggestion-btn">Edit</button>
                    <button class="retry-suggestion-btn">Try another</button>
                    <button class="finish-comic-btn">End comic</button>
                </div>
            </div>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Use this prompt
        msg.querySelector(".accept-suggestion-btn").addEventListener("click", async () => {
            disableRowButtons(msg);
            addUserMessage(suggestion);
            await generatePanel(suggestion);
        });

        // Edit — load suggestion into editor for the user to modify
        msg.querySelector(".edit-suggestion-btn").addEventListener("click", () => {
            disableRowButtons(msg);
            chatEditor.innerText = suggestion;
            chatEditor.focus();
            const range = document.createRange();
            range.selectNodeContents(chatEditor);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });

        // Try another suggestion
        msg.querySelector(".retry-suggestion-btn").addEventListener("click", async (e) => {
            const btn = e.target;
            disableRowButtons(msg);
            btn.textContent = "Thinking…";
            showTyping();

            try {
                const res  = await fetch(`${API_BASE}/suggest-panel-prompt`, {
                    method:  "POST",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ sessionId }),
                });
                const data = await res.json();
                hideTyping();

                if (data.suggestion) {
                    showSuggestion(data.suggestion);
                } else {
                    addBotMessage("No new suggestion available.");
                    enableRowButtons(msg);
                }
            } catch (err) {
                hideTyping();
                addBotMessage("Could not fetch a new suggestion.");
                enableRowButtons(msg);
            }
        });

        // End comic
        msg.querySelector(".finish-comic-btn").addEventListener("click", async () => {
            disableRowButtons(msg);
            await finishComic();
        });
    }

    // ── Helpers for button rows ──
    function disableRowButtons(row) {
        row.querySelectorAll("button").forEach(b => { b.disabled = true; b.style.opacity = "0.5"; });
    }

    function enableRowButtons(row) {
        row.querySelectorAll("button").forEach(b => { b.disabled = false; b.style.opacity = "1"; });
    }

    // ── Gallery panel card ──
    function addPanelToGallery(imageDataUrl) {
        const wrapper = document.createElement("div");
        wrapper.className = "panel-card";

        const img = document.createElement("img");
        img.src       = imageDataUrl;
        img.className = "panel-thumb zoomable";

        const delBtn = document.createElement("button");
        delBtn.className   = "panel-delete-btn";
        delBtn.textContent = "✕";
        delBtn.title       = "Remove panel";
        delBtn.addEventListener("click", () => {
            wrapper.remove();
            fetch(`${API_BASE}/delete-panel`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ sessionId, imageDataUrl }),
            });
        });

        const dlBtn = document.createElement("a");
        dlBtn.className    = "panel-download-btn";
        dlBtn.textContent  = "Download";
        dlBtn.href         = imageDataUrl;
        dlBtn.download     = `panel_${Date.now()}.png`;

        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        wrapper.appendChild(dlBtn);
        galleryContainer.appendChild(wrapper);
        galleryContainer.classList.add("has-images");

        downloadAllBtn.disabled      = false;
        downloadAllBtn.style.opacity = "1";
    }

    // ── PDF generation ──
    async function generatePDF() {
        try {
            addBotMessage("Generating your comic PDF, please wait…");
            showTyping();
            const res  = await fetch(`${API_BASE}/generate-comic-pdf?sessionId=${sessionId}`);
            const data = await res.json();
            hideTyping();

            if (res.ok && data.pdf) {
                addBotMessage("Your comic PDF is ready! Check your downloads.");
                const link      = document.createElement("a");
                link.href       = data.pdf;
                link.download   = "AI_Superhero_Comic.pdf";
                link.click();
            } else {
                addBotMessage("Could not generate the PDF. Try clicking Download All above.");
            }
        } catch (err) {
            console.error("PDF error:", err);
            hideTyping();
            addBotMessage("An error occurred while generating the PDF.");
        }
    }

    downloadAllBtn.addEventListener("click", generatePDF);

    // ── Chat helpers ──
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

    function addImageMessage(src) {
        const msg = document.createElement("div");
        msg.className = "message ai-message";
        msg.innerHTML = `<div class="avatar"></div><div class="text"><img src="${src}" class="chat-image-preview zoomable"/></div>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
