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
    // app.js (UPDATED WITH NEW FEATURES)

        // This part of your file (slider, mobile menu, etc.) remains the same.
        // ...
        // ... paste all your existing code for slider, mobile menu, steps, etc. here ...
        // ...

        //======================================================================
        // 5. AI CHAT PANEL FUNCTIONALITY (UPDATED SECTION)
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

            // NEW: Function to check image validation
            function validateImage(file) {
                return new Promise((resolve, reject) => {
                    // Check 1: File Format (jpeg or png)
                    const allowedFormats = ['image/jpeg', 'image/png'];
                    if (!allowedFormats.includes(file.type)) {
                        reject("Invalid format. Please upload a JPEG or PNG image.");
                        return;
                    }

                    // Check 2: Dimensions
                    const allowedDimensions = [
                        "1024x1024", "1152x896", "1216x832", "1344x768", "1536x640",
                        "640x1536", "768x1344", "832x1216", "896x1152"
                    ];
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const image = new Image();
                        image.onload = function() {
                            const dimensions = `${this.width}x${this.height}`;
                            if (allowedDimensions.includes(dimensions)) {
                                resolve(e.target.result); // Validation passed, return base64
                            } else {
                                reject(`Invalid dimensions (${dimensions}). Please use one of the allowed sizes: ${allowedDimensions.join(', ')}.`);
                            }
                        };
                        image.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                });
            }

            // UPDATED: Guided interaction for sending messages
            function sendMessage() {
                const messageText = inputField.value.trim();

                // NEW: Check if user typed text without an image
                if (messageText && !uploadedImageBase64) {
                    appendMessage("Please upload an image first before sending a prompt.", 'ai-message');
                    inputField.value = '';
                    return;
                }

                // Allow sending if there is an image and text
                if (messageText && uploadedImageBase64) {
                    appendMessage(messageText, 'user-message');
                    getAIResponse(messageText, uploadedImageBase64);

                    // Clear inputs after sending
                    inputField.value = '';
                    uploadedImageBase64 = null;
                    if (imageUploadInput) imageUploadInput.value = '';
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }

            // UPDATED: Handle image upload with validation
            async function handleImageUpload(event) {
                const file = event.target.files[0];
                if (!file) return;

                try {
                    // NEW: Validate before processing
                    const base64Image = await validateImage(file);
                    uploadedImageBase64 = base64Image;
                    appendMessage('', 'user-message', uploadedImageBase64, 'Image accepted.');
                    // NEW: Guide user to add a prompt
                    appendMessage("Great! Now add a text prompt to describe the style you want.", 'ai-message');
                } catch (error) {
                    // NEW: Show validation error to user
                    appendMessage(error, 'ai-message');
                    uploadedImageBase64 = null;
                } finally {
                    if (imageUploadInput) imageUploadInput.value = '';
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }

            // UPDATED: appendMessage now handles downloads
            function appendMessage(text, className, imageBase64 = null, placeholderText = null, isDownloadable = false) {
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

                    if (isDownloadable) {
                        // NEW: Wrap generated image in a download link
                        const link = document.createElement('a');
                        link.href = imageBase64;
                        link.download = "generated-art.png";
                        link.appendChild(imgElement);
                        textBubble.appendChild(link);
                    } else {
                        textBubble.appendChild(imgElement);
                    }
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

            // UPDATED: getAIResponse now handles re-engagement
            async function getAIResponse(userMessage, imageBase64) {
                appendMessage('...', 'ai-message', null, '...');

                try {
                    const payload = {
                        message: userMessage,
                        image: imageBase64
                    };

                    const response = await fetch('/generate-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });

                    const thinkingMessage = chatMessages.querySelector('.is-thinking');
                    if (thinkingMessage) thinkingMessage.remove();

                    if (!response.ok) {
                        // Try to get a more specific error from the server's JSON response
                        const errorData = await response.json().catch(() => null);
                        const errorMessage = errorData?.error || `Request failed with status: ${response.status}`;
                        throw new Error(errorMessage);
                    }

                    const data = await response.json();
                    const aiText = data.aiMessage;
                    const generatedImage = data.generatedImage;

                    if (aiText) {
                        appendMessage(aiText, 'ai-message');
                    }

                    if (generatedImage) {
                        // UPDATED: The last argument 'true' makes the image downloadable
                        appendMessage('', 'ai-message', generatedImage, null, true);
                        // NEW: Re-engagement prompt
                        appendMessage("Would you like to try again with a different prompt?", 'ai-message');
                    }

                } catch (error) {
                    console.error('Chat request error:', error);
                    const thinkingMessage = chatMessages.querySelector('.is-thinking');
                    if (thinkingMessage) {
                        thinkingMessage.querySelector('.text').textContent = `Sorry, something went wrong: ${error.message}`;
                    } else {
                        appendMessage(`Sorry, something went wrong: ${error.message}`, 'ai-message');
                    }
                } finally {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
        }
    });