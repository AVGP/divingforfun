// Mobile navigation menu toggle
const navToggle = document.getElementById('nav-toggle-btn');
const navMenu = document.getElementById('nav-menu-container');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', !isExpanded);
    navToggle.classList.toggle('open');
    navMenu.classList.toggle('open');
  });
}

// Fallback for browsers that don't support CSS scroll-driven animations
if (!CSS.supports('(animation-timeline: scroll()) and (animation-range: 0% 100%)')) {
  const header = document.getElementById('main-header');
  
  if (header) {
    const initialHeight = 90;   // var(--header-height-large)
    const finalHeight = 65;     // var(--header-height-small)
    const scrollDistance = 100;  // scroll range in px

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const scrollPercent = Math.min(1, scrollY / scrollDistance);
      const newHeight = initialHeight - (initialHeight - finalHeight) * scrollPercent;
      
      header.style.height = `${newHeight}px`;
      
      if (scrollY > 0) {
        header.style.background = `rgba(2, 6, 23, ${0.7 + (0.25 * scrollPercent)})`;
        header.style.boxShadow = `0 4px 20px rgba(0, 0, 0, ${0.3 * scrollPercent})`;
      } else {
        header.style.background = 'rgba(2, 6, 23, 0.7)';
        header.style.boxShadow = 'none';
      }
    }, { passive: true });
  }
}
