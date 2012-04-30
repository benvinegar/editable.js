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

test('breaking tags', function () {
    this.elem.html('hi<br>there');
    equal(this.content.text(), "hi\nthere");
});

test('block elements', function () {
    this.elem.html('hi<div>there</div>');
    equal(this.content.text(), "hi\nthere");
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