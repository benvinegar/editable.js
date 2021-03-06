/*jshint browser:true, white:true, undef:true, strict:true */
/**
 * editable.js - a xbrowser library for contentEditable
 *
 * https://github.com/benvinegar/editable.js
 *
 * MIT License
 */
(function (window, undefined) {
    "use strict";
    var document   = window.document,
        character  = 'character',
        nbspRe     = new RegExp(String.fromCharCode(160), 'gi'),
        blockElemList = 'h1 h2 h3 h4 h5 h6 p pre blockquote address ul ol dir menu li dl div center form'.split(' '),
        blockElems = {},
        i          = 0;
        
    // build a list of block level elements
    for (i = 0; i < blockElemList.length; i++)
        blockElems[blockElemList[i]] = true;

    function normalizeSpace(str) {
        return str.replace(nbspRe, ' ');
    }

    function escapeTags(str) {
        return String(str)
            .replace('/&/g', '&amp;')
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
    }

    /**
     * Helper function to recursively aggregate all text from a set
     * of HTML nodes
     */
    function getTextHelper(nodes, ignoreBlockElems, nodeCallback) {
        var text = '',
            blocks = [],
            name,
            node,
            tmp,
            i;

        for (i = 0; i < nodes.length; ++i) {
            node = nodes[i];
            name = node.nodeName.toLowerCase();

            if (node.nodeType == 1) { // html node
                tmp = nodeCallback && nodeCallback(node);

                if (tmp) {
                    text += tmp;
                } else if (!ignoreBlockElems && blockElems.hasOwnProperty(name)) {
                    // Inside a block-level element, ignore any subsequent block-level
                    // elements (i.e. nested divs or paragraphs)
                    if (text)
                        blocks.push(text);
                    text = getTextHelper(node.childNodes, true, nodeCallback);
                } else if (name === 'br') {
                    // Always convert breaking tags to newlines
                    text += "\n";
                } else {
                    // Some other (inline) element; recur inside to extract text
                    text += getTextHelper(node.childNodes, ignoreBlockElems, nodeCallback);
                }
            }
            else if (node.nodeType == 3) { // text node
                text += normalizeSpace(node.nodeValue);
            }
        }
        // Block elements get two newlines (i.e. paragraphs)
        blocks.push(text);
        return blocks.join("\n");
    }

    var Editable = function (elem) {
        if (!elem || !elem.contentEditable)
            throw 'First argument must be contentEditable';

        this.elem = elem;
    };

    Editable.prototype = {

        /**
         * helper function for inserting random html
         */
        insertHTML: function (html) {
            if (document.all) {
                var range = document.selection.createRange();
                range.pasteHTML(html);
                range.collapse(false);
                return range.select();
            } else {
                return document.execCommand('insertHTML', false, html);
            }
        },

        /**
         * Grab all text nodes relative to their parents
         */
        // TODO make this function private and have the public version
        // only return textNodes for the wrapped textArea
        getTextNodes: function (nodeList) {
            var elem = this.elem;

            // special case a single node by massaging into a list of nodes
            if (nodeList && nodeList.nodeType)
                nodeList = [nodeList];
            // if nothing is passed in, get text nodes for elem
            else if (!nodeList)
                nodeList = elem.childNodes;

            var textNodes = [];

            for (var i = 0, node; i < nodeList.length; ++i) {
                node = nodeList[i];

                if (!node)
                    continue; // HACK to avoid erroring on whitespace nodes

                switch (node.nodeType) {
                case 1:
                    textNodes = textNodes.concat(this.getTextNodes(node.childNodes));
                    break;
                case 3:
                    // HACK don't count garbage FF nodes
                    if (!/^\n\s+/.test(node.nodeValue))
                        textNodes.push(node);
                    break;
                }
            }
            return textNodes;
        },

        set: function (str) {
            var elem = this.elem;

            str = escapeTags(str).replace(/\n/g, "<br>");
            elem.innerHTML = str;
        },

        /**
         * Get unformatted text
         */
        text: function (nodeCallback) {
            var elem = this.elem,
                out,
                nodes,
                i;

            // massage the NodeList into an Array of HTMLElements
            try {
                nodes = Array.prototype.slice.call(elem.childNodes);
            } catch (e) {
                nodes = [];
                for (i = 0; i < elem.childNodes.length; ++i)
                    nodes.push(elem.childNodes[i]);
            }
            out = getTextHelper(nodes, false, nodeCallback);
            return out.replace(/\n$/, "");
        },

        /**
         * Removes the given node, and move the cursor position
         * to where the node was removed (if possible)
         *
         * TODO: Does this belong in this library? Should probably
         *       be separate.
         */
        removeNode: function (node) {
            var prev, sel, range;

            // WebKit / Firefox
            if (window.getSelection) {
                // Deleting the node that contains the range means there
                // are no more ranges in the Selection object. In which case,
                // we set the range on the previous node in order to maintain
                // document focus.
                prev = node.previousSibling;
                node.parentNode.removeChild(node);
                sel = window.getSelection();
                range = document.createRange();
                if (prev) {
                    range.setStart(prev, prev.length);
                    range.setEnd(prev, prev.length);
                }
                sel.addRange(range);
            }
            // IE
            else {
                // TODO use selection code
                node.parentNode.removeChild(node);
            }
        },

        /**
         * Get currently selected text node in
         * the contentEditable element.
         */
        selectedTextNode: function () {
            var elem = this.elem;
            var sel,
            range;

            // Webkit/Firefox
            if (window.getSelection) {
                sel = window.getSelection();
                return sel.anchorNode;
            }
            // Internet Explorer
            else if (document.selection.createRange) {
                // I wish that you never have to touch this code. You're probably sitting here
                // looking at this function saying "wtf" to yourself becuase it's so hiddeous.
                // If Internet Explorer 9 every becomes the lowest rung on the Microsoft browser family,
                // simple delete this conditional and never look back. If you have the misfortune of
                // modifying the following snippet, I wish you the best of luck in your endeavor.
                range = document.selection.createRange().duplicate();

                // Microsoft thinks about the entire contentEditable container like a single
                // line of text. Because of this, you won't be able to get the anchorNode of
                // the current selection. What we're doing here is simply moving the caret to
                // the front of the entire block of text.
                while (range.moveStart(character, -1000) == -1000)
                    continue;

                var text = range.text,
                node, textNode, textNodes, prevNode, snippet, i, j;

                // The trick is that we know where the end of our caret is
                // so all we have to do is loop over all text nodes and find
                // out where the two strings differ. Notice how we are truncating
                // the copied string for each iteration of the inner loop. This
                // is done so that when the two strings differ, we can simply
                // compare the remaining piece of the copied string with the
                // current node, this saves us an extra couple of loops.
                for (i = 0; i < elem.childNodes.length; ++i) {

                    node = elem.childNodes[i];
                    textNodes = this.getTextNodes(node);

                    for (j = 0; j < textNodes.length; ++j) {
                        textNode = textNodes[j];
                        snippet = normalizeSpace(textNode.nodeValue);

                        if (text.indexOf(snippet) > -1) {
                            prevNode = textNode;
                            text = text.replace(snippet, '');
                        }
                        // special case where textNode content is longer
                        // than the selected portion of the textNode
                        else {
                            if (snippet.indexOf(text) > -1)
                                return textNode;
                        }
                    }
                }
                return prevNode;
            }
        },

        /**
         * Get relative offset in the currently active text node
         */
        selectedTextNodeOffset: function (node) {
            var range, newOffset;

            // Webkit/Firefox
            if (window.getSelection) {
                var sel = window.getSelection();
                // wondering if this should really
                // be the focus offset, does it even
                // really matter? probably not me thinks
                if (sel && sel.anchorOffset)
                    newOffset = sel.anchorOffset;
            }

            // Internet Explorer
            else if (node && document.selection.createRange) {
                range = document.selection.createRange();
                var textNodeText = normalizeSpace(node.nodeValue),
                r2 = range.duplicate(),
                prevParent = r2.parentElement(),
                offset = 0;

                // move backwards over the range and compare the selected text
                // node text with the range. break if either we've found a match
                // or the previous range we create each iteration has a different
                // parent element
                while (range.moveStart(character, -1) !== 0 && ++offset) {
                    if (textNodeText.indexOf(normalizeSpace(range.text)) === 0 || prevParent != range.parentElement()) {
                        break;
                    }
                    r2 = range.duplicate();
                    prevParent = r2.parentElement();
                }
                newOffset = offset;
            }


            return isNaN(newOffset) ? 0 : newOffset;
        },

        /**
         * Select some text in the contentEditable div
         */
        selectNodeText: function (node, start, end) {
            var elem = this.elem;
            var sel, range;

            // Webkit/Firefox
            if (window.getSelection) {
                // clear all ranges
                sel = window.getSelection();
                sel.removeAllRanges();
                // select the new one
                range = document.createRange();
                range.setStart(node, start);
                range.setEnd(node, end);
                sel.addRange(range);
                return sel;
            }

            // Internet Explorer
            else if (document.selection.createRange) {
                range = document.selection.createRange();

                // KLUDGE
                // if there is a substring match before we hit the start of the text node
                // then this code will break. Might want to think about a more robust way
                // about doing this.
                var text = normalizeSpace(node.nodeValue);

                // MASSIVE HACK for ie < 9, clicks change the focus, so we need to
                // focus back on the contentEditable div and refind out
                // start position. The rest of the function can continue as
                // normal afterwards.
                if (range.parentElement().nodeName.toLowerCase() == 'body') {
                    elem.focus();
                    range = document.selection.createRange();
                    // expand over the entire extArea
                    while (range.moveStart(character, -1000) == -1000)
                        continue;
                    while (range.moveEnd(character, 1000) == 1000)
                        continue;
                    var rangeText = normalizeSpace(range.text);
                    var index = rangeText.indexOf(text);
                    if (index > 0)
                        range.moveStart(character, index + 2); // put us inside the range
                    range.collapse();
                }

                // move start cursor to start of text node
                while (range.moveStart(character, -1) === -1 && text.indexOf(normalizeSpace(range.text)) !== 0)
                    continue;

                // move end cursor to end of text node
                while (range.moveEnd(character, 1) === 1 && text !== normalizeSpace(range.text))
                    continue;

                // move the start and end indicies of the Range and select
                range.moveStart(character, start);
                range.moveEnd(character, -1 * (end - start - range.text.length));
                range.select();

                return range;
            }
        }
    };

    Editable.normalizeSpace = normalizeSpace;

    // assign to the current window
    window.Editable = Editable;
})(this);