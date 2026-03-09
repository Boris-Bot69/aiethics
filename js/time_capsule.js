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
    let designButtonsRow = null;
    let styleChipsRow = null;

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
                ${image ? `<img class="chat-image-preview zoomable" src="${image}" />` : ""}
                ${text ? text.replace(/\n/g, "<br>") : ""}
            </div>
        `;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
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
            { id: "edit_image",  label: "Add a picture with AI" }
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
                            "Sure! I can rewrite your text in a cool new style!\n\n" +
                            "How do you want it to sound?\n" +
                            "Click one of the style buttons that appear below — or write your own idea in the chat box and press send!",
                            true
                        );
                        showStyleSuggestions();
                    }

                    if (mode.id === "edit_image") {
                        addMessage(
                            "Let's add a picture to your Time Capsule!\n\n" +
                            "Step 1: Click the + button on the left side to upload your picture.\n" +
                            "I will tell you when I got it, and then ask you what to do with it!",
                            true
                        );
                    }
                }, 300);
            });

            row.appendChild(btn);
        });

        // Finish button
        const finishBtn = document.createElement("button");
        finishBtn.className = "suggestion-btn design-mode-btn design-finish-btn";
        finishBtn.type = "button";
        finishBtn.textContent = "I'm done! Build my Time Capsule!";
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
            return "Hmm, can you say a little more? Try to write at least two short sentences — tell me what AI is and one thing people in the future should watch out for!";
        }

        reflectionText = text;
        reflectOkLast = true;
        return "Amazing! I saved your answer. What a great description!";
    }

    async function handleDesign(text) {
        const mode = currentDesignMode;

        // No mode selected yet
        if (!mode) {
            return "Please click one of the buttons above to choose what you want to do first!";
        }

        // CHANGE TEXT mode
        if (mode === "change_text") {
            if (!reflectionText) {
                return "Oops! I could not find your answer from Step 1. Please go back and write about AI first!";
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
                return "Oops! Something went wrong. Please try again!";
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
                "Here is your new and improved text:\n\n" +
                aiMessage +
                "\n\nGreat job! This is saved in your Time Capsule.\n\n" +
                "You can change it again or add a picture using the buttons below. When you are happy, click \"I'm done!\"."
            );
        }

        // ADD PICTURE mode
        if (mode === "edit_image") {
            if (!lastSentImageBase64) {
                return "I don't have your picture yet! Please click the + button on the left to upload your picture first. I will let you know when I got it!";
            }

            if (!isMeaningfulText(text, 5, 1)) {
                return "Please write a few words about what you want me to do with your picture. For example: \"Make it look futuristic!\" Then press send!";
            }

            // Save the original upload before clearing it
            const originalImageSrc = lastSentImageBase64;
            designOutputs.push({
                type: "image",
                mode: "edit_image",
                source: "student",
                src: originalImageSrc
            });
            lastSentImageBase64 = null;

            // Send the actual uploaded image + the student's instruction to the server
            const res = await api("/edit-image-capsule", {
                imageBase64: originalImageSrc,
                prompt: text
            });

            if (!res || res.error) {
                console.error("AI edit image error:", res?.error);
                return "Oops! I could not make the AI picture. Your original picture is still saved. Try again or use another option!";
            }

            const imgSrc = res.image
                ? `data:${res.mimeType || "image/png"};base64,${res.image}`
                : null;

            if (!imgSrc) {
                return "Oops! I could not make the AI picture. Your original picture is still saved. Try again or use another option!";
            }

            designOutputs.push({
                type: "image",
                mode: "ai_image",
                source: "ai",
                src: imgSrc
            });

            currentDesignMode = null;
            addMessage("Here is your AI-made picture:", true, imgSrc);
            return "Wow, that looks amazing! Your picture is saved in your Time Capsule.\n\nYou can add more or click \"I'm done!\" when you are ready!";
        }

        return "Please click one of the buttons above to choose what you want to do!";
    }

    async function handleByStep(stepId, text) {
        if (stepId === "reflect") return handleReflect(text);
        if (stepId === "design") return handleDesign(text);
        if (stepId === "capsule") return "Scroll up to see your Time Capsule! You can also download it as a PDF below.";
    }

    // ----------------------------------------------------------
    // SUMMARY BUILDING
    // ----------------------------------------------------------

    function buildCapsuleSummary() {
        let summary = "";

        summary += "My Time Capsule — Message to the Future\n\n";
        summary += 'My answer about AI:\n"' + reflectionText + '"\n\n';

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
            summary += "My pictures:\n";
            summary += "- My uploaded pictures: " + studentImages + "\n";
            summary += "- AI-made pictures: " + aiImages + "\n\n";
        } else {
            summary += "My pictures:\n(none)\n\n";
        }

        summary += "Ideas for saving your Time Capsule:\n";
        summary += "- Print this or download the PDF.\n";
        summary += "- Put it in an envelope and write a future year on it.\n";
        summary += "- Email it to your future self.\n";
        summary += "- Set a reminder to open it in 5, 10, or 20 years!\n";

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
                addMessage("Oops! The PDF could not be made. Please try again!", true);
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

    function showStepIntro(stepId) {
        if (stepId === "reflect") {
            addMessage(
                "Step 1: Tell Me About AI!\n\n" +
                "Imagine people living 500 years in the future find the AI we have today.\n" +
                "What would they need to know?\n\n" +
                "In a few sentences, please tell me:\n" +
                "- What is AI? Explain it like you are talking to someone who has never seen it!\n" +
                "- What is one important thing people should watch out for?\n\n" +
                "Type your answer in the chat box below and press send when you are ready!",
                true
            );
            return;
        }

        if (stepId === "design") {
            addMessage(
                "Step 2: Make Your Capsule Look Amazing!\n\n" +
                "Now let's make your message even better with AI!\n\n" +
                "You have two choices — and you can do both:\n" +
                "- Change your text — I can rewrite it in a fun or cool style!\n" +
                "- Add a picture — upload one and I will make an AI version of it!\n\n" +
                "Use the buttons below to choose. When you are done, click \"I'm done!\"",
                true
            );
            showDesignModeButtons();
            return;
        }

        if (stepId === "capsule") {
            addMessage(
                "Step 3: Your Time Capsule is Ready!\n\n" +
                "Amazing work! Here is everything you made:",
                true
            );

            if (reflectionText) {
                addMessage("Your answer about AI:\n\n\"" + reflectionText + "\"", true);
            }

            const modeLabels = {
                change_text: "Your AI-improved text",
                edit_image:  "Your uploaded picture",
                ai_image:    "Your AI-made picture"
            };

            designOutputs.forEach(output => {
                const label = modeLabels[output.mode] || "Your content";
                if (output.type === "text") {
                    addMessage(label + ":\n\n" + output.content, true);
                } else if (output.type === "image") {
                    addMessage(label + ":", true, output.src);
                }
            });

            addMessage(
                "You just built your own AI Time Capsule — great job!\n\n" +
                "Here are some ideas for saving it:\n" +
                "- Print it or download the PDF below.\n" +
                "- Put it in an envelope and write a year on it, like 2035 or 2050!\n" +
                "- Email it to yourself to open later.\n" +
                "- Set a reminder to open it in 5, 10, or 20 years!",
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
            addMessage("You finished the AI Time Capsule! Fantastic work!", true);
        }
    }

    // ----------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------

    function showWelcome() {
        addMessage(
            "Welcome to the AI Time Capsule!\n\n" +
            "You are going to write a special message for the future — 500 years from now!\n\n" +
            "Here is what we will do together:\n" +
            "1. You tell me what AI is in your own words.\n" +
            "2. We make your message look amazing with AI help!\n" +
            "3. We save everything in your very own Time Capsule.\n\n" +
            "Ready? Let's go!",
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
            goToNextStep();
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
        // Reset the input so the same file can be selected again later
        e.target.value = "";

        const reader = new FileReader();
        reader.onload = () => {
            uploadedImageBase64 = reader.result;

            // Bot confirms receipt and gives clear next step
            const typing = showTyping();
            setTimeout(() => {
                typing.remove();
                addMessage(
                    "I got your picture! Great choice!\n\n" +
                    "Now write a few sentences in the chat box below to tell me what you want me to do with it.\n\n" +
                    "Here are some ideas:\n" +
                    "- \"Make it look like it is from the future!\"\n" +
                    "- \"Add glowing robots and bright colors!\"\n" +
                    "- \"Make it look magical and mysterious!\"\n\n" +
                    "Type your idea and press send when you are ready!",
                    true
                );
            }, 500);
        };
        reader.readAsDataURL(file);
    });
});
