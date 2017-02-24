;(function($) {
  var chat;
  var $openChatBtn = $('.open-gitter-chat');
  var scriptLoaded = (window.gitter) ? true : false;
  var scriptSrc = '//sidecar.gitter.im/dist/sidecar.v1.js';

  function loadScript(callback) {
    //disable initializing default chat
    ((window.gitter = {}).chat = {}).options = {
      disableDefaultChat: true
    };

    $.getScript(scriptSrc, function() {
      scriptLoaded = true;
      callback();
    });
  }

  function initChat() {
    chat = new window.gitter.Chat({
      room: 'marionettejs/backbone.marionette',
      activationElement: ''
    });
  }

  function toggleChat(bool) {
    if (chat === undefined) {
      initChat();
    }

    chat.toggleChat(bool);
  }

  function toggleOpenChatBtn(bool) {
    $openChatBtn
      .attr('disabled', bool)
      .toggleClass('btn-disabled', bool);
  }

  function setListeners() {
    $('.gitter-chat-embed').on('gitter-chat-toggle', function(event) {
      toggleOpenChatBtn(event.originalEvent.detail.state);
    });
  }

  function openChat(event) {
    event.preventDefault();
    toggleOpenChatBtn(true);

    if (scriptLoaded) {
      toggleChat(true);
    } else {
      loadScript(function() {
        toggleChat(true);
        setListeners();
      });
    }
  }

  $openChatBtn.click(openChat);
})(jQuery);
