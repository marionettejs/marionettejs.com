;(function($) {
  var url = 'https://api.github.com/repos/marionettejs/backbone.marionette?callback=?';
  $.getJSON(url)
  .done(function (result) {
    if(result.meta.status === 200) {
      var stargazers = result.data.stargazers_count || '5700';
      $('.stargazers-js').text(stargazers);
    }
  });
})(jQuery);
