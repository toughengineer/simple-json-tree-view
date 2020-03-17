function createJsonTreeDom(json, generateCopyButton = false) {
  function impl(json, parent) {
    var appendElement = (parent, tag) => {
      var e = document.createElement(tag);
      parent.appendChild(e);
      return e;
    };

    var createElement = (tag, className, textContent) => {
      var e = document.createElement(tag);
      e.className = className;
      if (textContent)
        e.textContent = textContent;
      return e;
    };

    var appendText = (element, text) => {
      element.appendChild(document.createTextNode(text));
    }

    var jsonEscapeRe = /\\(?:"|\\|b|f|n|r|t|u[0-1a-fA-F]{4})/;
    switch (typeof (json)) {
      case 'boolean':
      case 'number':
        var str = JSON.stringify(json);
        var e = createElement('span', 'numericValue', str);
        e.dataset.valueData = str;
        parent.appendChild(e);
        break;
      case 'string':
        var str = JSON.stringify(json);
        var str = str.substring(1, str.length - 1);
        var inner = createElement('span', 'stringValue', '"' + str + '"');
        inner.dataset.valueData = str;
        if (jsonEscapeRe.test(str)) {
          var tooltip = createElement('span', 'tooltip', json);
          var outer = document.createElement('span');
          outer.appendChild(tooltip);
          outer.appendChild(inner);
          parent.appendChild(outer);
        }
        else {
          parent.appendChild(inner);
        }
        break;
      case 'object':
        if (json === null) {
          var e = createElement('span', 'nullValue', 'null');
          e.dataset.valueData = 'null';
          parent.appendChild(e);
          break;
        }

        function addCopyButton(element, json) {
          const button = appendElement(element, 'div');
          button.className = 'copy';
          button.addEventListener('click', (event) => {
            const onFail = (e) => {
              button.classList.add('not-copied');
              void button.offsetWidth; // triggers animation transitions
              button.classList.remove('not-copied');
              console.log('Failed to copy to clipboard: ', e);
            };
            try {
              navigator.clipboard.writeText(JSON.stringify(json, null, '  '))
                .then(
                  () => {
                    button.classList.add('copied');
                    void button.offsetWidth; // triggers animation transitions
                    button.classList.remove('copied');
                  },
                  onFail
                );
            }
            catch (e) {
              onFail(e.message);
            }
          });
        }

        function createNumberOfElementsElement(count) {
          var e = createElement('span', 'numberOfElements');
          e.dataset.itemCount = count;
          return e;
        }

        var isArray = Array.isArray(json);
        if (isArray) {
          if (json.length == 0) {
            appendText(parent, '[]');
            break;
          }
          appendText(parent, '[');
          var list = appendElement(parent, 'ul');
          var item = null;
          for (var i = 0; i != json.length; ++i) {
            if (item)
              appendText(item, ',');
            item = document.createElement('li');
            var outer = appendElement(item, 'div');
            outer.className = 'key';
            const value = json[i];
            appendElement(outer, 'span');
            if (generateCopyButton)
              addCopyButton(outer, value);
            impl(value, item);
            list.appendChild(item);
          }
          parent.appendChild(createNumberOfElementsElement(json.length));
          appendText(parent, ']');
        } else {
          var keys = Object.keys(json);
          if (keys.length == 0) {
            appendText(parent, '{}');
            break;
          }
          appendText(parent, '{');
          var list = appendElement(parent, 'ul');
          var item = null;
          for (var key of keys) {
            if (item)
              appendText(item, ',');
            item = document.createElement('li');
            var outer = appendElement(item, 'div');
            outer.className = 'key';
            const value = json[key];
            var inner = appendElement(outer, 'span');
            if (generateCopyButton)
              addCopyButton(outer, value);
            inner.dataset.keyData = key;
            inner.textContent = '"' + key + '"';
            appendText(item, ': ');
            impl(value, item);
            list.appendChild(item);
          }
          parent.appendChild(createNumberOfElementsElement(keys.length));
          appendText(parent, '}');
        }
        if (parent.tagName == 'LI') {
          parent.classList.add('folder', 'folded');
        }
        break;
      default:
        appendText(parent, 'unexpected: ' + JSON.stringify(json));
        break;
    }
  };
  var holder = document.createElement('div');
  holder.className = 'tree';
  impl(json, holder);
  for (var e of holder.querySelectorAll('li.folder > div.key > span')) {
    e.addEventListener('click', function (event) {
      var parent = this.parentElement.parentElement;
      var expanded = !parent.classList.toggle('folded');
      if (event.ctrlKey || event.metaKey) {
        var children = parent.querySelectorAll('li.folder');
        if (expanded) {
          for (var e of children)
            e.classList.remove('folded');
        }
        else {
          for (var e of children)
            e.classList.add('folded');
        }
      }
    });
  }
  for (var e of holder.querySelectorAll('.tooltip')) {
    e.addEventListener('transitionstart', function (e) {
    });
  }
  return holder;
}

function filterItems(pattern, parent, regexpErrorHandler) {
  parent = parent.querySelector('.tree');
  for (var e of parent.querySelectorAll('li.filterShow'))
    e.classList.remove('filterShow');
  var removeChildren = (parent) => {
    while (parent.firstChild)
      parent.removeChild(parent.firstChild);
  };
  for (var e of parent.querySelectorAll('span[data-key-data] mark:first-child')) {
    e = e.parentElement;
    removeChildren(e);
    e.textContent = '"' + e.dataset.keyData + '"';
  }
  for (var e of parent.querySelectorAll('span[data-value-data]  mark:first-child')) {
    e = e.parentElement;
    removeChildren(e);
    if (e.className == 'stringValue')
      e.textContent = '"' + e.dataset.valueData + '"'; // does necessary escaping for us
    else
      e.textContent = e.dataset.valueData;
  }
  if (pattern.length == 0) {
    parent.classList.remove('filter');
    return;
  }
  parent.classList.add('filter');
  try {
    var re = new RegExp(pattern, 'gi');
  }
  catch (e) {
    if (regexpErrorHandler)
      regexpErrorHandler(e.message);
    return;
  }
  var appendMarkedHTML = (parent, text) => {
    if (!text)
      return false;
    var re = new RegExp(pattern, 'gi');
    var lastIndex = 0;
    var lastMatch = '';
    var haveNonEmptyMatches = false;
    var appendLastMatchMarked = () => {
      if (lastMatch) {
        var marked = document.createElement('mark');
        marked.textContent = lastMatch;
        parent.appendChild(marked);
        lastMatch = '';
        haveNonEmptyMatches = true;
      }
    };
    var match;
    while (match = re.exec(text)) {
      if (lastIndex != match.index) {
        appendLastMatchMarked();
        parent.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
      }
      lastMatch += match[0];
      lastIndex = re.lastIndex;
    }
    appendLastMatchMarked();
    if (!haveNonEmptyMatches) {
      parent.appendChild(document.createTextNode(text));
      return false;
    }
    if (text.length != lastIndex)
      parent.appendChild(document.createTextNode(text.substring(lastIndex)));
    return true;
  }
  var appendMarkedHTMLWithQuotes = (parent, text) => {
    parent.appendChild(document.createTextNode('"'));
    var hasMarks = appendMarkedHTML(parent, text);
    parent.appendChild(document.createTextNode('"'));
    return hasMarks;
  }

  for (var e of document.querySelectorAll('.tree li')) {
    var foundName = (() => {
      var nameElement = e.querySelector('div.key > *');
      if (nameElement.dataset.keyData) {
        removeChildren(nameElement);
        return appendMarkedHTMLWithQuotes(nameElement, nameElement.dataset.keyData);
      }
      return false;
    })();
    var foundValue = (() => {
      var valueElement = e.querySelector('.stringValue, .numericValue, .nullValue');
      if (valueElement) {
        removeChildren(valueElement);
        if (valueElement.className == 'stringValue') {
          return appendMarkedHTMLWithQuotes(valueElement, valueElement.dataset.valueData);
        }
        return appendMarkedHTML(valueElement, valueElement.dataset.valueData);
      }
      return false;
    })();
    if (foundName || foundValue) {
      do {
        e.classList.add('filterShow');
        e = e.parentElement.parentElement;
      } while (e.tagName == 'LI');
    }
  }
}

function exapandFilteredItems(parent) {
  parent = parent.querySelector('.tree');
  parent.classList.remove('filter');
  for (var e of parent.querySelectorAll('li.filterShow')) {
    e.classList.remove('filterShow');
    e.classList.remove('folded');
  }
}
