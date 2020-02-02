# Simple JSON tree view
See [demo](https://toughengineer.github.io/simple-json-tree-view/).

This is a simple JSON tree view.
It has no external dependecies, just plain JavaScript+CSS, it works good in recent Chrome (also tested in Edge)

Though it is simple, I implemented few capabilities:
* expaning/collapsing tree items,
* copyable: expand items to desired configuration, select and copy &mdash; it should be valid JSON (with collapsed items contents omitted),
* filter items using regex on names and values with highlighting of the matching term,
* pretty looks: names and values have distinct visual styles, indexes are shown on the left, expand/collapse button is transparent when not hovered.

## I have no idea what I'm doing
This is my first relatively serious JavaScript and CSS code beyond simple scripts. So... expect some shitty unconventional code inside. 🙂

All in all, I wouldn't use it "in production" as is.

I have not found a library that is easily integratable in a standalone HTML page (through a CDN or otherwise), so I ended up implementing my own library ~~with blackjack and hookers~~. The intention was to make the code very small so you can copy paste it directly into your HTML. Main idea was to use CSS whenever possible, so that JS code can be simpler (fewer event handlers, etc.).

## This code is not maintained
I do not actively maintain this code.

I would love to accept pull requsts, though I wish someone to take this code, comb it and fix it, and eventually maintain that better version. Please tell me if you did that. 🙂

## This code is public domain
Feel free to use it as is (no warranties implied though 🙂), or as a template, or a starting point for your own code.