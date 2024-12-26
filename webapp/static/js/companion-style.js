(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const userAgent = navigator.userAgent.toLowerCase();

        // Check for possible variations of "Home Assistant"
        if (userAgent.includes('homeassistant') || userAgent.includes('home assistant')) {
            document.body.classList.add('companion-app');
        }
    });
})();
