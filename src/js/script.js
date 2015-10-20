// jshint maxstatements:20
$(document).ready(function() {
  // Logo animation
  $('.primary-logo').mouseenter(function() {
    /* global snabbt */
    snabbt(this, 'attention', {
      rotation: [0, 0, Math.PI / 2],
      springConstant: 1.9,
      springDeacceleration: 0.9
    });
  });

  // CSS3 Slider - Videos Section
  // ---

  (function() {
    var $slideshowWrap = $('.video_slideshow_scroller');
    var $slideshowPrev = $slideshowWrap.children('.prev');
    var $slideshowNext = $slideshowWrap.children('.next');
    var $slider = $slideshowWrap.children('.video_slideshow');
    var $slide = $slider.children().first();
    var slideCount = $slider.children().length;
    var pos = 0;
    // see #302
    if (!$slideshowWrap.length) {
      return;
    }

    function setTransform() {
      var distance = (-pos * ($slide.width() +
        parseInt($slide.css('margin-right').replace(/px/g, ''), 10)));
      $slider.css('transform', 'translate3d(' + distance + 'px,0,0)');
      $slideshowPrev[pos ? 'show' : 'hide']();
      $slideshowNext[pos !== slideCount - 1 ? 'show' : 'hide']();
    }

    function addClickEffects(button) {
      var $span = $(button).children('span');
      $span.addClass('cbutton--click');
      setTimeout(function() {
        $span.removeClass('cbutton--click');
      }, 500);
    }

    function slideshowPrev(event) {
      event.preventDefault();
      pos = (pos === 0) ? pos : pos - 1;
      setTransform();
      addClickEffects(this);
    }

    function slideshowNext(event) {
      event.preventDefault();
      pos = (pos === slideCount - 1) ? pos : pos + 1;
      setTransform();
      addClickEffects(this);
    }

    $(window).on('resize', _.throttle(setTransform, 300));
    $slideshowNext.on('click', slideshowNext);
    $slideshowPrev.on('click', slideshowPrev);
  })();

  // --- /

  // equalHeights
  var $codeSample = $('.equal-heights-js');
  if ($(window).width() > 705) {
    $codeSample.equalHeights();
  }
  $(window).resize(function() {
    if ($(window).width() > 705) {
      $codeSample.css('height', 'auto');
      $codeSample.equalHeights();
    } else {
      $codeSample.css('height', 'auto');
    }
  });

  // Google Prettify syntax highlighting
  /* global prettyPrint*/
  prettyPrint();

  // Unveil.js (lazy loader for company logos)
  $('.company-logo-list img').unveil();

  // Toggle company logos
  $('.show-more').on('click', function(e) {
    var $this = $(this);

    e.preventDefault();
    $this.toggleClass('active');
    $('.slider').toggleClass('closed');

    var txt = $this.text() === 'more' ? 'less' : 'more';
    $this.text(txt);
  });

  // Lazy load YouTube videos
  $('.youtube-play').on('click', function(e) {
    e.preventDefault();

    var $player = $(this).parent();
    var vidId = $player.attr('data-vid-id');
    var vidUrl = 'https://www.youtube.com/embed/' + vidId +
      '?autoplay=1&autohide=1&modestbranding=1&showInfo=0&html5=1';

    var $iframe = $('<iframe/>', {
      src: vidUrl,
      width: '100%',
      height: '100%',
      allowFullScreen: '',
      frameborder: '0'
    });

    $player.empty().append($iframe);
  });

  // Back to top button
  var offset = 300; //"back to top" button is shown
  var offsetOpacity = 1200; //"back to top" button opacity is reduced
  var scrollTopDuration = 700; //duration of the top scrolling animation (in ms)
  var $backToTopBtn = $('.top');

  // Hide or show the "back to top" link
  $(window).scroll(function() {
    if ($(this).scrollTop() > offset) {
      $backToTopBtn.addClass('is-visible');
    } else {
      $backToTopBtn.removeClass('is-visible fade-out');
    }
    if ($(this).scrollTop() > offsetOpacity) {
      $backToTopBtn.addClass('fade-out');
    }
  });

  // Smooth scroll to top
  function scrollToTop(e) {
    e.preventDefault();
    $('body, html').animate({
        scrollTop: 0
      }, scrollTopDuration
    );
  }

  $backToTopBtn.on('click', scrollToTop);

});
