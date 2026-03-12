document.addEventListener("DOMContentLoaded", () => {
    console.log("Prototype & Pitch chatbot ready.");

    const chatMessages = document.querySelector(".chat-messages");
    const chatEditor   = document.getElementById("chatEditor");
    const sendBtn      = document.querySelector(".send-btn");
    const imageInput   = document.getElementById("imageUpload");
    const uploadBtn    = document.getElementById("uploadBtn");


    let ideaText         = "";
    let lastPitchText    = "";
    let lastFeedbackText = "";
    let uploadedImageBase64 = null;
    let isBusy           = false;


    let actionButtonsRow = null;

    



    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

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
            img.alt = "Uploaded image";
            img.src = image;
            textDiv.appendChild(img);
        }
        msg.appendChild(avatar);
        msg.appendChild(textDiv);
        chatMessages.appendChild(msg);
        scrollToBottom();
        if (text && isAI) {
            return typeWrite(textDiv, text.replace(/\n/g, "<br>"));
        } else if (text) {
            textDiv.innerHTML = text.replace(/\n/g, "<br>");
        }
    }

    function showTyping() {
        hideTyping();
        const bubble = document.createElement("div");
        bubble.className = "message ai-message typing";
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
        const existing = chatMessages.querySelector(".message.ai-message.typing");
        if (existing) existing.remove();
    }

    



    async function apiFetch(url, body) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            return await res.json();
        } catch (e) {
            console.error(`[${url}] error:`, e);
            return { error: e.message };
        }
    }

    



    function removeActionButtons() {
        if (actionButtonsRow) {
            actionButtonsRow.remove();
            actionButtonsRow = null;
        }
    }

    function showActionButtons() {
        removeActionButtons();

        const row = document.createElement("div");
        row.className = "suggestion-row design-mode-row";

        const actions = [
            { id: "components",  label: "Show key components" },
            { id: "pitch",       label: "Write a pitch" },
            { id: "image",       label: "Generate concept image" },
            { id: "feedback",    label: "Stakeholder feedback" },
            { id: "refine",      label: "Refine my idea" },
            { id: "restart",     label: "Start over" }
        ];

        actions.forEach(action => {
            const btn = document.createElement("button");
            btn.className = "suggestion-btn design-mode-btn" + (action.id === "restart" ? " design-finish-btn" : "");
            btn.type = "button";
            btn.textContent = action.label;

            btn.addEventListener("click", async () => {
                if (isBusy) return;
                removeActionButtons();
                isBusy = true;
                await handleAction(action.id);
                isBusy = false;

                if (ideaText) showActionButtons();
            });

            row.appendChild(btn);
        });

        chatMessages.appendChild(row);
        scrollToBottom();
        actionButtonsRow = row;
    }

    



    async function handleAction(actionId) {
        switch (actionId) {

            case "components": {
                showTyping();
                const data = await apiFetch("/pitch", { prompt: ideaText });
                hideTyping();
                if (data.error) {
                    addMessage("Something went wrong getting the components. Please try again.", true);
                } else {
                    addMessage("Here are the key components of your AI product:\n\n" + data.text, true);
                }
                break;
            }

            case "pitch": {
                showTyping();
                const data = await apiFetch("/pitchExample", { idea: ideaText });
                hideTyping();
                if (data.error) {
                    addMessage("Something went wrong writing the pitch. Please try again.", true);
                } else {
                    lastPitchText = data.text;
                    addMessage("Here is a short pitch you can use or refine:\n\n" + data.text, true);
                }
                break;
            }

            case "image": {
                showTyping();
                const prompt = `Concept image for this school AI product: ${ideaText}`;
                const data = await apiFetch("/image", { prompt });
                hideTyping();
                if (data.error || !data.image) {
                    addMessage("I could not generate an image right now. Please try again.", true);
                } else {
                    const imgSrc = `data:image/png;base64,${data.image}`;
                    addMessage("Here is a concept image for your AI product. You can refine your idea and generate another.", true, imgSrc);
                }
                break;
            }

            case "feedback": {

                const baseText = lastPitchText || ideaText;
                showTyping();
                const data = await apiFetch("/feedback", { text: baseText });
                hideTyping();
                if (data.error) {
                    addMessage("Something went wrong getting feedback. Please try again.", true);
                } else {
                    lastFeedbackText = data.text;
                    addMessage("Here is stakeholder-style feedback on your product:\n\n" + data.text, true);
                }
                break;
            }

            case "refine": {
                if (!lastFeedbackText) {
                    addMessage(
                        "I do not have any feedback yet. Click \"Stakeholder feedback\" first, then come back to refine.",
                        true
                    );
                    break;
                }
                showTyping();
                const data = await apiFetch("/refine", { idea: ideaText, feedback: lastFeedbackText });
                hideTyping();
                if (data.error) {
                    addMessage("Something went wrong during refinement. Please try again.", true);
                } else {

                    ideaText        = data.text;
                    lastPitchText   = "";
                    lastFeedbackText = "";
                    addMessage(
                        "Here is your refined AI product idea:\n\n" + data.text +
                        "\n\nI've updated your idea. You can now write a new pitch, generate a new image, or keep refining.",
                        true
                    );
                }
                break;
            }

            case "restart": {
                ideaText         = "";
                lastPitchText    = "";
                lastFeedbackText = "";
                uploadedImageBase64 = null;
                removeActionButtons();
                addMessage(
                    "Starting fresh! Please describe your new AI product idea for your school.",
                    true
                );
                break;
            }
        }
    }

    



    async function handleSend() {
        if (isBusy) return;

        const text            = chatEditor.textContent.trim();
        const imageToSend     = uploadedImageBase64;

        if (!text && !imageToSend) return;

        addMessage(text, false, imageToSend);
        chatEditor.textContent = "";
        uploadedImageBase64 = null;


        if (!ideaText) {
            if (text.length < 20) {
                addMessage("Please write a bit more so I can understand your AI product idea.", true);
                return;
            }
            ideaText = text;
            addMessage(
                "Great, I saved your AI product idea! Now choose what you'd like to do:",
                true
            );
            showActionButtons();
            return;
        }


        if (text) {
            ideaText += "\n" + text;
            lastPitchText    = "";
            lastFeedbackText = "";
            addMessage(
                "I've updated your idea with what you added. Choose an action below to continue.",
                true
            );
            showActionButtons();
        }
    }

    sendBtn.addEventListener("click", handleSend);

    chatEditor.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
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
        const reader = new FileReader();
        reader.onload = (ev) => {
            uploadedImageBase64 = ev.target.result;
            addMessage("Image ready. Press send to include it.", false);
        };
        reader.readAsDataURL(file);

        e.target.value = "";
    });

    



    addMessage(
        "Welcome to the Prototype & Pitch activity.\n" +
        "Start by describing your AI product idea. What will it do, and how will it help your school reach a Sustainable Development Goal?",
        true
    );
});
