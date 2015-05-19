var a, b, c, d;

function closure() {
    'use strict';

    var a = 0;

    b = c;

    a = a + a;

    c = true;

    b = 'asdf';
}

d = closure();
