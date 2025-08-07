// File: events.js
// Combines carousel initialization and events filtering

document.addEventListener('DOMContentLoaded', () => {
  // === Event Carousel ===
  const initEventCarousel = () => {
    const track = $('#event-scroller-track');
    if (!track) return;
    
    let paused = false;
    const speed = 1;
    
    function loop() {
      if (!paused) {
        track.scrollLeft += speed;
        if (track.scrollLeft >= track.scrollWidth - track.clientWidth) {
          track.scrollLeft = 0;
        }
      }
      requestAnimationFrame(loop);
    }
    
    loop();
    
    ['mouseenter', 'focus'].forEach(evt => 
      track.addEventListener(evt, () => paused = true));
    
    ['mouseleave', 'blur'].forEach(evt => 
      track.addEventListener(evt, () => paused = false));
    
    $$('.card', track).forEach((card, i) => {
      card.addEventListener('click', () => {
        const modal = document.getElementById('scrollerModal-' + i);
        bootstrap.Modal.getOrCreateInstance(modal).show();
      });
    });
  };
  initEventCarousel();

  // === Events Filtering & Infinite Scroll ===
  const items = document.querySelectorAll('.event-item');
  const preset = document.getElementById('filterPreset');
  const search = document.getElementById('searchInput');
  let visible = 12;

  function filter() {
    const now = new Date();
    const txt = search.value.toLowerCase();
    const type = preset.value;
    document.getElementById('filterLoader').style.display = 'block';
    
    setTimeout(() => {
      let count = 0;
      items.forEach(el => {
        const title = el.dataset.title.toLowerCase();
        const date  = new Date(el.dataset.date);
        let show = false;
        
        if (title.includes(txt)) {
          if (type === 'upcoming')       show = date >= now;
          else if (type === 'last30')    show = date >= new Date(now - 1000 * 60 * 60 * 24 * 30);
          else if (type === 'thisYear')  show = date >= new Date(now.getFullYear() + '-01-01');
          else                            show = true;
        }

        if (show && type === 'all') {
          if (count < visible) { el.style.display = 'block'; count++; }
          else                 { el.style.display = 'none'; }
        } else {
          el.style.display = show ? 'block' : 'none';
        }
      });
      document.getElementById('filterLoader').style.display = 'none';
    }, 200);
  }

  preset.addEventListener('change', () => { visible = 12; filter(); });
  search.addEventListener('input', filter);
  filter();

  const obsTarget = document.createElement('div');
  document.querySelector('#eventsSection .row').appendChild(obsTarget);
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && preset.value === 'all') {
      visible += 12;
      filter();
    }
  }, { rootMargin: '0px 0px 200px 0px' }).observe(obsTarget);

  // === Blur-Up Images ===
  document.querySelectorAll('.blur-up').forEach(img => {
    if (img.complete) img.classList.add('loaded');
    else img.onload = () => img.classList.add('loaded');
  });
});
