;(function(git, $) {

  var marionettejs = new git.User("marionettejs");
  var starGazers = new git.Repository("backbone.marionette", marionettejs);

  starGazers.fetch(function(err, res) {
    if(err) { throw "No stars for you." }

    var count = document.querySelector('.github');
    var span = document.createElement('span');
    span.innerHTML = res.stargazers_count + " stargazers";
    count.appendChild(span);
  });

})(Gh3, jQuery);
