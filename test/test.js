var config = {
    setup: function () {
        this.elem = $('#content');
        this.content = new Editable(this.elem[0]);
    }
};

module('set', config);

test('newlines', function () {
    this.content.set('one\ntwo\nthree');
    equal(this.elem.html(), 'one<br>two<br>three');
});

test('html', function () {
    this.content.set('&one<br>two<br>three');
    equal(this.elem.html(), '&amp;one&lt;br&gt;two&lt;br&gt;three');
});

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

test('webkit', function () {
    // Input:
    //   one
    //   two
    //   three
    //
    // Shift-returned:
    //   one<br>
    //   two<br>
    //   three

    // Returned:
    //   one
    //   <div>two</div>
    //   <div>three</div>

    this.elem.html('one<br>two<br>three');
    equal(this.content.text(), "one\ntwo\nthree");

    this.elem.html('one<div>two</div><div>three</div>');
    equal(this.content.text(), "one\ntwo\nthree");

});

test('firefox/gecko', function () {
    // Input:
    //   one
    //   two
    //   three
    //
    // Always becomes:
    //   one<br>
    //   two<br>
    //   three<br> <- Firefox always generates extra br (need to reject this)

    this.elem.html('one<br>two<br>');
    equal(this.content.text(), "one\ntwo");

    this.elem.html('one<br>two<br>three<br>');
    equal(this.content.text(), "one\ntwo\nthree");

    this.elem.html('one<br>two<br>three<br><br>');
    equal(this.content.text(), "one\ntwo\nthree\n");
});

test('internet explorer', function () {
    // Input:
    //   one
    //   two
    //   three
    //
    // Shift-returned:
    //   <p>
    //     one<br>
    //     two<br>
    //     three
    //   </p>
    //
    // Returned:
    //
    // <p>one</p>
    // <p>two</p>
    // <p>three</p>

    this.elem.html('<p>one<br>two<br>three</p>');
    equal(this.content.text(), "one\ntwo\nthree");

    this.elem.html('<p>one</p><p>two</p><p>three</p>');
    equal(this.content.text(), "one\ntwo\nthree");
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

module('removeNode', config);

test('basic', function () {
    // TODO: Check the cursor has moved
    this.elem.html('hi <span>there</span>');
    var span = this.elem.find('span')[0];

    this.content.removeNode(span);

    equal(this.elem.html(), 'hi ');
    // TODO: Check the cursor has moved
});