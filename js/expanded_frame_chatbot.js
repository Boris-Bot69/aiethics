// ===============================
// EXPANDED FRAMES CHATBOT SCRIPT
// ===============================

let chatPanel, chatMessages, editor, sendBtn, imageUpload;
let uploadedBase64 = null;
let aiConsentGiven = false;
let stage = 1; // A8 → A7 → A6 → A5 → A4

// ===============================
// DOM READY
// ===============================
window.addEventListener("DOMContentLoaded", () => {
    console.log("📦 DOM fully loaded — initializing Expanded Frames chatbot...");

    chatPanel = document.querySelector(".chat-panel");
    chatMessages = chatPanel?.querySelector(".chat-messages");
    editor = document.getElementById("chatEditor");
    sendBtn = chatPanel.querySelector(".send-btn");
    imageUpload = document.getElementById("imageUpload");

    if (!chatPanel || !chatMessages) {
        console.error("❌ Chat panel or chat-messages not found!");
    } else {
        console.log("✅ Chat panel and message container found.");
    }

    addBotMessage(
        "👋 Welcome to the *Expanded Frames* activity!<br><br>Start by uploading your A8 artwork using the 📷 button below. Then describe how you’d like the AI to expand it — from A8 → A7, A7 → A6, and so on until A4.<br><br>Ready when you are!"
    );

    // Upload handler
    const uploadBtn = document.getElementById("uploadBtn");
    if (uploadBtn && imageUpload) {
        uploadBtn.addEventListener("click", () => imageUpload.click());
        imageUpload.addEventListener("change", handleImageUpload);
    }

    // Send button handler
    if (sendBtn) sendBtn.addEventListener("click", sendUserMessage);

    // Enter key
    if (editor) {
        editor.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendUserMessage();
            }
        });
    }

    // Consent modal
    const modal = document.getElementById("consentModal");
    const agreeBtn = document.getElementById("agreeBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    if (modal && agreeBtn && cancelBtn) {
        agreeBtn.addEventListener("click", () => {
            aiConsentGiven = true;
            modal.remove();
            addBotMessage("✅ Great! You can now generate AI expansions.");
        });
        cancelBtn.addEventListener("click", () => {
            modal.remove();
            addBotMessage("⚠️ AI generation disabled — you can still chat about your artwork!");
        });
    }
});

// ===============================
// MESSAGE HELPERS
// ===============================
function addMessage(text, sender = "bot", imageSrc = null) {
    const msg = document.createElement("div");
    msg.className = `message ${sender === "user" ? "user-align" : ""}`;

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");

    const content = document.createElement("div");
    content.classList.add("text");

    if (imageSrc) {
        const img = document.createElement("img");
        img.src = imageSrc;
        img.classList.add("chat-image-preview");

        const downloadBtn = document.createElement("button");
        downloadBtn.textContent = "⬇️ Download Image";
        downloadBtn.classList.add("download-btn");
        downloadBtn.addEventListener("click", () => {
            const link = document.createElement("a");
            link.href = imageSrc;
            link.download = `expanded_frame_${Date.now()}.png`;
            link.click();
        });

        content.appendChild(img);
        content.appendChild(downloadBtn);
    }

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

function addBotMessage(text) {
    addMessage(text, "bot");
}

function addUserMessage(text, imageSrc = null) {
    addMessage(text, "user", imageSrc);
}

// ===============================
// IMAGE UPLOAD HANDLER
// ===============================
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        uploadedBase64 = e.target.result;

        // 🧹 Remove previous images (avoid duplicates)
        const oldImages = chatMessages.querySelectorAll(".chat-image-preview");
        oldImages.forEach((img) => img.parentElement.parentElement.remove());

        addUserMessage(null, uploadedBase64);

        const aiStage = ["A8", "A7", "A6", "A5", "A4"];
        addBotMessage(
            `Nice! You've uploaded your ${aiStage[stage - 1]} artwork. Next, I'll help you expand it to ${
                aiStage[stage] || "A4"
            } size. Describe what kind of expansion you’d like.`
        );
    };
    reader.readAsDataURL(file);
}

// ===============================
// SEND MESSAGE HANDLER
// ===============================
async function sendUserMessage() {
    const userText = editor.textContent.trim();
    if (!userText && !uploadedBase64) return;

    addUserMessage(userText);
    editor.textContent = "";

    if (!aiConsentGiven) {
        addBotMessage("⚠️ Please provide consent to use AI image generation first.");
        return;
    }

    if (uploadedBase64) {
        addBotMessage("🧠 Expanding your frame with AI... please wait a moment.");

        try {
            const payload = { image: uploadedBase64, prompt: userText, stage };
            const response = await fetch("http://localhost:3000/expand_image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();
            const imgSrc = data.image_url || data.imageDataUrl || data.image;

            if (imgSrc) {
                addBotMessage("Here’s your AI-expanded artwork!");
                addBotMessage("Upload your next artwork when ready.");

                addMessage(null, "bot", imgSrc.trim());
                uploadedBase64 = null;
                stage++;
            } else {
                addBotMessage("⚠️ No image returned — please try again.");
            }
        } catch (err) {
            console.error("❌ Error:", err);
            addBotMessage("⚠️ Error contacting AI server.");
        }
    } else {
        addBotMessage("Got it! Upload your next artwork when ready.");
    }

    // ✅ After A5 expansion → trigger A4 merge
    if (stage === 5) {
        addBotMessage("🎉 Fantastic — you’ve reached A5! Now I’ll merge all four stages (A8 → A5) into one A4 composite...");
        addBotMessage("🧩 Combining all frames into A4 layout...");

        try {
            const mergeResponse = await fetch("http://localhost:3000/merge_to_a4", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}), // server handles internally
            });

            const mergeData = await mergeResponse.json();

            if (mergeData?.image_url) {
                addBotMessage("✅ Here’s your final A4 artwork — all frames beautifully combined!");
                addMessage(null, "bot", mergeData.image_url);

                // Optional: reset flow to allow a new run
                stage = 1;
                uploadedBase64 = null;
                addBotMessage("You can start a new Expanded Frames run by uploading a new A8 artwork.");
            }
        } catch (err) {
            console.error("❌ Merge error:", err);
            addBotMessage("⚠️ Error while merging into A4 layout — check the console.");
        }
    }
}
