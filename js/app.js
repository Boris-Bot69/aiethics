document.addEventListener('DOMContentLoaded', () => {

    const chatMessages = document.querySelector('.chat-messages');
    const inputField = document.getElementById('chatInput');
    const sendButton = document.querySelector('.send-btn');
    const imageUploadInput = document.getElementById('imageUpload');

    let uploadedImageBase64 = null;

    imageUploadInput.addEventListener('change', handleImageUpload);

    function sendMessage() {
        const messageText = inputField.value.trim();
        const imageToSend = uploadedImageBase64;

        if (messageText === '' && !imageToSend) {
            return;
        }

        appendMessage(messageText, 'user-message', imageToSend);

        // Clear inputs after sending
        inputField.value = '';
        uploadedImageBase64 = null;
        if (imageUploadInput) imageUploadInput.value = '';

        getAIResponse(messageText, imageToSend);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageBase64 = e.target.result;
            appendMessage('', 'user-message', uploadedImageBase64, 'Image uploaded. Add a prompt or send.');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        };
        reader.readAsDataURL(file);
    }

    function appendMessage(text, className, imageBase64 = null, placeholderText = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${className}`;

        if (className === 'ai-message' && placeholderText) {
            messageDiv.classList.add('is-thinking');
        }

        const avatar = document.createElement('div');
        avatar.className = 'avatar';

        const textBubble = document.createElement('div');
        textBubble.className = 'text';

        if (text) {
            textBubble.textContent = text;
        } else if (placeholderText) {
            textBubble.textContent = placeholderText;
        }

        if (imageBase64) {
            const imgElement = document.createElement('img');
            imgElement.src = imageBase64;
            imgElement.classList.add('chat-image-preview');
            textBubble.appendChild(imgElement);
        }

        if (className === 'user-message') {
            messageDiv.classList.add('user-align');
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(textBubble);
        chatMessages.appendChild(messageDiv);
    }

    async function getAIResponse(userMessage, imageBase64) {
        appendMessage('...', 'ai-message', null, '...');

        try {
            const payload = {
                message: userMessage,
                image: imageBase64
            };

            const response = await fetch('/ask-gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }

            const data = await response.json();
            const aiText = data.aiMessage;
            const generatedImage = data.generatedImage;

            const thinkingMessage = chatMessages.querySelector('.is-thinking');
            if (thinkingMessage) thinkingMessage.remove();

            appendMessage(aiText, 'ai-message');

            if (generatedImage) {
                appendMessage('', 'ai-message', generatedImage);
            }

        } catch (error) {
            console.error('Chat request error:', error);
            const thinkingMessage = chatMessages.querySelector('.is-thinking');
            if (thinkingMessage) {
                thinkingMessage.querySelector('.text').textContent = 'Please upload an image.';
            }
        } finally {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    sendButton.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
});


document.addEventListener('DOMContentLoaded', () => {

    // --- Step Counter Logic ---
    const totalSteps = 6;
    let currentStep = 1;

    // Get the elements
    const prevButton = document.getElementById('prev-step-btn');
    const nextButton = document.getElementById('next-step-btn');
    const stepDisplay = document.getElementById('step-display');
    const allSteps = document.querySelectorAll('.step-content');

    // Function to update the display based on the current step
    function updateStepDisplay() {
        // Update the "STEP X OF 7" text
        stepDisplay.textContent = `STEP ${currentStep} OF ${totalSteps}`;

        // Show the correct content
        allSteps.forEach(step => {
            if (parseInt(step.dataset.step) === currentStep) {
                step.classList.add('is-active');
            } else {
                step.classList.remove('is-active');
            }
        });

        // Disable/enable buttons at the start and end
        prevButton.disabled = (currentStep === 1);
        nextButton.disabled = (currentStep === totalSteps);
    }

    // Event listeners for the buttons
    nextButton.addEventListener('click', () => {
        if (currentStep < totalSteps) {
            currentStep++;
            updateStepDisplay();
        }
    });

    prevButton.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateStepDisplay();
        }
    });

    // Initialize the first step on page load
    updateStepDisplay();


});