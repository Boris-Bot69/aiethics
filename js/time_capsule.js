// time_capsule.js
document.addEventListener("DOMContentLoaded", () => {
    console.log("🌱 Simple Time Capsule Bot initialized");

    const messages = document.querySelector(".chat-messages");
    const input = document.getElementById("chatEditor");
    const sendBtn = document.querySelector(".send-btn");
    const imageInput = document.getElementById("imageUpload");

    let uploadedImageBase64 = null;

    // Steps in fixed order
    const steps = ["reflect", "design", "share", "improve", "capsule"];
    let currentStepIndex = 0;

    // ------------ helpers ----------------
    function addMessage(text, isAI = false, image = null) {
        if (!text && !image) return;

        const msg = document.createElement("div");
        msg.className = `message ${isAI ? "ai-message" : "user-align"}`;

        msg.innerHTML = `
            <div class="avatar"></div>
            <div class="text">
                ${image ? `<img class="chat-image-preview" src="${image}" />` : ""}
                ${text ? text : ""}
            </div>
        `;

        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
        const div = document.createElement("div");
        div.className = "typing-indicator";
        div.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    async function api(url, body) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            return await res.json();
        } catch (e) {
            console.error(e);
            return { error: e.message };
        }
    }

    // ------------ suggestion buttons INSIDE chat -------------
    const suggestionSets = {
        reflect: [
            { label: "AI means to me…", prompt: "To me, AI is..." },
            { label: "What I learned", prompt: "I learned that AI can..." },
            { label: "Ethical issue", prompt: "An important ethical issue is..." }
        ],
        design: [
            { label: "Draft my message", prompt: "Help me draft my message for a future civilization." },
            { label: "Illustration idea", prompt: "Suggest an illustration idea for my message." },
            { label: "Use symbols", prompt: "Turn my message into symbolic hieroglyphs." }
        ],
        share: [
            { label: "Explain choices", prompt: "I designed my message this way because..." },
            { label: "Describe process", prompt: "My process for creating this message was..." }
        ],
        improve: [
            { label: "Make clearer", prompt: "Please make my message clearer." },
            { label: "More ethical", prompt: "Please highlight the ethical aspects more." },
            { label: "Shorter", prompt: "Please shorten my message but keep the main idea." }
        ],
        capsule: [
            { label: "Final message", prompt: "Create my final time capsule message." },
            { label: "Symbolic image", prompt: "Suggest a symbolic image for my time capsule." },
            { label: "How to save it", prompt: "How can I save or print this message for the future?" }
        ]
    };

    function clearSuggestionRows() {
        document.querySelectorAll(".suggestion-row").forEach(row => row.remove());
    }

    function showSuggestions(stepId) {
        clearSuggestionRows();

        const set = suggestionSets[stepId];
        if (!set) return;

        const row = document.createElement("div");
        row.className = "suggestion-row";

        set.forEach(s => {
            const btn = document.createElement("button");
            btn.className = "suggestion-btn";
            btn.type = "button";
            btn.textContent = s.label;
            btn.addEventListener("click", () => {
                input.textContent = s.prompt;
                sendBtn.click();
            });
            row.appendChild(btn);
        });

        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
    }

    // ------------ bot logic per step ----------------
    async function handleReflect(text) {
        return "Thanks for sharing your thoughts. Your view on AI is part of your Time Capsule.";
    }

    async function handleDesign(text) {
        const res = await api("/pitch", { prompt: text });
        if (res.error) return "I couldn’t work with your idea right now. Please try again.";
        return `Here is a simple version of your message idea:\n\n${res.text}`;
    }

    async function handleShare(text) {
        return "Nice! Your explanation helps others understand your idea.";
    }

    async function handleImprove(text) {
        const res = await api("/refine", {
            idea: text,
            feedback: "Improve clarity, ethics and future relevance."
        });
        if (res.error) return "I couldn’t refine this right now. Please try again.";
        return `Here is an improved version of your message:\n\n${res.text}`;
    }

    async function handleCapsule(text) {
        return "You’re ready to save this as a Time Capsule message. You can now print it, store it, or send it to your future self.";
    }

    async function handleByStep(stepId, text) {
        switch (stepId) {
            case "reflect": return handleReflect(text);
            case "design":  return handleDesign(text);
            case "share":   return handleShare(text);
            case "improve": return handleImprove(text);
            case "capsule": return handleCapsule(text);
            default: {
                const res = await api("/chat", { text });
                if (res.error) return "I had trouble replying — please try again.";
                return res.text;
            }
        }
    }

    function showStepIntro(stepId) {
        let intro = "";
        if (stepId === "reflect") {
            intro = "Step 1 – Reflect: In 1–2 sentences, write what AI means to you or an ethical issue you find important.";
        } else if (stepId === "design") {
            intro = "Step 2 – Design: Describe your message for a future civilization, or ask me to help design it.";
        } else if (stepId === "share") {
            intro = "Step 3 – Share: Explain how you created your message and why you chose this form.";
        } else if (stepId === "improve") {
            intro = "Step 4 – Improve: Paste your message and ask me to make it clearer, shorter, or more ethical.";
        } else if (stepId === "capsule") {
            intro = "Step 5 – Time Capsule: Decide how you want to save this message for your future self.";
        }

        addMessage(intro, true);
        showSuggestions(stepId);
    }

    function goToNextStep() {
        if (currentStepIndex < steps.length - 1) {
            currentStepIndex++;
            const nextStep = steps[currentStepIndex];
            showStepIntro(nextStep);
        } else {
            clearSuggestionRows();
            addMessage("🎉 That’s it! You’ve completed the AI Time Capsule activity.", true);
        }
    }

    // ------------ intro on load ----------------
    function showWelcome() {
        addMessage(
            "👋 Welcome to the AI Time Capsule. I’ll guide you through 5 short steps. Just answer in 1–3 sentences and click the buttons when you need help.",
            true
        );
        showStepIntro("reflect");
    }

    showWelcome();

    // ------------ sending messages -------------
    sendBtn.addEventListener("click", async () => {
        const text = input.textContent.trim();
        if (!text && !uploadedImageBase64) return;

        const stepId = steps[currentStepIndex];

        addMessage(text, false, uploadedImageBase64);
        input.textContent = "";
        uploadedImageBase64 = null;

        const typing = showTyping();
        const reply = await handleByStep(stepId, text);
        typing.remove();

        addMessage(reply, true);

        // move to next step after every user message
        goToNextStep();
    });

    // Enter = send, Shift+Enter = newline
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    // optional image upload (can be ignored in UI)
    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            uploadedImageBase64 = reader.result;
            addMessage("📷 Image uploaded!", false, uploadedImageBase64);
        };
        reader.readAsDataURL(file);
    });
});
