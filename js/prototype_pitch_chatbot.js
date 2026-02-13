// ../../js/prototype_pitch_chatbot.js
document.addEventListener("DOMContentLoaded", () => {
    console.log("Prototype & Pitch chatbot ready.");

    const chatMessages = document.querySelector(".chat-messages");
    const chatEditor   = document.getElementById("chatEditor");
    const sendBtn      = document.querySelector(".send-btn");
    const imageInput   = document.getElementById("imageUpload");

    // Simple state
    let ideaText = "";
    let lastPitchText = "";
    let lastFeedbackText = "";
    let lastImageBase64 = "";
    let isBusy = false;

    /* ================================
       BASIC HELPERS
    ================================= */

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addBotMessage(text) {
        hideTyping();
        const msg = document.createElement("div");
        msg.className = "message bot";
        msg.innerHTML = `
            <div class="avatar"></div>
            <div class="text">${text}</div>
        `;
        chatMessages.appendChild(msg);
        scrollToBottom();
    }

    function addUserMessage(text) {
        const msg = document.createElement("div");
        msg.className = "message user-align";
        msg.innerHTML = `
            <div class="avatar"></div>
            <div class="text">${text}</div>
        `;
        chatMessages.appendChild(msg);
        scrollToBottom();
    }

    function addBotImage(base64) {
        hideTyping();
        const msg = document.createElement("div");
        msg.className = "message bot";
        msg.innerHTML = `
            <div class="avatar"></div>
            <div class="text">
                <img src="data:image/png;base64,${base64}" class="chat-image-preview zoomable" alt="Generated concept image">
            </div>
        `;
        chatMessages.appendChild(msg);
        scrollToBottom();
    }

    function showTyping() {
        hideTyping();
        const bubble = document.createElement("div");
        bubble.className = "message bot typing";
        bubble.innerHTML = `
            <div class="avatar"></div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(bubble);
        scrollToBottom();
    }

    function hideTyping() {
        const bubble = chatMessages.querySelector(".message.bot.typing");
        if (bubble) bubble.remove();
    }

    /* ================================
       API HELPERS
    ================================= */

    async function requestPitchComponents(text) {
        console.log("Calling /pitch with:", text);
        const res = await fetch("/pitch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: text })
        });
        return res.json();
    }

    async function requestPitchExample(text) {
        console.log("Calling /pitchExample with:", text);
        const res = await fetch("/pitchExample", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idea: text })
        });
        return res.json();
    }

    async function requestImage(prompt) {
        console.log("Calling /image with:", prompt);
        const res = await fetch("/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        });
        return res.json();
    }

    async function requestFeedback(text) {
        console.log("Calling /feedback with:", text);
        const res = await fetch("/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });
        return res.json();
    }

    async function requestRefine(idea, feedback) {
        console.log("Calling /refine with:", { idea, feedback });
        const res = await fetch("/refine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idea, feedback })
        });
        return res.json();
    }

    /* ================================
       INPUT HANDLERS
    ================================= */

    // ENTER key submits
    chatEditor.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendBtn.click();
        }
    });

    // (Optional) click-to-open image chooser if you want later
    // document.getElementById("someUploadBtn").addEventListener("click", () => imageInput.click());
    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result.split(",")[1];
            lastImageBase64 = base64;
            const msg = document.createElement("div");
            msg.className = "message user-align";
            msg.innerHTML = `
                <div class="avatar"></div>
                <div class="text">
                    <img src="${ev.target.result}" class="chat-image-preview zoomable" alt="Uploaded image">
                </div>
            `;
            chatMessages.appendChild(msg);
            scrollToBottom();
        };
        reader.readAsDataURL(file);
    });

    /* ================================
       COMMAND INTERPRETATION
    ================================= */

    function showHelperMenu() {
        addBotMessage(
            "I saved your AI product idea. You can now ask me to help with:\n" +
            "- \"show components\" – outline the main parts of your product\n" +
            "- \"write a pitch\" – draft a short pitch text\n" +
            "- \"generate an image\" – create a simple concept image\n" +
            "- \"stakeholder feedback\" – simulate feedback from different people\n" +
            "- \"refine the idea\" – improve your idea using feedback\n" +
            "You can also keep typing to change or extend your idea."
        );
    }

    async function handleCommand(userText) {
        const lower = userText.toLowerCase();

        // Restart: clear state
        if (lower.includes("restart")) {
            ideaText = "";
            lastPitchText = "";
            lastFeedbackText = "";
            lastImageBase64 = "";
            addBotMessage("New round started. Please describe a new AI product idea for your school.");
            return;
        }

        // If no idea yet: first message is the idea
        if (!ideaText) {
            // Very short input => ask for more detail
            if (userText.length < 20) {
                hideTyping();
                addBotMessage("Please write a bit more so I can understand your AI product idea.");
                return;
            }
            ideaText = userText;
            hideTyping();
            showHelperMenu();
            return;
        }

        // After idea is set: interpret commands
        try {
            if (lower.includes("components") || lower.includes("main parts")) {
                showTyping();
                const data = await requestPitchComponents(ideaText);
                hideTyping();
                addBotMessage("Here are some key components of your AI product:\n" + data.text);
                return;
            }

            if (lower.includes("write a pitch") || lower.includes("pitch")) {
                showTyping();
                const data = await requestPitchExample(ideaText);
                hideTyping();
                lastPitchText = data.text;
                addBotMessage("Here is a short pitch you can refine:\n" + data.text);
                return;
            }

            if (lower.includes("image") || lower.includes("illustration") || lower.includes("visual")) {
                showTyping();
                const prompt = `Concept image for this school AI product: ${ideaText}`;
                const data = await requestImage(prompt);
                hideTyping();
                if (data && data.image) {
                    lastImageBase64 = data.image;
                    addBotImage(data.image);
                    addBotMessage("Here is a simple concept image. You can adjust your idea and ask for another image if you like.");
                } else {
                    addBotMessage("I could not generate an image right now.");
                }
                return;
            }

            if (lower.includes("stakeholder") || lower.includes("feedback")) {
                showTyping();
                const baseText = lastPitchText || ideaText;
                const data = await requestFeedback(baseText);
                hideTyping();
                lastFeedbackText = data.text;
                addBotMessage("Here is some stakeholder-style feedback you can use to improve your design:\n" + data.text);
                return;
            }

            if (lower.includes("refine") || lower.includes("improve")) {
                if (!lastFeedbackText) {
                    hideTyping();
                    addBotMessage("I do not have feedback yet. You can first ask for \"stakeholder feedback\" and then ask me to refine.");
                    return;
                }
                showTyping();
                const data = await requestRefine(ideaText, lastFeedbackText);
                hideTyping();
                ideaText = data.text; // store refined idea
                addBotMessage(
                    "Here is a refined version of your idea based on the feedback:\n" +
                    data.text +
                    "\n\nYou can continue refining, ask for a new pitch, or simply keep editing your idea in your own words."
                );
                return;
            }

            // Default: user is just extending / changing the idea
            hideTyping();
            ideaText += "\n" + userText;
            addBotMessage(
                "Thanks, I added this to your idea. You can keep writing, or ask me to \"show components\", \"write a pitch\", \"generate an image\", \"stakeholder feedback\", or \"refine the idea\"."
            );
        } catch (err) {
            console.error("Error while handling command:", err);
            hideTyping();
            addBotMessage("Something went wrong on my side. Please try again in a moment.");
        }
    }

    /* ================================
       SEND BUTTON
    ================================= */

    sendBtn.addEventListener("click", () => {
        if (isBusy) {
            return; // avoid spamming while a request is running
        }

        const userText = chatEditor.innerText.trim();
        if (!userText) return;

        addUserMessage(userText);
        chatEditor.innerText = "";

        isBusy = true;
        showTyping();

        handleCommand(userText).finally(() => {
            isBusy = false;
        });
    });

    /* ================================
       INITIAL MESSAGE
    ================================= */

    addBotMessage(
        "Welcome. This chatbot is here to support your AI product design and pitch.\n" +
        "Start by writing your AI product idea in your own words.\n" +
        "Later you can ask me things like \"show components\", \"write a pitch\", \"generate an image\", \"stakeholder feedback\", or \"refine the idea\"."
    );
});
