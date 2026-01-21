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
        setupMobileMenu();
        setupSmoothScrolling();
        setupButtonHoverEffect();
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

    function setupMobileMenu() {
        const menuButton = document.querySelector('.menu-toggle');
        const mobileMenu = document.querySelector('.mobile-nav-menu');
        if (!menuButton || !mobileMenu) return;

        menuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('is-open');
            document.body.classList.toggle('no-scroll');
        });

        // 🔸 Close when clicking any link
        mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('is-open');
                document.body.classList.remove('no-scroll');
            });
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

                    history.pushState(null, null, href);
                    targetElement.focus();
                }
            });
        });
    }

    // Accessibility Enhancements
    function setupAccessibility() {
        setupKeyboardNavigation();
        setupFocusManagement();
    }

    function setupFocusManagement() {
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Tab') return;
        });
    }

    function setupKeyboardNavigation() {
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                console.log('Escape key pressed');
            }
        });
    }

    // Responsive behavior
    function setupResponsiveBehavior() {
        window.addEventListener('resize', handleResize);
        handleResize();
    }

    function handleResize() {
        const width = window.innerWidth;
        const mobileMenu = document.querySelector('.mobile-nav-menu');
        if (width > 960 && mobileMenu && mobileMenu.classList.contains('is-open')) {
            mobileMenu.classList.remove('is-open');
            document.body.classList.remove('no-scroll');
        }
    }

    // Utility Functions
    const utils = {
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
        isInViewport: function(element) {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
        },
        scrollToElement: function(element, offset = 0) {
            const headerHeight = document.querySelector('.navbar')?.offsetHeight || 0;
            const targetPosition = element.offsetTop - headerHeight - offset;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    };

    window.utils = utils;

    window.addEventListener('error', function(event) {
        console.error('JavaScript error:', event.error);
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
    });

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

// --- Safe scroll hide/show logic ---
document.addEventListener('DOMContentLoaded', () => {
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop === 0) {
            navbar.classList.remove('navbar--hidden');
        } else if (scrollTop > lastScrollTop && scrollTop > navbar.offsetHeight) {
            navbar.classList.add('navbar--hidden');
        }

        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    });
});

// --- Button hover effect ---
function setupButtonHoverEffect() {
    const imageButtons = document.querySelectorAll('.btn img[data-hover-src], .custom-button img[data-hover-src]');
    imageButtons.forEach(img => {
        const originalSrc = img.src;
        const hoverSrc = img.dataset.hoverSrc;
        const parentLink = img.parentElement;

        const hoverImage = new Image();
        hoverImage.src = hoverSrc;

        parentLink.addEventListener('mouseenter', () => (img.src = hoverSrc));
        parentLink.addEventListener('mouseleave', () => (img.src = originalSrc));
    });
}
