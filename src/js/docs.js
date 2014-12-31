;(function() {
  function setListeners() {
    document.getElementById('version-dropdown').onchange = function() {
      window.location = "/docs/" + this.value;
    }
  }

  setListeners();
})();
