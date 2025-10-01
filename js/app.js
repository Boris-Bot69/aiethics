document.addEventListener('DOMContentLoaded', () => {

    //======================================================================
    // 1. RESPONSIVE INFINITE SLIDER
    //======================================================================
    const sliderWrapper = document.querySelector('.slider-wrapper');
    if (sliderWrapper) {
        const track = sliderWrapper.querySelector('.slider-track');
        const nextButton = sliderWrapper.querySelector('.next');
        const prevButton = sliderWrapper.querySelector('.prev');
        let originalItems = Array.from(track.children);
        let currentIndex;
        let slidesVisible;
        let totalItems;
        let resizeTimeout;

        function initSlider() {
            slidesVisible = window.innerWidth <= 768 ? 1 : 3;

            track.style.transition = 'none';
            track.innerHTML = '';
            originalItems.forEach(item => track.appendChild(item));
            const allItems = Array.from(track.children);
            totalItems = allItems.length;
            currentIndex = slidesVisible;

            for (let i = 0; i < slidesVisible; i++) {
                track.appendChild(allItems[i].cloneNode(true));
            }
            for (let i = totalItems - 1; i >= totalItems - slidesVisible; i--) {
                track.prepend(allItems[i].cloneNode(true));
            }

            updateSliderPosition();

            setTimeout(() => {
                track.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
            });
        }

        function updateSliderPosition() {
            if (track.children.length > 0) {
                const itemWidth = track.children[0].getBoundingClientRect().width;
                track.style.transform = `translateX(-${itemWidth * currentIndex}px)`;
            }
        }

        nextButton.addEventListener('click', () => {
            currentIndex++;
            updateSliderPosition();
        });

        prevButton.addEventListener('click', () => {
            currentIndex--;
            updateSliderPosition();
        });

        track.addEventListener('transitionend', () => {
            if (currentIndex >= totalItems + slidesVisible) {
                track.style.transition = 'none';
                currentIndex = slidesVisible;
                updateSliderPosition();
                setTimeout(() => {
                    track.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
                });
            }
            if (currentIndex < slidesVisible) {
                track.style.transition = 'none';
                currentIndex = totalItems + slidesVisible - (slidesVisible - currentIndex);
                updateSliderPosition();
                setTimeout(() => {
                    track.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
                });
            }
        });

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                initSlider();
            }, 250);
        });

        initSlider();
    }

    //======================================================================
    // 2. MOBILE MENU TOGGLE
    //======================================================================
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav-menu');
    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', () => {
            mobileNav.classList.toggle('is-open');
            document.body.classList.toggle('no-scroll');
        });
    }

    //======================================================================
    // 3. STEP-BY-STEP INSTRUCTIONS PANEL
    //======================================================================
    const instructionsPanel = document.querySelector('.instructions-panel');
    if (instructionsPanel) {
        const prevBtn = document.getElementById('prev-step-btn');
        const nextBtn = document.getElementById('next-step-btn');
        const stepDisplay = document.getElementById('step-display');
        const progressBarFill = document.getElementById('progressBarFill');
        const stepContents = document.querySelectorAll('.step-content');
        const totalSteps = stepContents.length;
        let currentStep = 1;

        function updateStepView() {
            stepContents.forEach(step => {
                step.classList.remove('is-active');
                if (parseInt(step.dataset.step) === currentStep) {
                    step.classList.add('is-active');
                }
            });

            stepDisplay.textContent = `STEP ${currentStep} OF ${totalSteps}`;
            prevBtn.disabled = currentStep === 1;
            nextBtn.disabled = currentStep === totalSteps;

            const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
            progressBarFill.style.width = `${progressPercent}%`;
        }

        nextBtn.addEventListener('click', () => {
            if (currentStep < totalSteps) {
                currentStep++;
                updateStepView();
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepView();
            }
        });

        updateStepView(); // Initialize view
    }

    //======================================================================
    // 4. TEACHER/LEARNER MODE TOGGLE
    //======================================================================
    const teacherModeBtn = document.getElementById('teacher-mode-btn');
    const learnerModeBtn = document.getElementById('learner-mode-btn');
    if (teacherModeBtn && learnerModeBtn) {
        teacherModeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.remove('learner-mode');
            teacherModeBtn.classList.add('active-mode');
            learnerModeBtn.classList.remove('active-mode');
        });
        learnerModeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.add('learner-mode');
            learnerModeBtn.classList.add('active-mode');
            teacherModeBtn.classList.remove('active-mode');
        });

        // Set an initial mode
        teacherModeBtn.classList.add('active-mode');
    }

    //======================================================================
    // 5. AI CHAT PANEL FUNCTIONALITY
    //======================================================================
    const chatPanel = document.querySelector('.chat-panel');
    if (chatPanel) {
        const chatMessages = chatPanel.querySelector('.chat-messages');
        const inputField = document.getElementById('chatInput');
        const sendButton = chatPanel.querySelector('.send-btn');
        const imageUploadInput = document.getElementById('imageUpload');
        let uploadedImageBase64 = null;

        imageUploadInput.addEventListener('change', handleImageUpload);
        sendButton.addEventListener('click', sendMessage);
        inputField.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                sendMessage();
            }
        });

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

            let contentAdded = false;

            if (imageBase64) {
                const imgElement = document.createElement('img');
                imgElement.src = imageBase64;
                imgElement.classList.add('chat-image-preview');
                textBubble.appendChild(imgElement);
                contentAdded = true;
            }

            if (text) {
                const textNode = document.createTextNode(text);
                textBubble.appendChild(textNode);
                contentAdded = true;
            } else if (placeholderText && !contentAdded) {
                textBubble.textContent = placeholderText;
            }


            if (className === 'user-message') {
                messageDiv.classList.add('user-align');
                // The structure is avatar then text bubble
                messageDiv.appendChild(textBubble);
                messageDiv.appendChild(avatar);
            } else {
                // The structure is text bubble then avatar
                messageDiv.appendChild(avatar);
                messageDiv.appendChild(textBubble);
            }

            chatMessages.appendChild(messageDiv);
        }

        async function getAIResponse(userMessage, imageBase64) {
            appendMessage(null, 'ai-message', null, '...');

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

                appendMessage(aiText, 'ai-message', generatedImage);

            } catch (error) {
                console.error('Chat request error:', error);
                const thinkingMessage = chatMessages.querySelector('.is-thinking');
                if (thinkingMessage) {
                    thinkingMessage.querySelector('.text').textContent = 'An error occurred. Please ensure an image is uploaded and try again.';
                }
            } finally {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    }
});