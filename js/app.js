// Wait for the page to fully load before running the script
document.addEventListener('DOMContentLoaded', () => {

    const chatMessages = document.querySelector('.chat-messages');
    const inputField = document.querySelector('.chat-input-bar input[type="text"]');
    const sendButton = document.querySelector('.send-btn');

    function sendMessage() {
        const messageText = inputField.value.trim();

        if (messageText === '') {
            return;
        }

        appendMessage(messageText, 'user-message');
        inputField.value = '';
        getAIResponse(messageText);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to create a new message bubble and add it to the chat
    function appendMessage(text, className, isThinking = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;

        if (isThinking) {
            messageDiv.classList.add('is-thinking');
        }

        const avatar = document.createElement('div');
        avatar.className = 'avatar';

        const textBubble = document.createElement('div');
        textBubble.className = 'text';
        textBubble.textContent = text;

        if (className === 'user-message') {
            messageDiv.classList.add('user-align');
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(textBubble);
        chatMessages.appendChild(messageDiv);
    }

    async function getAIResponse(userMessage) {
        const chatMessages = document.querySelector('.chat-messages');

        // Show a "thinking..." message
        appendMessage('...', 'ai-message', true);

        try {
            // Send the user's message to your backend server
            const response = await fetch('/ask-gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(`Request failed: ${response.status} ${response.statusText} ${text}`);
            }

            const data = await response.json();
            const aiText = data.aiMessage;

            // Remove the "thinking..." message and add the real one
            const thinkingMessage = chatMessages.querySelector('.is-thinking');
            if (thinkingMessage) {
                thinkingMessage.remove();
            }
            appendMessage(aiText, 'ai-message');

        } catch (error) {
            console.error('Chat request error:', error);
            const thinkingMessage = chatMessages.querySelector('.is-thinking');
            if (thinkingMessage) {
                thinkingMessage.querySelector('.text').textContent = 'Sorry, I ran into an error. Open console for details.';
                thinkingMessage.classList.remove('is-thinking');
            }
        } finally {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    sendButton.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

});