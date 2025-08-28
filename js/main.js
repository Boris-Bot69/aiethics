// Main JavaScript file for AI Ethics Literacy Webpage
// Handles navigation and interactive features

(function() {
    'use strict';

    // DOM Content Loaded Event
    document.addEventListener('DOMContentLoaded', function() {
        initializeApp();
    });

    // Initialize the application
    function initializeApp() {
        setupNavigation();
        setupSmoothScrolling();
        setupAccessibility();
        setupResponsiveBehavior();
    }

    // Navigation setup
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Smooth Scrolling for Anchor Links
    function setupSmoothScrolling() {
        const anchorLinks = document.querySelectorAll('a[href^="#"]');

        anchorLinks.forEach(link => {
            link.addEventListener('click', function(event) {
                const href = this.getAttribute('href');

                if (href === '#') return;

                const targetElement = document.querySelector(href);

                if (targetElement) {
                    event.preventDefault();

                    const headerHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Update URL without page jump
                    history.pushState(null, null, href);

                    // Focus on target element for accessibility
                    targetElement.focus();
                }
            });
        });
    }

    // Accessibility Enhancements
    function setupAccessibility() {
        // Skip to main content link
        createSkipLink();

        // Keyboard navigation
        setupKeyboardNavigation();

        // Focus management
        setupFocusManagement();
    }

    // Create skip to main content link

    // Focus management
    function setupFocusManagement() {
        // Ensure proper focus order
        const focusableElements = document.querySelectorAll(
            'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );

        // Handle tab navigation
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Tab') {
                // Allow normal tab behavior
                return;
            }
        });
    }

    // Keyboard navigation
    function setupKeyboardNavigation() {
        // Escape key functionality
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                // Close any open modals or dropdowns here if needed
                console.log('Escape key pressed');
            }
        });
    }

    // Responsive behavior
    function setupResponsiveBehavior() {
        // Handle window resize
        window.addEventListener('resize', function() {
            handleResize();
        });

        // Initial call
        handleResize();
    }

    // Handle resize events
    function handleResize() {
        const width = window.innerWidth;
        const navbar = document.querySelector('.navbar');
        const navLinks = document.querySelector('.nav-links');

        if (width <= 768) {
            // Mobile behavior
            if (navbar && navLinks) {
                // Adjust navigation for mobile if needed
                console.log('Mobile view activated');
            }
        } else {
            // Desktop behavior
            console.log('Desktop view activated');
        }
    }

    // Utility Functions
    const utils = {
        // Debounce function
        debounce: function(func, wait, immediate) {
            let timeout;
            return function executedFunction() {
                const context = this;
                const args = arguments;
                const later = function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        },

        // Throttle function
        throttle: function(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Check if element is in viewport
        isInViewport: function(element) {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        },

        // Smooth scroll to element
        scrollToElement: function(element, offset = 0) {
            const headerHeight = document.querySelector('.navbar')?.offsetHeight || 0;
            const targetPosition = element.offsetTop - headerHeight - offset;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    };

    // Expose utils globally if needed
    window.utils = utils;

    // Error handling
    window.addEventListener('error', function(event) {
        console.error('JavaScript error:', event.error);
        // You can add error reporting here
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        // You can add error reporting here
    });

    // Performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', function() {
            setTimeout(function() {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData) {
                    console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
                }
            }, 0);
        });
    }

})();

let lastScrollTop = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', function() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Check if scrolling down and past the navbar height
    if (scrollTop > lastScrollTop && scrollTop > navbar.offsetHeight) {
        // Scrolling Down
        navbar.classList.add('navbar--hidden');
    } else {
        // Scrolling Up
        navbar.classList.remove('navbar--hidden');
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
});