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
        const progressBarFill = document.getElementById('progressBarFill');

        stepDisplay.textContent = `STEP ${currentStep} OF ${totalSteps}`;
        allSteps.forEach(step => {
            step.classList.toggle('is-active', parseInt(step.dataset.step) === currentStep);
        });
        prevButton.disabled = (currentStep === 1);
        nextButton.disabled = (currentStep === totalSteps);


        const progressPercent = ((currentStep) / (totalSteps)) * 100;

        progressBarFill.style.width = `${progressPercent}%`;
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
    setupModeSwitcher();



});


function setupModeSwitcher() {
    const teacherBtn = document.getElementById('teacher-mode-btn');
    const learnerBtn = document.getElementById('learner-mode-btn');
    const body = document.body;

    if (teacherBtn && learnerBtn) {
        // Set the initial active state
        teacherBtn.classList.add('active-mode');

        teacherBtn.addEventListener('click', (event) => {
            event.preventDefault();
            body.classList.remove('learner-mode');

            // Add/remove active classes
            teacherBtn.classList.add('active-mode');
            learnerBtn.classList.remove('active-mode');
        });

        learnerBtn.addEventListener('click', (event) => {
            event.preventDefault();
            body.classList.add('learner-mode');

            // Add/remove active classes
            learnerBtn.classList.add('active-mode');
            teacherBtn.classList.remove('active-mode');
        });
    }
}

const swiper = new Swiper('.swiper', {
    // How many slides to show at once
    slidesPerView: 1,

    // Space between slides
    spaceBetween: 30,

    // Responsive breakpoints
    breakpoints: {
        // when window width is >= 640px
        640: {
            slidesPerView: 2,
            spaceBetween: 20
        },
        // when window width is >= 960px (your mobile breakpoint)
        960: {
            slidesPerView: 3,
            spaceBetween: 30
        }
    },

    // Optional: Enable navigation arrows
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },

    // Optional: Enable pagination dots
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
    },
});