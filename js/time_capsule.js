// time_capsule.js
document.addEventListener("DOMContentLoaded", () => {
    console.log("Time Capsule Bot initialized");

    const messages = document.querySelector(".chat-messages");
    const input = document.getElementById("chatEditor");
    const sendBtn = document.querySelector(".send-btn");
    const imageInput = document.getElementById("imageUpload");
    const uploadBtn = document.getElementById("uploadBtn");

    let uploadedImageBase64 = null;
    let lastSentImageBase64 = null;

    const steps = ["reflect", "design", "capsule"];
    let currentStepIndex = 0;

    let reflectionText = "";
    let designOutputs = [];
    let currentDesignMode = null;

    let reflectOkLast = false;
    let reflectDecisionRow = null;
    let designButtonsRow = null;
    let styleChipsRow = null;

    // ----------------------------------------------------------
    // Helper: show a sequence of bot messages one by one
    // Each message gets a typing indicator before it appears.
    // ----------------------------------------------------------

    async function showSequence(msgs, typingMs = 700, pauseMs = 400) {
        for (const text of msgs) {
            const typing = showTyping();
            await new Promise(r => setTimeout(r, typingMs));
            typing.remove();
            await addMessage(text, true);
            await new Promise(r => setTimeout(r, pauseMs));
        }
    }

    // ----------------------------------------------------------
    // Helper functions
    // ----------------------------------------------------------

    function addMessage(text, isAI = false, image = null) {
        if (!text && !image) return;

        const msg = document.createElement("div");
        msg.className = `message ${isAI ? "ai-message" : "user-align"}`;

        const avatar = document.createElement("div");
        avatar.className = "avatar";
        const textDiv = document.createElement("div");
        textDiv.className = "text";

        if (image) {
            const img = document.createElement("img");
            img.className = "chat-image-preview zoomable";
            img.src = image;
            textDiv.appendChild(img);
        }

        msg.appendChild(avatar);
        msg.appendChild(textDiv);
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;

        if (text && isAI) {
            return typeWrite(textDiv, text.replace(/\n/g, "<br>"));
        } else if (text) {
            textDiv.innerHTML = text.replace(/\n/g, "<br>");
        }
    }

    function showTyping() {
        const msg = document.createElement("div");
        msg.className = "message ai-message typing";

        const avatar = document.createElement("div");
        avatar.classList.add("avatar");

        const bubble = document.createElement("div");
        bubble.classList.add("typing-indicator");
        bubble.innerHTML = `
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        `;

        msg.appendChild(avatar);
        msg.appendChild(bubble);
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
        return msg;
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

    function isMeaningfulText(text, minChars = 15, minWords = 3) {
        if (!text) return false;
        const t = text.trim();
        if (!t) return false;
        const words = t.split(/\s+/).filter(Boolean);
        return t.length >= minChars && words.length >= minWords;
    }

    // ----------------------------------------------------------
    // Style suggestion chips (shown when editing text)
    // ----------------------------------------------------------

    function showStyleSuggestions() {
        if (styleChipsRow) return;

        const chatPanel = document.querySelector(".chat-panel");
        const inputBar = document.querySelector(".chat-input-bar");

        const row = document.createElement("div");
        row.className = "suggestion-row style-chips-row";

        const styles = [
            { label: "Make it funny",    text: "Make it funny and playful!" },
            { label: "Make it serious",  text: "Make it serious and professional." },
            { label: "Make it simple",   text: "Make it very simple and easy to understand." },
            { label: "Make it exciting", text: "Make it exciting and dramatic!" },
            { label: "Make it short",    text: "Make it short and to the point." }
        ];

        styles.forEach(style => {
            const btn = document.createElement("button");
            btn.className = "suggestion-btn design-mode-btn style-chip-btn";
            btn.type = "button";
            btn.textContent = style.label;
            btn.addEventListener("click", () => {
                input.textContent = style.text;
                input.focus();
            });
            row.appendChild(btn);
        });

        chatPanel.insertBefore(row, inputBar);
        styleChipsRow = row;
    }

    function removeStyleSuggestions() {
        if (styleChipsRow) {
            styleChipsRow.remove();
            styleChipsRow = null;
        }
    }

    // ----------------------------------------------------------
    // REFLECT DECISION BUTTONS
    // Shown after Step 1 is accepted: edit or continue to Step 2
    // ----------------------------------------------------------

    function showReflectDecisionButtons() {
        if (reflectDecisionRow) return;

        const chatPanel = document.querySelector(".chat-panel");
        const inputBar = document.querySelector(".chat-input-bar");

        const row = document.createElement("div");
        row.className = "suggestion-row design-mode-row";

        const editBtn = document.createElement("button");
        editBtn.className = "suggestion-btn design-mode-btn";
        editBtn.type = "button";
        editBtn.textContent = "Edit my message";
        editBtn.addEventListener("click", () => {
            row.remove();
            reflectDecisionRow = null;
            reflectionText = "";
            reflectOkLast = false;
            const typing = showTyping();
            setTimeout(() => {
                typing.remove();
                addMessage(
                    "No problem! Write your updated message in the chat box below and press send when you are ready.",
                    true
                );
            }, 400);
        });

        const continueBtn = document.createElement("button");
        continueBtn.className = "suggestion-btn design-mode-btn design-finish-btn";
        continueBtn.type = "button";
        continueBtn.textContent = "Continue to Step 2";
        continueBtn.addEventListener("click", () => {
            row.remove();
            reflectDecisionRow = null;
            goToNextStep();
        });

        row.appendChild(editBtn);
        row.appendChild(continueBtn);
        chatPanel.insertBefore(row, inputBar);
        reflectDecisionRow = row;
    }

    // ----------------------------------------------------------
    // DESIGN MODE BUTTONS (Step 2)
    // ----------------------------------------------------------

    function showDesignModeButtons() {
        if (designButtonsRow) return;

        const chatPanel = document.querySelector(".chat-panel");
        const inputBar = document.querySelector(".chat-input-bar");

        const row = document.createElement("div");
        row.className = "suggestion-row design-mode-row";

        const modes = [
            { id: "change_text", label: "Change my text with AI" },
            { id: "edit_image",  label: "Make a visual representation" }
        ];

        modes.forEach(mode => {
            const btn = document.createElement("button");
            btn.className = "suggestion-btn design-mode-btn";
            btn.type = "button";
            btn.textContent = mode.label;

            btn.addEventListener("click", () => {
                currentDesignMode = mode.id;
                input.textContent = "";
                input.focus();

                const typing = showTyping();
                setTimeout(() => {
                    typing.remove();

                    if (mode.id === "change_text") {
                        addMessage(
                            "Sure! I can rewrite your text in a new style.\n\n" +
                            "How do you want it to sound? Click one of the style buttons below, or write your own idea in the chat box and press send!",
                            true
                        );
                        showStyleSuggestions();
                    }

                    if (mode.id === "edit_image") {
                        addMessage(
                            "Let's create a visual for your time capsule!\n\n" +
                            "You can upload any picture: a drawing, a photo, or anything you like. I will transform it into an AI version inspired by your message.\n\n" +
                            "Click the + button on the left to upload your picture. I will let you know when I have it!",
                            true
                        );
                    }
                }, 300);
            });

            row.appendChild(btn);
        });

        // Build Time Capsule button
        const finishBtn = document.createElement("button");
        finishBtn.className = "suggestion-btn design-mode-btn design-finish-btn";
        finishBtn.type = "button";
        finishBtn.textContent = "Build Time Capsule";
        finishBtn.addEventListener("click", () => {
            currentStepIndex = steps.indexOf("capsule");
            designButtonsRow.remove();
            designButtonsRow = null;
            removeStyleSuggestions();
            showStepIntro("capsule");
        });
        row.appendChild(finishBtn);

        chatPanel.insertBefore(row, inputBar);
        designButtonsRow = row;
    }

    // ----------------------------------------------------------
    // STEP LOGIC
    // ----------------------------------------------------------

    async function handleReflect(text) {
        if (!isMeaningfulText(text, 20, 3)) {
            reflectOkLast = false;
            return "Hmm, can you say a little more? Try to write at least two short sentences. What is AI, and what should people in the future watch out for?";
        }

        reflectionText = text;
        reflectOkLast = true;
        return (
            "That is a great message! I have saved it.\n\n" +
            "Would you like to edit it a bit more, or are you ready to move on to Step 2?"
        );
    }

    async function handleDesign(text) {
        const mode = currentDesignMode;

        if (!mode) {
            return "Please click one of the buttons above to choose what you want to do first!";
        }

        // CHANGE TEXT mode
        if (mode === "change_text") {
            if (!reflectionText) {
                return "I could not find your message from Step 1. Please go back and write your message first!";
            }

            const instructions = text.trim() || "";
            const prompt = `
You are helping a student rewrite their reflection for a time capsule message to a future civilization.
Use simple, friendly language that a child can understand.

Original student reflection:
"${reflectionText}"

${instructions
    ? `Student instructions for the rewrite:\n"${instructions}"`
    : "Rewrite it to be clearer and more powerful, keeping the student's voice and ideas."}

Write 3 to 5 sentences.
Do not mention that this is AI-generated.
Write as if the student is speaking directly to the future civilization.
`;
            const res = await api("/chat", { text: prompt });

            if (!res || res.error || !res.text) {
                console.error("AI change text error:", res?.error);
                return "Something went wrong. Please try again!";
            }

            const aiMessage = res.text.trim();
            designOutputs.push({
                type: "text",
                mode: "change_text",
                source: "ai",
                content: aiMessage
            });

            removeStyleSuggestions();
            currentDesignMode = null;

            return (
                "Here is your rewritten text:\n\n" +
                aiMessage +
                "\n\nThis is saved in your Time Capsule.\n\n" +
                "You can rewrite it again or make a visual using the buttons below. When you are happy, click Build Time Capsule."
            );
        }

        // MAKE A VISUAL REPRESENTATION mode
        if (mode === "edit_image") {
            if (!lastSentImageBase64) {
                return "I do not have your picture yet. Please click the + button on the left to upload a picture first. I will let you know when I have it!";
            }

            if (!isMeaningfulText(text, 5, 1)) {
                return "Please write a few words about what you want me to do with your picture. For example: \"Make it look futuristic.\" Then press send!";
            }

            const originalImageSrc = lastSentImageBase64;

            const res = await api("/edit-image-capsule", {
                imageBase64: originalImageSrc,
                prompt: text
            });

            if (!res || res.error) {
                console.error("AI edit image error:", res?.error);
                // Keep lastSentImageBase64 intact so the user can retry without re-uploading
                return "Something went wrong with the transformation. Your picture is still saved. Please try writing a different description and press send!";
            }

            const imgSrc = res.image
                ? `data:${res.mimeType || "image/png"};base64,${res.image}`
                : null;

            if (!imgSrc) {
                return "Something went wrong with the transformation. Your picture is still saved. Please try writing a different description and press send!";
            }

            // Success: only now clear the image and save to outputs
            lastSentImageBase64 = null;
            designOutputs.push({
                type: "image",
                mode: "edit_image",
                source: "student",
                src: originalImageSrc
            });
            designOutputs.push({
                type: "image",
                mode: "ai_image",
                source: "ai",
                src: imgSrc
            });

            currentDesignMode = null;
            addMessage("Here is your AI-generated visual:", true, imgSrc);
            return "Your visual is saved in your Time Capsule.\n\nYou can add more or click Build Time Capsule when you are ready!";
        }

        return "Please click one of the buttons above to choose what you want to do!";
    }

    async function handleByStep(stepId, text) {
        if (stepId === "reflect") return handleReflect(text);
        if (stepId === "design") return handleDesign(text);
        if (stepId === "capsule") return "Scroll up to see your Time Capsule. You can also download it as a PDF below.";
    }

    // ----------------------------------------------------------
    // SUMMARY BUILDING
    // ----------------------------------------------------------

    function buildCapsuleSummary() {
        let summary = "";

        summary += "My Time Capsule — Message to the Future\n\n";
        summary += 'My message:\n"' + reflectionText + '"\n\n';

        const textDesigns = designOutputs.filter(d => d.type === "text");
        if (textDesigns.length > 0) {
            summary += "My texts:\n";
            textDesigns.forEach((d, i) => {
                const label = d.mode === "change_text" ? "AI-improved text" : "text";
                summary += "(" + (i + 1) + ") [" + label + "] " + d.content + "\n\n";
            });
        } else {
            summary += "My texts:\n(none)\n\n";
        }

        const images = designOutputs.filter(d => d.type === "image");
        if (images.length > 0) {
            const studentImages = images.filter(i => i.source === "student").length;
            const aiImages = images.filter(i => i.source === "ai").length;
            summary += "My visuals:\n";
            summary += "- My uploaded pictures: " + studentImages + "\n";
            summary += "- AI-generated visuals: " + aiImages + "\n\n";
        } else {
            summary += "My visuals:\n(none)\n\n";
        }

        summary += "Ideas for saving your Time Capsule:\n";
        summary += "- Print this or download the PDF.\n";
        summary += "- Put it in an envelope and write a future year on it.\n";
        summary += "- Email it to your future self.\n";
        summary += "- Set a reminder to open it in 5, 10, or 20 years.\n";

        return summary;
    }

    // ----------------------------------------------------------
    // PDF BUTTON
    // ----------------------------------------------------------

    function showDownloadPdfButton() {
        const row = document.createElement("div");
        row.className = "suggestion-row design-mode-row";

        const btn = document.createElement("button");
        btn.className = "suggestion-btn design-mode-btn design-finish-btn";
        btn.textContent = "Download my Time Capsule as PDF";

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
                addMessage("The PDF could not be created. Please try again!", true);
                return;
            }

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

    async function showStepIntro(stepId) {
        if (stepId === "design") {
            await addMessage(
                "Step 2: Visualize your time capsule!\n\n" +
                "Below are your options. You can pick more than one, and go back and forth as often as you like.\n\n" +
                "When you are done, click Build Time Capsule.",
                true
            );
            showDesignModeButtons();
            return;
        }

        if (stepId === "capsule") {
            await addMessage(
                "Your Time Capsule is ready! Here is everything you put together:",
                true
            );

            if (reflectionText) {
                await addMessage("Your message:\n\n\"" + reflectionText + "\"", true);
            }

            const modeLabels = {
                change_text: "Your AI-improved text",
                edit_image:  "Your uploaded picture",
                ai_image:    "Your AI-generated visual"
            };

            for (const output of designOutputs) {
                const label = modeLabels[output.mode] || "Your content";
                if (output.type === "text") {
                    await addMessage(label + ":\n\n" + output.content, true);
                } else if (output.type === "image") {
                    await addMessage(label + ":", true, output.src);
                }
            }

            await addMessage(
                "Well done! Here are some ideas for saving your Time Capsule:\n\n" +
                "- Print it or download the PDF below.\n" +
                "- Put it in an envelope and write a year on it, like 2035 or 2050.\n" +
                "- Email it to yourself to open later.\n" +
                "- Set a reminder to open it in 5, 10, or 20 years.",
                true
            );

            showDownloadPdfButton();
        }
    }

    function goToNextStep() {
        if (currentStepIndex < steps.length - 1) {
            currentStepIndex++;
            showStepIntro(steps[currentStepIndex]);
        } else {
            addMessage("You have finished the AI Time Capsule. Well done!", true);
        }
    }

    // ----------------------------------------------------------
    // Initialization — sequential welcome messages
    // ----------------------------------------------------------

    function showWelcome() {
        showSequence([
            "Welcome to the AI Time Capsule!",

            "Your task is to write a message to a future civilization, people who will live 500 years from now.",

            "Imagine that people in the future find the AI that was developed today.\n" +
            "What would they have to know about it and about its potential risks?\n\n" +
            "Did you know that scientists who built nuclear waste storage sites faced the same challenge? " +
            "They had to leave warnings for people thousands of years in the future. These people might speak a completely different language and live in a very different world. " +
            "They had to think hard about how to communicate danger across time.\n\n" +
            "Now it is your turn to do the same, but for AI!",

            "Here are two questions to guide you:\n\n" +
            "- What would you tell people in 500 years?\n" +
            "- What message would you like to share about AI and its risks?\n\n" +
            "Type your answer in the chat box below and press send when you are ready!"
        ]);
    }

    showWelcome();

    // ----------------------------------------------------------
    // Send message
    // ----------------------------------------------------------

    sendBtn.addEventListener("click", async () => {
        const text = input.textContent.trim();
        const stepId = steps[currentStepIndex];

        if (!text && !uploadedImageBase64) return;

        lastSentImageBase64 = uploadedImageBase64;

        addMessage(text, false, uploadedImageBase64);

        input.textContent = "";
        uploadedImageBase64 = null;

        const typing = showTyping();
        const reply = await handleByStep(stepId, text);
        typing.remove();

        addMessage(reply, true);

        if (stepId === "reflect" && reflectOkLast) {
            setTimeout(showReflectDecisionButtons, 400);
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    if (uploadBtn) {
        uploadBtn.addEventListener("click", (e) => {
            e.preventDefault();
            imageInput.click();
        });
    }

    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = "";

        const reader = new FileReader();
        reader.onload = () => {
            uploadedImageBase64 = reader.result;

            const typing = showTyping();
            setTimeout(() => {
                typing.remove();
                addMessage(
                    "I have your picture!\n\n" +
                    "Now write a few sentences in the chat box to tell me what you want me to do with it.\n\n" +
                    "For example:\n" +
                    "- \"Make it look like it is from the future.\"\n" +
                    "- \"Add glowing lights and a futuristic city.\"\n" +
                    "- \"Make it look mysterious and dramatic.\"\n\n" +
                    "Type your idea and press send when you are ready!",
                    true
                );
            }, 500);
        };
        reader.readAsDataURL(file);
    });
});
