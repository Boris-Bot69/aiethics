document.addEventListener("DOMContentLoaded", () => {

    console.log("Chatbot initialized. DOM is ready.");

    const chatMessages = document.querySelector(".chat-messages");
    const chatEditor = document.getElementById("chatEditor");
    const sendBtn = document.querySelector(".send-btn");

    let flowStage = "idea";
    let ideaText = "";
    let feedbackText = "";
    let pitchExampleText = "";
    let imageData = "";

    /* ENTER KEY HANDLER */
    chatEditor.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            console.log("Enter pressed: triggering send action.");
            e.preventDefault();
            sendBtn.click();
        }
    });

    /* UI MESSAGE HELPERS */
    function addBotMessage(text) {
        console.log("Bot reply:", text);
        hideTyping();

        const msg = document.createElement("div");
        msg.className = "message bot";
        msg.innerHTML = `<div class="text">${text}</div>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addBotImage(base64) {
        console.log("Bot image received. Base64 length:", base64?.length);
        hideTyping();

        const msg = document.createElement("div");
        msg.className = "message bot";
        msg.innerHTML = `<img src="data:image/png;base64,${base64}" class="chat-image" />`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addUserMessage(text) {
        console.log("User message:", text);
        const msg = document.createElement("div");
        msg.className = "message user";
        msg.innerHTML = `<div class="text">${text}</div>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /* LOADING INDICATOR */
    function showTyping() {
        console.log("Showing typing indicator.");
        const bubble = document.createElement("div");
        bubble.className = "message bot typing";
        bubble.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTyping() {
        const bubble = chatMessages.querySelector(".message.bot.typing");
        if (bubble) {
            console.log("Removing typing indicator.");
            bubble.remove();
        }
    }

    /* ================================
       API HELPERS
    ================================= */

    async function requestPitch(text) {
        console.log("Calling /pitch with:", text);

        try {
            const res = await fetch("/pitch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: text })
            });

            const data = await res.json();
            console.log("/pitch response data:", data);
            return data;
        } catch (err) {
            console.error("Error during /pitch request:", err);
            addBotMessage("Error: unable to contact /pitch API.");
        }
    }

    async function requestImage(prompt) {
        console.log("Calling /image with:", prompt);

        try {
            const res = await fetch("/image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt })
            });

            const data = await res.json();
            console.log("/image response data:", data);
            return data;
        } catch (err) {
            console.error("Error during /image request:", err);
            addBotMessage("Error: unable to generate image.");
        }
    }

    async function requestFeedback(text) {
        console.log("Calling /feedback with:", text);

        try {
            const res = await fetch("/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });

            const data = await res.json();
            console.log("/feedback response data:", data);
            return data;
        } catch (err) {
            console.error("Error during /feedback request:", err);
            addBotMessage("Error: unable to generate stakeholder feedback.");
        }
    }

    async function requestRefine(idea, feedback) {
        console.log("Calling /refine with:", { idea, feedback });

        try {
            const res = await fetch("/refine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idea, feedback })
            });

            const data = await res.json();
            console.log("/refine response data:", data);
            return data;
        } catch (err) {
            console.error("Error during /refine request:", err);
            addBotMessage("Error: unable to refine design.");
        }
    }

    async function requestPitchExample(idea) {
        console.log("Calling /pitchExample with:", idea);
        try {
            const res = await fetch("/pitchExample", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idea })
            });
            const data = await res.json();
            return data;
        } catch (err) {
            console.error("Error during /pitchExample request:", err);
            addBotMessage("Error: unable to create pitch example.");
        }
    }

    /* ================================
       MAIN CHAT FLOW LOGIC
    ================================= */

    sendBtn.addEventListener("click", async () => {
        const userText = chatEditor.innerText.trim();

        if (!userText) {
            console.log("Send clicked but input is empty. Ignoring.");
            return;
        }

        console.log("Send clicked. Current flowStage =", flowStage);

        addUserMessage(userText);
        chatEditor.innerText = "";

        // restart logic
        if (flowStage === "done") {
            if (userText.toLowerCase().includes("restart")) {
                console.log("Restarting chat flow.");
                flowStage = "idea";
                ideaText = "";
                feedbackText = "";
                pitchExampleText = "";
                imageData = "";
                addBotMessage("🔄 New round started! Please describe your new AI product idea.");
                return;
            }
            return addBotMessage("Type 'restart' to start a new idea.");
        }

        /* -----------------------------
           IDEA → PITCH + IMAGE
        ----------------------------- */
        if (flowStage === "idea") {
            console.log("Flow: idea → extract components + auto image + pitch setup");
            ideaText = userText;

            showTyping();
            const pitchData = await requestPitch(userText);
            addBotMessage(`Main components:\n${pitchData.text}`);

            // auto-generate illustration (text-free)
            showTyping();
            const imgData = await requestImage(`Illustrate: ${pitchData.text}`);
            imageData = imgData.image;
            addBotImage(imageData);

            flowStage = "design";
            return addBotMessage("You can now describe design ideas or type 'pitch example' to generate a short pitch.");
        }

        /* -----------------------------
           DESIGN → PITCH EXAMPLE OR IMAGE
        ----------------------------- */
        if (flowStage === "design") {
            if (userText.toLowerCase().includes("pitch example")) {
                console.log("Generating automatic pitch example...");

                showTyping();
                const data = await requestPitchExample(ideaText);
                pitchExampleText = data.text;
                addBotMessage(pitchExampleText);

                flowStage = "refine";
                return addBotMessage("Would you like to refine or improve your product further?");
            } else {
                console.log("User adds design refinements.");
                showTyping();
                const imgData = await requestImage(`Design refinement: ${userText}`);
                imageData = imgData.image;
                addBotImage(imageData);
                return;
            }
        }

        /* -----------------------------
           FEEDBACK (optional legacy path)
        ----------------------------- */
        if (flowStage === "feedback") {
            console.log("Flow: feedback → stakeholder analysis");

            showTyping();
            const data = await requestFeedback(userText);
            feedbackText = data.text;
            addBotMessage(feedbackText);

            flowStage = "refine";
            return addBotMessage("Write 'refine' when you're ready to improve your product.");
        }

        /* -----------------------------
           REFINE → SUMMARY
        ----------------------------- */
        if (flowStage === "refine") {
            if (!userText.toLowerCase().includes("refine")) {
                console.log("User wrote something else; waiting for 'refine'.");
                return addBotMessage("Please write 'refine' when you're ready.");
            }

            console.log("Flow: refine → refinement");

            showTyping();
            const data = await requestRefine(ideaText, feedbackText);
            feedbackText = data.text;

            addBotMessage(feedbackText);

            console.log("Flow: refinement completed → showing summary");

            const summaryHTML = `
        <div class="summary-block">
            <h3>Final Concept Summary</h3>
            <p><strong>Idea:</strong><br>${ideaText}</p>
            ${imageData ? `<div><strong>Concept Image:</strong><br><img src="data:image/png;base64,${imageData}" class="chat-image" /></div>` : ""}
            ${pitchExampleText ? `<p><strong>Pitch Example:</strong><br>${pitchExampleText}</p>` : ""}
            ${feedbackText ? `<p><strong>Refined Version:</strong><br>${feedbackText}</p>` : ""}
        </div>
    `;

            const msg = document.createElement("div");
            msg.className = "message bot summary";
            msg.innerHTML = summaryHTML;
            chatMessages.appendChild(msg);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            addBotMessage("Here’s your complete concept summary. Type 'restart' to start again!");
            flowStage = "done";
            return;
        }

    });

    /* Initial message */
    addBotMessage("Welcome Please describe your AI product idea to begin.");

});
