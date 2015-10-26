;(function($) {
  var url = 'https://api.github.com/repos/marionettejs/backbone.marionette?callback=?';

  $.getJSON(url)
  .done(function(result) {
    if (result.meta.status === 200) {
      //jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      /*jshint camelcase: false */
      var stargazers = result.data.stargazers_count || '5700';
      $('.stargazers-js').text(stargazers);
    }
  });
})(jQuery);

(function($) {
  var url = 'https://api.github.com/orgs/marionettejs/members';

  //jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  /*jshint camelcase: false */
  $.getJSON(url, {
    client_id: '0ab3cd67b835df549748',
    client_secret: '6a253f50df77585a5aff0a61046a7f4fac5ea134'
  })
  .done(function(members) {
    //jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    /*jshint camelcase: false */
    var i;
    var memberCount = members.length;
    var memberListEl = $('.member-list');

    for (i = 0; i < memberCount; i++) {
      var member = members[i];
      var listItemEl = $(document.createElement('li'));
      var memberEl = $(document.createElement('a'));

      listItemEl.addClass('col-4');

      memberEl
        .addClass('team-member')
        .attr('href', member.html_url)
        .attr('data-username', member.login)
        .css('background-image', 'url(' + member.avatar_url + '&s=256)');

      listItemEl.append(memberEl);
      memberListEl.append(listItemEl);
    }
  });
})(jQuery);
