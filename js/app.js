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
// 5. AI CHAT PANEL FUNCTIONALITY (FINAL AUTOMATIC SAVE VERSION)
//======================================================================
    const chatPanel = document.querySelector('.chat-panel');
    if (chatPanel) {
        const chatMessages = chatPanel.querySelector('.chat-messages');
        const inputField = document.getElementById('chatInput');
        const sendButton = chatPanel.querySelector('.send-btn');
        const imageUploadInput = document.getElementById('imageUpload');

        // --- State Management ---
        let homageCount = 0;
        const MAX_HOMAGES = 3;
        let generatedHomages = [];
        let promptHistory = [];

        imageUploadInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                appendMessage('', 'user-message', e.target.result);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            };
            reader.readAsDataURL(file);
        });

        sendButton.addEventListener('click', sendMessage);
        inputField.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') sendMessage();
        });

        function sendMessage() {
            if (homageCount >= MAX_HOMAGES) return;

            const messageText = inputField.value.trim();
            if (messageText) {
                appendMessage(messageText, 'user-message');
                // For this workflow, the history is just the single prompt
                promptHistory = [messageText];
                getAIResponse(promptHistory);

                inputField.value = '';
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
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
            if (imageBase64) {
                const imgElement = document.createElement('img');
                imgElement.src = imageBase64;
                imgElement.classList.add('chat-image-preview');
                textBubble.appendChild(imgElement);
            }
            if (text) {
                textBubble.appendChild(document.createTextNode(text));
            } else if (placeholderText) {
                textBubble.textContent = placeholderText;
            }
            if (className === 'user-message') {
                messageDiv.classList.add('user-align');
                messageDiv.appendChild(textBubble);
                messageDiv.appendChild(avatar);
            } else {
                messageDiv.appendChild(avatar);
                messageDiv.appendChild(textBubble);
            }
            chatMessages.appendChild(messageDiv);
        }

        function displayFinalSummary() {
            appendMessage("Great work! You have completed the three homages. Here is a summary of your creations:", 'ai-message');
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'message ai-message';
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            const textBubble = document.createElement('div');
            textBubble.className = 'text summary-bubble';
            generatedHomages.forEach((imgData, index) => {
                const summaryItem = document.createElement('div');
                summaryItem.className = 'summary-item';
                const summaryImg = document.createElement('img');
                summaryImg.src = imgData;
                summaryImg.classList.add('chat-image-preview');
                const summaryLabel = document.createElement('p');
                summaryLabel.textContent = `Homage ${index + 1}`;
                summaryItem.appendChild(summaryImg);
                summaryItem.appendChild(summaryLabel);
                textBubble.appendChild(summaryItem);
            });
            summaryDiv.appendChild(avatar);
            summaryDiv.appendChild(textBubble);
            chatMessages.appendChild(summaryDiv);
            promptHistory = [];
            inputField.placeholder = "Activity complete!";
            inputField.disabled = true;
            sendButton.disabled = true;
        }

        async function getAIResponse(prompts) {
            appendMessage('', 'ai-message', null, '...');

            try {
                const payload = { prompts: prompts };
                const response = await fetch('/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const thinkingMessage = chatMessages.querySelector('.is-thinking');
                if (thinkingMessage) thinkingMessage.remove();

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "An unknown server error occurred." }));
                    throw new Error(errorData.error);
                }

                const data = await response.json();
                const generatedImage = data.generatedImage;

                if (generatedImage) {
                    // Automatically count and save each result
                    homageCount++;
                    generatedHomages.push(generatedImage);

                    // Display the generated image
                    appendMessage('', 'ai-message', generatedImage);

                    // Check the state and guide the user
                    if (homageCount < MAX_HOMAGES) {
                        const followupText = `Homage ${homageCount} of ${MAX_HOMAGES} created. You can now start the next one by typing a new prompt.`;
                        appendMessage(followupText, 'ai-message');
                    } else {
                        displayFinalSummary();
                    }
                }
            } catch (error) {
                console.error('Chat request error:', error);
                appendMessage(`Sorry, something went wrong: ${error.message}`, 'ai-message');
            } finally {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    }

});