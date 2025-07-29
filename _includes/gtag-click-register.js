<!-- =============================
5. _includes/gtag-click-register.js (JavaScript tracking)
============================= -->
<script>
  document.addEventListener("DOMContentLoaded", function() {
    const btn = document.querySelector(".register-btn");
    if (btn) {
      btn.addEventListener("click", () => {
        if (typeof gtag !== "undefined") {
          gtag("event", "click", {
            event_category: "Registration",
            event_label: btn.href
          });
        }
      });
    }
  });
</script>