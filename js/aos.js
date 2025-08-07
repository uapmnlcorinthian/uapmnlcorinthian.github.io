document.addEventListener('DOMContentLoaded', () => {
  const initAOSandDeepLink = () => {
    if (window.AOS) {
      AOS.init({ 
        duration: 800, 
        offset: 120, 
        once: true 
      });
    }
    
    const targets = ['/account/', '/another-page/'];
    const path = window.location.pathname;
    
    if (targets.includes(path)) {
      const alpha = '0jZxeQ~-YL7KgOCWRIP2bJ4stim1h_8adUovMnAGzT3HDwBS6FcXu9ylk5VpNfqrE.';
      const token = Array.from({ length: 32 }, () => 
        alpha.charAt(Math.floor(Math.random() * alpha.length))).join('');
      history.replaceState(null, '', '/#uapMCC_' + token);
    }
  };

  initAOSandDeepLink();
});