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

    // for reflect step: did we accept the last answer?
    let reflectOkLast = false;

    // keep reference to the current buttons row
    let designButtonsRow = null;

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

    // simple check: is the text long enough and has a few words?
    function isMeaningfulText(text, minChars = 15, minWords = 3) {
        if (!text) return false;
        const t = text.trim();
        if (!t) return false;

        const words = t.split(/\s+/).filter(Boolean);
        return t.length >= minChars && words.length >= minWords;
    }

    // ----------------------------------------------------------
    // DESIGN MODE BUTTONS (Step 2)
    // ----------------------------------------------------------
    function showDesignModeButtons(clearExisting = true) {
        // remove previous row if any
        if (clearExisting && designButtonsRow) {
            designButtonsRow.remove();
            designButtonsRow = null;
        }

        const row = document.createElement("div");
        row.className = "suggestion-row design-mode-row";

        const modes = [
            { id: "text_self",    label: "Write a text message" },
            { id: "symbols",      label: "Write with symbols" },
            { id: "upload_image", label: "Upload drawing or photo" },
            { id: "upload_comic", label: "Upload comic panel" },
            { id: "ai_image",     label: "Use AI to make an image" },
            { id: "ai_text",      label: "Use AI to suggest text" }
        ];

        // main mode buttons
        modes.forEach(mode => {
            const btn = document.createElement("button");
            btn.className = "suggestion-btn design-mode-btn";
            btn.type = "button";
            btn.textContent = mode.label;

            btn.addEventListener("click", () => {
                currentDesignMode = mode.id;

                // hide the whole row when a mode is chosen
                if (designButtonsRow) {
                    designButtonsRow.remove();
                    designButtonsRow = null;
                }

                const typing = showTyping();
                input.textContent = "";
                input.focus();

                setTimeout(() => {
                    typing.remove();

                    switch (mode.id) {
                        case "text_self":
                            addMessage(
                                "Text mode selected.\nWrite your message for the future civilization in your own words (at least two short sentences). Then press send.",
                                true
                            );
                            break;
                        case "symbols":
                            addMessage(
                                "Symbol mode selected.\nUse simple signs or characters to express your ideas. Please make it clear enough that someone in the future can understand the idea. Then press send.",
                                true
                            );
                            break;
                        case "upload_image":
                            addMessage(
                                "Drawing or photo mode selected.\nClick the Upload button, choose your image, and then press send to add it.",
                                true
                            );
                            break;
                        case "upload_comic":
                            addMessage(
                                "Comic mode selected.\nClick the Upload button, choose your comic image, and then press send to add it.",
                                true
                            );
                            break;
                        case "ai_image":
                            addMessage(
                                "AI image mode selected.\nDescribe the image you want the AI to create, in a few clear sentences. Then press send.",
                                true
                            );
                            break;
                        case "ai_text":
                            addMessage(
                                "AI text mode selected.\nDescribe what kind of message you want help with, in a few clear sentences. Then press send.",
                                true
                            );
                            break;
                    }
                }, 300);
            });

            row.appendChild(btn);
        });

        // finish button in the same row
        const finishBtn = document.createElement("button");
        finishBtn.className = "suggestion-btn design-mode-btn design-finish-btn";
        finishBtn.type = "button";
        finishBtn.textContent = "Finish design and build Time Capsule";
        finishBtn.addEventListener("click", () => {
            currentStepIndex = steps.indexOf("capsule");
            if (designButtonsRow) {
                designButtonsRow.remove();
                designButtonsRow = null;
            }
            showStepIntro("capsule");
        });

        row.appendChild(finishBtn);

        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
        designButtonsRow = row;
    }

    // ----------------------------------------------------------
    // STEP LOGIC
    // ----------------------------------------------------------

    async function handleReflect(text) {
        // validation here
        if (!isMeaningfulText(text, 20, 3)) {
            reflectOkLast = false;
            return "Please write a bit more about what AI means to you and which ethical questions are important. Use at least two short sentences.";
        }

        reflectionText = text;
        reflectOkLast = true;
        return "Thank you. Your reflection will be part of your Time Capsule message.";
    }

    async function handleDesign(text) {
        const mode = currentDesignMode || "text_self";

        // 1) STUDENT TEXT
        if (mode === "text_self") {
            if (!isMeaningfulText(text)) {
                return "Please write your message in a bit more detail. Use at least two short sentences so your idea is clear.";
            }

            designOutputs.push({
                type: "text",
                mode: "text_self",
                source: "student",
                content: text
            });

            return "Your text message is saved in the Time Capsule.\nI will show the options again below so you can continue or finish.";
        }

        // 2) SYMBOLS
        if (mode === "symbols") {
            if (!isMeaningfulText(text)) {
                return "Please add a bit more to your symbols or short notes so that someone in the future can understand the idea.";
            }

            designOutputs.push({
                type: "text",
                mode: "symbols",
                source: "student",
                content: text
            });

            return "Your symbol message is saved in the Time Capsule.\nI will show the options again below so you can continue or finish.";
        }

        // 3) UPLOAD IMAGE / COMIC
        if (mode === "upload_image" || mode === "upload_comic") {
            if (!lastSentImageBase64) {
                return "Please click the Upload button, choose your image, and then press send.";
            }

            designOutputs.push({
                type: "image",
                mode,
                source: "student",
                src: lastSentImageBase64
            });

            lastSentImageBase64 = null;

            return "Your picture is saved in the Time Capsule.\nI will show the options again below so you can upload more, switch to another option, or finish.";
        }

        // 4) AI-GENERATED IMAGE
        if (mode === "ai_image") {
            if (!isMeaningfulText(text, 20, 3)) {
                return "Please describe the image you want in a bit more detail. Use at least two short sentences.";
            }

            const prompt = `
Create an illustration that could be sent to a future civilization.
It should show how the student sees AI and important ethical questions.

Student reflection:
"${reflectionText}"

Student image idea:
"${text}"

Do not write words or text inside the image.
`;

            const res = await api("/image", { prompt });

            if (!res || !res.image || res.error) {
                console.error("AI image error:", res?.error);
                return "I could not create the AI image. Please try again or choose another mode.";
            }

            const imgSrc = `data:image/png;base64,${res.image}`;

            designOutputs.push({
                type: "image",
                mode: "ai_image",
                source: "ai",
                src: imgSrc
            });

            addMessage("Here is an AI-generated image you can include in your Time Capsule.", true, imgSrc);

            return "The AI-generated image is saved in the Time Capsule.\nI will show the options again below so you can continue or finish.";
        }

        // 5) AI-GENERATED TEXT
        if (mode === "ai_text") {
            if (!isMeaningfulText(text, 20, 3)) {
                return "Please explain a bit more what kind of message or style you want. Use at least two short sentences.";
            }

            const prompt = `
You are helping a student write a short message for a future civilization.
The message should explain:
- what AI is from the student's point of view,
- which ethical questions or risks are important.

Student reflection:
"${reflectionText}"

Student instructions for style or focus:
"${text}"

Write 3 to 6 sentences.
Do not mention that this is a generated text.
Write as if the student is speaking directly to the future civilization.
`;

            const res = await api("/chat", { text: prompt });

            if (!res || res.error || !res.text) {
                console.error("AI text error:", res?.error);
                return "I could not create the AI text. Please try again or choose another mode.";
            }

            const aiMessage = res.text.trim();

            designOutputs.push({
                type: "text",
                mode: "ai_text",
                source: "ai",
                content: aiMessage
            });

            // switch back to student-text mode afterwards
            currentDesignMode = "text_self";

            return (
                "Here is a suggested message:\n\n" +
                aiMessage +
                "\n\nI will show the options again below. You can:\n" +
                "- write your own version,\n" +
                "- choose another option,\n" +
                "- or click 'Finish design and build Time Capsule'."
            );
        }

        return "Please choose a design option first using the buttons above.";
    }

    async function handleCapsule() {
        return "Scroll up to see your Time Capsule summary. You can also download it as a PDF.";
    }

    async function handleByStep(stepId, text) {
        if (stepId === "reflect") return handleReflect(text);
        if (stepId === "design") return handleDesign(text);
        if (stepId === "capsule") return handleCapsule(text);
    }

    // ----------------------------------------------------------
    // SUMMARY BUILDING
    // ----------------------------------------------------------

    function buildCapsuleSummary() {
        let summary = "";

        summary += "Message to a future civilization about AI\n\n";
        summary += 'Reflection (your first thoughts):\n"' + reflectionText + '"\n\n';

        const textDesigns = designOutputs.filter(d => d.type === "text");
        if (textDesigns.length > 0) {
            summary += "Texts in your Time Capsule:\n";
            textDesigns.forEach((d, i) => {
                let label = "text";

                if (d.mode === "text_self") label = "self-written text";
                else if (d.mode === "symbols") label = "symbols";
                else if (d.mode === "ai_text") label = "AI-suggested text";

                summary += "(" + (i + 1) + ") [" + label + "] " + d.content + "\n\n";
            });
        } else {
            summary += "Texts in your Time Capsule:\n(none)\n\n";
        }

        const images = designOutputs.filter(d => d.type === "image");
        if (images.length > 0) {
            const studentImages = images.filter(i => i.source === "student").length;
            const aiImages = images.filter(i => i.source === "ai").length;
            summary += "Images in your Time Capsule:\n";
            summary += "- Student-created images: " + studentImages + "\n";
            summary += "- AI-generated images: " + aiImages + "\n\n";
        } else {
            summary += "Images in your Time Capsule:\n(none)\n\n";
        }

        summary += "Ideas for storing your Time Capsule:\n";
        summary += "- Print this summary or download the PDF.\n";
        summary += "- Put it in an envelope and write a future year on it.\n";
        summary += "- Email it to your future self.\n";
        summary += "- Set a reminder in 5 to 20 years.\n";

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
        btn.textContent = "Download Time Capsule as PDF";

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
                addMessage("The PDF could not be generated.", true);
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
                "Step 1: Reflect\n\n" +
                "Imagine a civilization 500 years in the future finds your Time Capsule.\n" +
                "Write 2 or 3 sentences:\n" +
                "- What is AI from your point of view today?\n" +
                "- Which ethical questions or risks are most important in your opinion?",
                true
            );
            return;
        }

        if (stepId === "design") {
            addMessage(
                "Step 2: Design your message\n\n" +
                "Now create your message for the future civilization.\n" +
                "You can use your own writing and drawings, and you can also use AI to help.\n" +
                "Choose one option from the buttons, complete that part, and then you can choose another.",
                true
            );
            showDesignModeButtons(true);
            return;
        }

        if (stepId === "capsule") {
            addMessage(
                "Step 3: Time Capsule\n\nHere is a summary of your message for the future civilization.",
                true
            );
            addMessage(buildCapsuleSummary(), true);
            showDownloadPdfButton();
        }
    }

    function goToNextStep() {
        if (currentStepIndex < steps.length - 1) {
            currentStepIndex++;
            showStepIntro(steps[currentStepIndex]);
        } else {
            addMessage("You have completed the AI Time Capsule activity. Thank you for your ideas.", true);
        }
    }

    // ----------------------------------------------------------
    // Initialization
    // ----------------------------------------------------------

    function showWelcome() {
        addMessage(
            "Welcome to the AI Time Capsule activity.\n" +
            "Your task is to create a message for a future civilization.\n" +
            "You can use your own texts and drawings, and you can also use image-generative AI and text-generative AI if you want.\n" +
            "The activity has three steps: Reflect, Design, and Time Capsule.",
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

        if (stepId === "reflect") {
            // only move on if reflection was accepted
            if (reflectOkLast) {
                goToNextStep();
            }
        } else if (stepId === "design") {
            // after each design action, bring back the whole button row
            showDesignModeButtons(true);
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    // Upload button opens the hidden file input
    if (uploadBtn) {
        uploadBtn.addEventListener("click", (e) => {
            e.preventDefault();
            imageInput.click();
        });
    }

    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            uploadedImageBase64 = reader.result;
            addMessage("Image uploaded. Press send to add it in the current mode.", false);
        };
        reader.readAsDataURL(file);
    });
});
