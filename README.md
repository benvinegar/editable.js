editable.js
----

A cross-browser library for working with contentEditable DOM elements. Forked from [jsEditable](https://github.com/gjcourt/jsEditable) by George Courtsunis.

The Problem
---

Each browser treats user input into contentEditable elements differently.

Sample input:

```html
one
two
three
```

Output in *Chrome*:

```html
one
<div>two</div>
<div>three</div>
```

*Firefox*:

```html
one<br/>
two<br/>
three<br/>
```

*Internet Explorer 9*:

```html
<p>one<br/>
two<br/>
three</p>
```

editable.js tries to smooth over these inconsistencies when accessing contentEditable text.

Usage
---

```javascript
var editable = new Editable(elem);

var text = editable.getText();
```

See source code for more.

Contributors
---

* [George Courtsunis](https://github.com/gjcourt)
* [Ben Vinegar](https://github.com/benvinegar)