// Give a notice about how awesome inspector is in console
var msg = [
    '           .---._-------------------------------------+',
    '___________/ ._____)                                   |',
    '              ) __|   HEY HACKER! MARIONETTE IS        |',
    '                __|   EVEN COOLER WHEN YOU USE THE     |',
    '..---------.._____|   INSPECTOR. http://goo.gl/Wo3pju  |',
    '                  +------------------------------------+'
].join('\n');

try {
    console.log('%c' + msg, 'background: #A80000; color: #EBF2C2');
} catch(o_O) {}