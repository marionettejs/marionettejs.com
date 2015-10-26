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
  //jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  /*jshint camelcase: false */
  var ETag = localStorage.getItem('github:team:ETag');
  var requestData = {
    client_id: '0ab3cd67b835df549748',
    client_secret: '6a253f50df77585a5aff0a61046a7f4fac5ea134',
    url: 'https://api.github.com/orgs/marionettejs/members'
  };

  if (ETag) {
    requestData.beforeSend = function(xhr) {
      xhr.setRequestHeader('If-None-Match', ETag);
    };
  }

  $.ajax(requestData)
  .done(function(response, status, xhr) {
    var data;

    if (xhr.status === 304) {
      data = JSON.parse(localStorage.getItem('github:team'));
    } else {
      data = response;
      localStorage.setItem('github:team', JSON.stringify(data));
      localStorage.setItem('github:team:ETag', xhr.getResponseHeader('ETag'));
    }

    var i;
    var memberCount = data.length;
    var memberListEl = $('.member-list');

    for (i = 0; i < memberCount; i++) {
      var member = data[i];
      var listItemEl = $(document.createElement('li'));
      var memberEl = $(document.createElement('a'));

      listItemEl.addClass('col-4');

      memberEl
        .addClass('team-member')
        .attr('href', member.html_url)
        .attr('data-username', member.login)
        .css('background-image', 'url(' + member.avatar_url + '&s=250)');

      listItemEl.append(memberEl);
      memberListEl.append(listItemEl);
    }
  });
})(jQuery);
