// time_capsule.js
document.addEventListener("DOMContentLoaded", () => {
    console.log("Time Capsule Bot (v2.1) initialized");

    const messages = document.querySelector(".chat-messages");
    const input = document.getElementById("chatEditor");
    const sendBtn = document.querySelector(".send-btn");
    const imageInput = document.getElementById("imageUpload");

    let uploadedImageBase64 = null;

    // NEW 3-step flow
    const steps = ["reflect", "design", "capsule"];
    let currentStepIndex = 0;

    // Stored data
    let reflectionText = "";
    let designOutputs = [];
    let currentDesignMode = null;

    // ----------------------------------------------------------
    // Helper functions
    // ----------------------------------------------------------

    function addMessage(text, isAI = false, image = null) {
        if (!text && !image) return;

        const msg = document.createElement("div");
        msg.className = `message ${isAI ? "ai-message" : "user-align"}`;

        msg.innerHTML = `
            <div class="avatar"></div>
            <div class="text">
                ${image ? `<img class="chat-image-preview" src="${image}" />` : ""}
                ${text ? text.replace(/\n/g, "<br>") : ""}
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

    // ----------------------------------------------------------
    // DESIGN MODE BUTTONS (Step 2)
    // ----------------------------------------------------------
    function showDesignModeButtons() {
        const row = document.createElement("div");
        row.className = "suggestion-row design-mode-row";

        const modes = [
            { id: "text", label: "📝 Text Message" },
            { id: "image", label: "🎨 Image" },
            { id: "comic", label: "📚 Comic" },
            { id: "hieroglyph", label: "🔣 Symbols" }
        ];

        modes.forEach(mode => {
            const btn = document.createElement("button");
            btn.className = "suggestion-btn design-mode-btn";
            btn.type = "button";
            btn.textContent = mode.label;

            btn.addEventListener("click", () => {
                currentDesignMode = mode.id;

                const typing = showTyping();
                input.textContent = "";
                input.focus();

                setTimeout(() => {
                    typing.remove();
                    addMessage(
                        `✔️ ${mode.label.replace(/^[^\s]+\s*/, "")} mode selected.<br>
                    Now type what you want me to create.`,
                        true
                    );
                }, 800);
            });

            row.appendChild(btn);
        });

        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
    }

    // ----------------------------------------------------------
    // DESIGN LOGIC
    // ----------------------------------------------------------

    async function handleReflect(text) {
        reflectionText = text;
        return "Thanks! Your reflection will be part of your Time Capsule.";
    }

    async function handleDesign(text) {
        const mode = currentDesignMode || "text";

        const combinedIdea = `
Student reflection:
"${reflectionText}"

Design input:
"${text}"
    `.trim();

        const typing = showTyping();

        /* -------- TEXT MODE -------- */
        if (mode === "text") {
            const res = await api("/pitchExample", { idea: combinedIdea });
            typing.remove();

            if (res.error) return "I couldn’t create a message.";

            designOutputs.push({
                type: "text",
                mode: "text",
                content: res.text
            });

            return "Here is your written Time Capsule message:\n\n" + res.text;
        }

        /* -------- HIEROGLYPH (emoji-symbolic) -------- */
        if (mode === "hieroglyph") {
            const prompt = `
Turn the following concept into a symbolic emoji-based hieroglyph representation.
Keep it short and fun.

${combinedIdea}
        `;
            const res = await api("/chat", { text: prompt });
            typing.remove();

            if (res.error) return "I couldn’t create hieroglyphs.";

            designOutputs.push({
                type: "text",
                mode: "hieroglyph",
                content: res.text
            });

            return "Here is your symbolic version:\n\n" + res.text;
        }

        /* -------- IMAGE MODE -------- */
        if (mode === "image") {
            const promptForImage = `
Create a child-friendly illustration for a classroom.
No text, labels, or numbers.

Student understanding of AI:
"${reflectionText}"

Use friendly visual metaphors.
        `;

            const res = await api("/image", { prompt: promptForImage });
            typing.remove();

            if (!res || !res.image) return "I couldn’t create the image.";

            const imgSrc = `data:image/png;base64,${res.image}`;

            designOutputs.push({
                type: "image",
                mode: "image",
                src: imgSrc
            });

            addMessage("Here is your illustration:", true, imgSrc);
            return "This image has been added to your Time Capsule.";
        }

        /* -------- COMIC MODE -------- */
        if (mode === "comic") {
            const promptForComic = `
Create a comic-style vignette representing:
"${reflectionText}"
No text or speech bubbles.
        `;

            const res = await api("/image", { prompt: promptForComic });
            typing.remove();

            if (!res || !res.image) return "I couldn’t create the comic.";

            const imgSrc = `data:image/png;base64,${res.image}`;

            designOutputs.push({
                type: "image",
                mode: "comic",
                src: imgSrc
            });

            addMessage("Your comic panel:", true, imgSrc);
            return "This comic image has been added to your Time Capsule.";
        }

        typing.remove();
        return "Please choose a mode above first.";
    }

    // ----------------------------------------------------------
    // SUMMARY BUILDING
    // ----------------------------------------------------------

    function buildCapsuleSummary() {
        let summary = "";

        summary += `Reflection:\n"${reflectionText}"\n\n`;

        const textDesign = designOutputs.find(d => d.type === "text");
        if (textDesign) {
            summary += `Designed Message (${textDesign.mode}):\n${textDesign.content}\n\n`;
        } else {
            summary += "Designed Message:\n(No text created)\n\n";
        }

        const images = designOutputs.filter(d => d.type === "image");
        if (images.length > 0) {
            summary += `Images created: ${images.length}\n\n`;
        } else {
            summary += "Images: (None)\n\n";
        }

        summary += `Tips for storing your Time Capsule:
- Print this summary or download the PDF.
- Put it in an envelope and mark a future year.
- Email it to your future self.
- Set a reminder in 5–20 years.\n`;

        return summary;
    }

    async function handleCapsule() {
        return "Scroll up to see your summary.";
    }

    async function handleByStep(stepId, text) {
        if (stepId === "reflect") return handleReflect(text);
        if (stepId === "design") return handleDesign(text);
        if (stepId === "capsule") return handleCapsule(text);
    }

    // ----------------------------------------------------------
    // PDF BUTTON
    // ----------------------------------------------------------
    function showDownloadPdfButton() {
        const row = document.createElement("div");
        row.className = "suggestion-row design-mode-row";

        const btn = document.createElement("button");
        btn.className = "suggestion-btn design-mode-btn";
        btn.textContent = "📄 Download Time Capsule PDF";

        btn.addEventListener("click", async () => {
            const typing = showTyping();

            const res = await fetch("/generate-capsule-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reflection: reflectionText,
                    designs: designOutputs
                })
            });

            typing.remove();

            const data = await res.json();

            if (!data.pdf_url) {
                addMessage("PDF could not be generated.", true);
                return;
            }

            // Trigger browser download
            const a = document.createElement("a");
            a.href = data.pdf_url;
            a.download = "AI_Time_Capsule.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
        });

        row.appendChild(btn);
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
    }


    // ----------------------------------------------------------
    // Step intros
    // ----------------------------------------------------------

    function showStepIntro(stepId) {
        if (stepId === "reflect") {
            addMessage(
                "Step 1 – Reflect: What does AI mean to you? Write 1–2 sentences.",
                true
            );
            return;
        }

        if (stepId === "design") {
            addMessage(
                "Step 2 – Design: Choose how to create your Time Capsule message.",
                true
            );
            showDesignModeButtons();
            return;
        }

        if (stepId === "capsule") {
            addMessage("Step 3 – Time Capsule Summary:", true);
            addMessage(buildCapsuleSummary(), true);
            showDownloadPdfButton();
        }
    }

    function goToNextStep() {
        if (currentStepIndex < steps.length - 1) {
            currentStepIndex++;
            showStepIntro(steps[currentStepIndex]);
        } else {
            addMessage("🎉 You completed the AI Time Capsule activity!", true);
        }
    }

    // ----------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------

    function showWelcome() {
        addMessage(
            "Welcome to the AI Time Capsule! Reflect → Design → Save.",
            true
        );
        showStepIntro("reflect");
    }

    showWelcome();

    // ----------------------------------------------------------
    // Send message
    // ----------------------------------------------------------

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

        if (stepId !== "capsule") goToNextStep();
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            uploadedImageBase64 = reader.result;
            addMessage("Image uploaded!", false);
        };
        reader.readAsDataURL(file);
    });
});
