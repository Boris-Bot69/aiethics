document.addEventListener("DOMContentLoaded", () => {

    console.log("Chatbot initialized. DOM is ready.");

    const chatMessages = document.querySelector(".chat-messages");
    const chatEditor = document.getElementById("chatEditor");
    const sendBtn = document.querySelector(".send-btn");

    let flowStage = "idea";
    let ideaText = "";
    let feedbackText = "";

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
       API HELPERS WITH FULL DEBUG LOGS
    ================================= */

    async function requestPitch(text) {
        console.log("Calling /pitch with:", text);

        try {
            const res = await fetch("/pitch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: text })
            });

            console.log("/pitch response status:", res.status);
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

            console.log("/image response status:", res.status);
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

            console.log("/feedback response status:", res.status);
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

            console.log("/refine response status:", res.status);
            const data = await res.json();
            console.log("/refine response data:", data);

            return data;
        } catch (err) {
            console.error("Error during /refine request:", err);
            addBotMessage("Error: unable to refine design.");
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

        if (flowStage === "done") {
            if (userText.toLowerCase().includes("restart")) {
                console.log("Restarting chat flow.");
                flowStage = "idea";
                addBotMessage("New round. Please describe your AI product idea.");
                return;
            }
            return addBotMessage("Write 'restart' to begin again.");
        }

        if (flowStage === "idea") {
            console.log("Flow: idea → pitch");
            ideaText = userText;

            showTyping();
            const data = await requestPitch(userText);

            addBotMessage(data.text);
            flowStage = "image";
            return addBotMessage("Now describe what your AI product looks like.");
        }

        if (flowStage === "image") {
            console.log("Flow: image → image-generation");

            showTyping();
            const data = await requestImage(userText);

            addBotImage(data.image);
            flowStage = "feedback";
            return addBotMessage("Now send me your pitch text. I will analyze it ethically.");
        }

        if (flowStage === "feedback") {
            console.log("Flow: feedback → stakeholder analysis");

            showTyping();
            const data = await requestFeedback(userText);

            feedbackText = data.text;
            addBotMessage(data.text);

            flowStage = "refine";
            return addBotMessage("Write 'refine' when you're ready to improve your product.");
        }

        if (flowStage === "refine") {
            if (!userText.toLowerCase().includes("refine")) {
                console.log("User wrote something else; waiting for 'refine'.");
                return addBotMessage("Please write 'refine' when you're ready.");
            }

            console.log("Flow: refine → refinement");

            showTyping();
            const data = await requestRefine(ideaText, feedbackText);

            addBotMessage(data.text);
            flowStage = "done";

            return addBotMessage("Process completed. Write 'restart' to begin again.");
        }
    });

    /* Initial message */
    addBotMessage("Welcome. Please describe your AI product idea to begin.");

});
