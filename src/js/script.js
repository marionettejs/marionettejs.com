$(document).ready(function() {
    // Logo animation
    $('.primary-logo').mouseenter(function() {
          snabbt(this, 'attention', {
              rotation: [0, 0, Math.PI/2],
              springConstant: 1.9,
              springDeacceleration: 0.9
          });
      }
    );

    // CSS3 Slider - Videos Section
    // ---

    (function() {
        var $slideshowWrap = $('.video_slideshow_scroller'),
            $slideshowPrev = $slideshowWrap.children('.prev').hide(),
            $slideshowNext = $slideshowWrap.children('.next'),
            $slider = $slideshowWrap.children('.video_slideshow'),
            $slide = $slider.children().first(),
            slideCount = $slider.children().length,
            pos = 0;

        function setTransform() {
            var distance = (-pos * ($slide.width() + parseInt($slide.css('margin-right').replace(/px/g, ''), 10)));
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
    if($(window).width() > 705) {
      $codeSample.equalHeights();
    }
    $(window).resize(function() {
        if($(window).width() > 705) {
          $codeSample.css('height', 'auto');
          $codeSample.equalHeights();
        } else {
          $codeSample.css('height', 'auto');
        }
    });

    // Google Prettify syntax highlighting
    prettyPrint();

    // Unveil.js (lazy loader for company logos)
    $('.company-logo-list img').unveil();

    // Toggle top nav
    $('.menu-icon').on('click', function() {
        $('.nav-slider').toggleClass('closed');
    });

    // Toggle company logos
    $('.show-more').on('click', function(e) {
      var $this = $(this);

      e.preventDefault();
      $this.toggleClass('active');
      $('.slider').toggleClass('closed');

      var txt = $this.text() === 'more'? 'less': 'more';
      $this.text(txt);
    });

    // Lazy load YouTube videos
    $('.youtube-play').on('click', function(e) {
        e.preventDefault();

        var $player = $(this).parent(),
            vidId = $player.attr('data-vid-id'),
            vidUrl = 'https://www.youtube.com/embed/' + vidId
                   + '?autoplay=1&autohide=1&modestbranding=1&showInfo=0&html5=1';

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
    var offset_opacity = 1200; //"back to top" button opacity is reduced
    var scroll_top_duration = 700; //duration of the top scrolling animation (in ms)
    var $backToTopBtn = $('.top');

    // Hide or show the "back to top" link
    $(window).scroll(function(){
        ($(this).scrollTop() > offset) ? $backToTopBtn.addClass('is-visible') : $backToTopBtn.removeClass('is-visible fade-out');
        if($(this).scrollTop() > offset_opacity) {
            $backToTopBtn.addClass('fade-out');
        }
    });

    // Smooth scroll to top
    function scrollToTop(e) {
        e.preventDefault();
        $('body, html').animate({
              scrollTop: 0
          }, scroll_top_duration
        );
    }

    $backToTopBtn.on('click', scrollToTop);

    $logo = $('.left.logo');
    $logo.on('click', scrollToTop);
});
