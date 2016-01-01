// jshint maxstatements:20
$(function() {
  var $toggleCheckbox = $('#toggle-search');
  var $searchInput = $('#search-input');

  // Expand search
  // Toggle & focus the search bar when clicking on the magnifying glass.
  // This is achieved through a label and corresponding checkbox.
  $('.toggle-search-open').click(function(e) {
    e.preventDefault();
    $('.nav-slider__list').addClass('hidden');
    $('.searchbar').removeClass('hidden');
    $('header').addClass('search-expanded');
    $toggleCheckbox.click();
    $searchInput.focus();

    // For mobile
    if ($(window).width() <= 768) {
      $(this).addClass('hidden');
      $('.menu-icon').addClass('hidden');
    }
  });

  function closeSearchBar() {
    $searchInput.val('');
    $('.nav-slider__list').removeClass('hidden');
    $('.searchbar').addClass('hidden');
    $toggleCheckbox.prop('checked', false);
    $('header').removeClass('search-expanded');

    // For mobile
    if ($(window).width() <= 768) {
      $('.toggle-search-open').removeClass('hidden');
      $('.menu-icon').removeClass('hidden');
    }
  }
  // Collapse search
  $('.toggle-search-close').click(function() {
    closeSearchBar();
  });

  // Hide the search when pressing Escape
  $(document).on('keydown', function(event) {
    if (event.keyCode !== 27) {
      return;
    }

    closeSearchBar();
  });
});
