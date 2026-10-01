document.addEventListener('DOMContentLoaded', () => {
    // Add simple active link highlighting or mobile menu toggles if needed
    console.log('Med_Assist JS loaded successfully.');
    
    // Auto-hide alert messages after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s ease';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });
});
