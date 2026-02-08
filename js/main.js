(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        setupNavigation();
        setupMobileMenu();
        setupSmoothScrolling();
        setupButtonHoverEffect();
        setupResponsiveBehavior();
        setupNavbarScrollBehavior();
    });

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

        mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('is-open');
                document.body.classList.remove('no-scroll');
            });
        });
    }

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

    function setupNavbarScrollBehavior() {
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
    }

    window.addEventListener('error', function(event) {
        console.error('JavaScript error:', event.error);
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
    });

})();

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
