$(document).ready(function() {

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
        };

        function slideshowPrev() {
            pos = (pos === 0) ? pos : pos - 1;
            setTransform();
        };

        function slideshowNext() {
            pos = (pos === slideCount - 1) ? pos : pos + 1;
            setTransform();
        };

        $(window).on('resize', _.throttle(setTransform, 300));
        $slideshowNext.on('click', slideshowNext);
        $slideshowPrev.on('click', slideshowPrev);
    })();

    // --- /

    // equalHeights
    if($(window).width() > 705) {
        $('.code_examples > div').equalHeights();
    }
    $(window).resize(function() {
        if($(window).width() > 705) {
            $('.code_examples > div').css('height', 'auto');
            $('.code_examples > div').equalHeights();
        } else {
            $('.code_examples > div').css('height', 'auto');
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
      $this.parent().toggleClass('active');
      $('.slider').toggleClass('closed');

      var txt = $this.text() === 'more'? 'less': 'more';
      $this.text(txt);
    });

    // lazy load youtube videos
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

    //hide or show the "back to top" link
    $(window).scroll(function(){
        ($(this).scrollTop() > offset) ? $backToTopBtn.addClass('is-visible') : $backToTopBtn.removeClass('is-visible fade-out');
        if($(this).scrollTop() > offset_opacity) {
            $backToTopBtn.addClass('fade-out');
        }
    });

    //smooth scroll to top
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
