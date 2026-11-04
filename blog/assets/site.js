// "Privacy & cookie settings" link in the footer.
// Re-opens Google's consent message (AdSense > Privacy & messaging) so visitors can change their choice.
document.querySelectorAll("[data-consent-settings]").forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push(function () {
      if (window.googlefc.showRevocationMessage) window.googlefc.showRevocationMessage();
    });
  });
});
