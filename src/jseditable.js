/**
 * jsEditable a xbrowser library for Ranges and contendEditable
 *
 * Author: George Courtsunis <gjcourt@gmail.com>
 * Last Modified: 2011-05-19
 * Version: 0.1
 * Copyright © 2011 by <George Courtsunis> MIT License
 *
 */
var jsEditable = (function() {

  var blockElemList = 'h1 h2 h3 h4 h5 h6 p pre blockquote address ul ol dir menu li dl div center form hr br'.split(' '),
      breakingElements = {};

  for (var i = 0; i < blockElemList.length; i++)
      breakingElements[brElemList[i]] = true;

  var p = {};

  /**
   * Replace NBSP with space
  */
  function normalizeSpace(str) {
      var NBSP = String.fromCharCode(160);
      return str.replace(new RegExp(NBSP, 'gi'), ' ');
  }

  /**
    * Helper function for decoding UTF8 encoded strings
  */
  function decodeUTF8(utftext) {

      var utf8Re = '&#?(\\d+);',
      terms = utftext.match(new RegExp(utf8Re, 'g')),
      code;

      // we didn't find anything encoded
      if (!terms)
          return utftext;

      // map over all encoded chars, and swap them out
      for (var i = 0, term; i < terms.length; ++i) {
          term = terms[i];
          code = term.match(new RegExp(utf8Re));
          if (code.length)
              utftext = utftext.replace(code[0], String.fromCharCode(code[1]));
      };

      return utftext;
  }

  /**
   * Remove a node from the DOM
  */
  p.removeNode = function(node) {
      if (node && node.parentNode)
          node.parentNode.removeChild(node);
  };

  /**
   * Wrapper function for running contentEditable commands
  */
  p.execCommand = function(doc, command, value) {
      // special case commands here, when needed
      if (command === 'insertHTML') {
          if (doc.all) {
              var range = doc.selection.createRange();
              range.pasteHTML(value);
              range.collapse(false);
              return range.select();
          } else {
              return doc.execCommand('insertHTML', false, value);
          }
      } else {
          return doc.execCommand(command, false, value);
      }
  }

  /**
   * helper function for inserting random html
  */
  p.insertHTML = function(html) {
      return execCommand(document, 'insertHTML', html);
  }

  /**
   * Grab all text nodes relative to their parents
  */
  p.getTextNodes = function(nodeList, resolveMentions) {

      // special case a single node by massaging into a list of nodes
      if (nodeList && nodeList.nodeType)
          nodeList = [nodeList];

      var textNodes = [];

      for (var i = 0, node; i < nodeList.length; ++i) {

          node = nodeList[i];

          if (!node)
              continue; // HACK to avoid erroring on whitespace nodes

          switch (node.nodeType) {
              case 1:
                  if (resolveMentions && isMention(node)) {
                  textNodes = textNodes.concat(mentionToTextNode(node));
                  break;
              }
              textNodes = textNodes.concat(getTextNodes(node.childNodes, resolveMentions));
              break;
              case 3:
                  // HACK don't count garbage FF nodes
                  if (!/^\n\s+/.test(node.nodeValue))
              textNodes.push(node);
              break;
          }
      }
      return textNodes;
  }

  /**
   * Get unformatted comment text
  */
  p.getText = function(textArea, callback) {
      /**
       * Helper function to recursively aggregate all text from a set
       * of HTML nodes
       */
      function getTextHelper(nodes, ignoreBreaks) {
          var text = '';
          for (var i = 0; i < nodes.length; ++i) {
              var node = nodes[i],
              name = node.nodeName.toLowerCase();
              // html node
              if (node.nodeType == 1) {
                  // resolve mention nodes to text strings
                  if (isMention(node))
                      text += mentionToText(node);
                  // the last node, we don't want trailing newlines
                  else if (i == nodes.length - 1)
                      text += getTextHelper(node.childNodes, true);
                  // a breaking node, we don't want to add breaks to any of the children
                  else if (!ignoreBreaks && breakingElements.hasOwnProperty(name))
                      text += getTextHelper(node.childNodes, true) + '\n';
                  // text node, concatenate text
                  else
                      text += getTextHelper(node.childNodes);
              }
              // text node
              else if (node.nodeType == 3) {
                  // ignore garbage newline TextNodes
                  if (DISQUS.host.browser.gecko && i === 0 && /^\n$/.test(node.nodeValue))
                      continue;
                  text += node.nodeValue;
              }
              // something else, ignore
              else {
                  continue;
              }
          }
          return text;
      }

      var nodes,
      text = '',
      index = 0;

      // massage the NodeList into an Array of HTMLElements
      try {
          nodes = Array.prototype.slice.call(textArea.childNodes);
      } catch (e) {
          nodes = [];
          for (var i = 0; i < textArea.childNodes.length; ++i)
              nodes.push(textArea.childNodes[i]);
      }

      // KLUDGE: WebKit doesn't have a breaking (<br>) element
      // following/surrounding the very first TextNode, so we have to
      // special case the first line. If there a multiple nodes, grab
      // all text nodes until you hit the first block level element,
      // and glue a newline to the end of the text string.
      if (DISQUS.host.browser.webkit && nodes.length && nodes[0].nodeType == 3) {
          var additionalNodes = false;
          for (var j = 0; j < nodes.length; ++j) {
              index = j;
              // text node
              if (nodes[j].nodeType == 3)
                  text += nodes[j].nodeValue;
              // html node
              else if (nodes[j].nodeType == 1 && !breakingElements.hasOwnProperty(nodes[j].nodeName.toLowerCase()))
                  if (isMention(nodes[j]))
                      text += mentionToText(nodes[j]);
              else
                  text += getTextHelper(nodes[j].childNodes);
              else {
                  additionalNodes = true;
                  break;
              }
          }
          // only add a newline if we have subsequent block-level
          // elements
          if (index && additionalNodes)
              text += '\n' + getTextHelper(nodes.slice(index));
      }
      else {
          text += getTextHelper(nodes);
      }

      return callback ? callback(text) : text;
  };

  /**
   * Get currently selected text node in
   * the contentEditable element.
  */
  p.getSelectedTextNode = function() {
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
          while (range.moveStart('character', -1000) == -1000)
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
          for (i = 0; i < textArea.get(0).childNodes.length; ++i) {

              node = textArea.get(0).childNodes[i];
              textNodes = getTextNodes(node);

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
  };

  /**
   * Get relative offset in the currently active text node
  */
  p.getSelectedTextNodeOffset = function(node) {
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
          while (range.moveStart('character', -1) !== 0 && ++offset) {
              if (textNodeText.indexOf(normalizeSpace(range.text)) === 0 || prevParent != range.parentElement()) {
                  break;
              }
              r2 = range.duplicate();
              prevParent = r2.parentElement();
          }
          newOffset = offset;
      }


      return isNaN(newOffset) ? 0 : newOffset;
  };

  /**
   * Select some text in the contentEditable div
  */
  p.selectNodeText = function(node, start, end) {
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
              textArea.get(0).focus();
              range = document.selection.createRange();
              // expand over the entire textArea
              while (range.moveStart('character', -1000) == -1000)
                  continue;
              while (range.moveEnd('character', 1000) == 1000)
                  continue;
              var rangeText = normalizeSpace(range.text);
              var index = rangeText.indexOf(text);
              if (index > 0)
                  range.moveStart('character', index + 2); // put us inside the range
              range.collapse();
          }

          // move start cursor to start of text node
          while (range.moveStart('character', -1) === -1 && text.indexOf(normalizeSpace(range.text)) !== 0)
              continue;

          // move end cursor to end of text node
          while (range.moveEnd('character', 1) === 1 && text !== normalizeSpace(range.text))
              continue;

          // move the start and end indicies of the Range and select
          range.moveStart('character', start);
          range.moveEnd('character', -1 * (end - start - range.text.length));
          range.select();

          return range;
      }
  };
  return p;
})();
