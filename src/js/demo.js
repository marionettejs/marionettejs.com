window.onload = function() {

  var Application = Marionette.Application.extend({
    regions: {
      'cards': '#cards'
    },

    initialize: function(data) {
      this.showCards();
    },

    showCards: function() {
      this.getRegion('cards').show(new CardsView({
       collection: new UserCollection()
      }));
    }
  });

  var CardView = Marionette.ItemView.extend({
    template: _.template('<github-card user="<%= user %>"></github-card>'),

    className: 'card'
  });

  var CardsView = Marionette.CollectionView.extend({
    childView: CardView,

    initialize: function() {
      this.collection.fetch();
    }
  });

  var UserCollection = Backbone.Collection.extend({
    url: 'https://api.github.com/repos/marionettejs/backbone.marionette/commits?client_id=dac2492f68933ee643b8&client_secret=5e9ba7d6c4553008d17912eba0b4a0aee0009b41',

    parse: function(data) {
      return _.chain(data)
        .map(function(commit) {
          var author = commit.author;
          if (!author) return;

          var login = author.login;
          if (!login) return;

          return {user: login};
        })
        .unique()
        .filter(function(commit) {return !!commit; })
        .first(5)
        .value();
    }
  })

  app = new Application();
};