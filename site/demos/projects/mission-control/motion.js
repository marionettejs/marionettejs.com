// Browser animation mechanics. Mission owns the AbortController and decides
// whether a finished animation may record a delivery; this file does neither.
function animateFlight(rocket, { duration, guided, onPause }) {
  const animation = rocket.animate(
    [
      {
        left: '10%',
      },
      {
        left: '90%',
      },
    ],
    {
      duration,
      fill: 'forwards',
      easing: 'linear',
    },
  );
  let pauseTimer;
  if (guided) {
    pauseTimer = setTimeout(() => {
      animation.pause();
      animation.currentTime = duration / 2;
      onPause();
    }, duration / 2);
  }
  const clearPause = () => clearTimeout(pauseTimer);

  // Completion, cancellation, and failure all release the teaching timer.
  animation.finished.then(clearPause, clearPause);
  return animation;
}
function animateHangar(doors) {
  return [...doors].map((door, index) =>
    door.animate(
      [
        {
          transform: 'translateX(0)',
        },
        {
          transform: 'translateX(' + (index === 0 ? -100 : 100) + '%)',
        },
      ],
      {
        duration: 1000,
        fill: 'forwards',
      },
    ),
  );
}

export { animateFlight, animateHangar };
