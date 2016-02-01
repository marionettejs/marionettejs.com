// Script used in updates section
// ---

;(function($, base64, showdown) {
  var MAX_LINES = 100;

  function shortenedText(text, maxLines) {
    // Divides a text in two parts, according to the maximum of lines allowed.
    if (!maxLines) {
      maxLines = MAX_LINES;
    }

    var firstPart = text.split('\n').splice(0, maxLines);
    var secondPart = text.split('\n').splice(maxLines);
    return [firstPart.join('\n'), secondPart.join('\n')];
  }

  function showMore() {
    $('.show-more').removeClass('hidden');
  }

  // Changelog endpoint
  var url = 'https://api.github.com/repos/marionettejs/backbone.marionette/contents/changelog.md';
  var data = {
    'client_id': '0ab3cd67b835df549748',
    'client_secret': '6a253f50df77585a5aff0a61046a7f4fac5ea134'
  };

  $.getJSON(url, data).done(function(result) {

    // Decode github response
    var changelog = base64.decode(result.content);
    var converter = new showdown.Converter();

    // If length of decoded text is longer than MAX_LINES
    // a 'show more' button is displayed and text is divided.
    if (changelog.split('\n').length > MAX_LINES) {
      var textParts = shortenedText(changelog, MAX_LINES);
      var changelogPartTwo = textParts[1];
      // Convert part two markup into html
      var changelogPartTwoHTML = converter.makeHtml(changelogPartTwo);
      $('.part-two').html(changelogPartTwoHTML);
      showMore(changelog);
      changelog = textParts[0];

    }

    // Convert markup into html
    var changelogHtml = converter.makeHtml(changelog);

    // Show html
    $('.changelog').html(changelogHtml);

    // Display code text in an elegant way.
    $('code').addClass('code-wrap notranslate');

  }).fail(function(err) {
    // Show ajax error.
    $('.changelog-error').removeClass('hidden');
  });

})(jQuery, base64, showdown);
