var config = {
    setup: function () {
        this.elem = $('#content');
        this.content = new Editable(this.elem[0]);
    }
};


module('text', config);

test('no formatting', function () {
    this.elem.html('hi there');
    equal(this.content.text(), 'hi there');
});

test('convert nbsp', function () {
    // make sure converts from unicode nbsp to regular space
    this.elem.html('hi&nbsp;there');
    equal(this.content.text(), 'hi there');
});

test("ignore user-inputted tags", function () {
    // inline
    this.elem.html('&lt;strong&gt;hi there&lt;/strong&gt;');
    equal(this.content.text(), '<strong>hi there</strong>');

    // block-level
    this.elem.html('&lt;div&gt;hi there&lt;/div&gt;');
    equal(this.content.text(), '<div>hi there</div>');
});

test('breaking tags', function () {
    this.elem.html('hi<br>there');
    equal(this.content.text(), "hi\nthere");

    this.elem.html('hi<br>there<br>');
    equal(this.content.text(), "hi\nthere\n");

    this.elem.html('hi<br>there<br><br>');
    equal(this.content.text(), "hi\nthere\n\n");
});

test('block elements', function () {
    this.elem.html('hi<div>there</div>');
    equal(this.content.text(), "hi\nthere");

    this.elem.html('<div>hi there</div>');
    equal(this.content.text(), "\nhi there");

    this.elem.html('<div>hi</div> <div>there</div>');
    equal(this.content.text(), "\nhi \nthere");

    // trailing div is a trailing newline
    this.elem.html('<div>hi</div> <div>there</div><div></div>');
    equal(this.content.text(), "\nhi \nthere\n");
});

test('nested block elements', function () {
    // want a single newline for multiple nested block elements
    this.elem.html('hi<div><div>there</div></div>');
    equal(this.content.text(), "hi\nthere");

    this.elem.html('hi<div><div><div><div>there</div></div></div></div>');
    equal(this.content.text(), "hi\nthere");
});

test('node callback', function () {
    var callback1 = function(node) {
        return 'what';
    };

    this.elem.html('hi <div>there</span>');
    equal(this.content.text(callback1), "hi what");

    var callback2 = function(node) {
        // do nothing
    };

    this.elem.html('hi <div>there</span>');
    equal(this.content.text(callback2), "hi \nthere");
});


module('insertHTML', config);

test('text node replace', function () {
    this.elem.html('hi there');
    this.content.selectNodeText(this.elem[0].firstChild, 0, 2);
    this.content.insertHTML('bye');

    equal(this.content.text(), 'bye there');
});

test('DOM node replace', function () {
    this.elem.html('hi <div>there</div>');

    // offset of 1 is whole div
    this.content.selectNodeText(this.elem.find('div')[0], 0, 1);
    this.content.insertHTML('where');

    equal(this.elem.text(), 'hi where');
});


module('selectedTextNode', config);

test('get selection', function () {
    this.elem.html('hi there');
    this.content.selectNodeText(this.elem[0].firstChild, 0, 2);

    // Entire text node is selected, not just first two characters
    equal(this.content.selectedTextNode().textContent, 'hi there');
});

module('selectedTextNodeOffset', config);

test('get offset', function () {
    this.elem.html('hi there');
    var textNode = this.elem[0].firstChild;

    this.content.selectNodeText(textNode, 0, 2);
    equal(this.content.selectedTextNodeOffset(), 0);

    this.content.selectNodeText(textNode, 2, 4);
    equal(this.content.selectedTextNodeOffset(), 2);
});