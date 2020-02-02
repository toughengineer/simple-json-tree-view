function escaped(text) {
  return text.replace(/[&<>]/g, (match) => {
    switch (match) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      //case '"': return '&quot;';  // " is escaped in attributes, otherwise
      //case '\'': return '&apos;'; // it's not necessary to escape
    }
    throw new Error('unexpected match of RegExp');
  });
}


function createJsonTreeDom(json) {
  function impl(json, parent) {
    var appendElement = (tag) => {
      var e = document.createElement(tag);
      parent.appendChild(e);
      return e;
    };

    var jsonEscapeRe = /\\(?:"|\\|b|f|n|r|t|u[0-1a-fA-F]{4})/;
    switch (typeof (json)) {
      case 'boolean':
      case 'number':
        var str = JSON.stringify(json);
        parent.innerHTML += '<span class="numericValue" data-value-data="' + str + '">' + str + '</span>';
        break;
      case 'string':
        var str = JSON.stringify(json);
        var str = str.substring(1, str.length - 1);
        var inner = '<span class="stringValue" data-value-data="' + str.replace(/"/g, '&quot;') + '">"' + escaped(str) + '"</span>';
        if (jsonEscapeRe.test(str))
          parent.innerHTML += '<span><span class=tooltip>' + escaped(json) + '</span>' + inner + '</span>';
        else
          parent.innerHTML += inner;
        break;
      case 'object':
        if (json === null) {
          parent.innerHTML += '<span class="nullValue" data-value-data="null">null</span>';
          break;
        }
        var isArray = Array.isArray(json);
        if (isArray) {
          if (json.length == 0) {
            parent.innerHTML += '[]';
            break;
          }
          else {
            parent.innerHTML += '[';
            var list = appendElement('ul');
            var item = null;
            for (var i = 0; i != json.length; ++i) {
              if (item)
                item.innerHTML += ',';
              item = document.createElement('li');
              item.innerHTML += '<div class="key"><span></span></div>';
              impl(json[i], item);
              list.appendChild(item);
            }
            parent.appendChild(list);
            parent.innerHTML += '<span class="numberOfElements" data-item-count="' + json.length + '"></span>]';
          }
        } else {
          var keys = Object.keys(json);
          if (keys.length == 0) {
            parent.innerHTML += '{}';
            break;
          }
          parent.innerHTML += '{';
          var list = appendElement('ul');
          var item = null;
          for (var key of keys) {
            if (item)
              item.innerHTML += ',';
            item = document.createElement('li');
            item.innerHTML += '<div class="key"><span data-key-data="' + key + '">"' + key + '"</span></div>: ';
            impl(json[key], item);
            list.appendChild(item);
          }
          parent.appendChild(list);
          parent.innerHTML += '<span class="numberOfElements" data-item-count="' + keys.length + '"></span>}';
        }
        if (parent.tagName == 'LI') {
          parent.classList.add('folder', 'folded');
        }
        break;
      case 'array':
        parent.innerHTML += 'compound: ' + JSON.stringify(json);
        break;
      default:
        parent.innerHTML += 'unexpected: ' + JSON.stringify(json);
        break;
    }
  };
  var holder = document.createElement('div');
  holder.className = 'tree';
  impl(json, holder);
  for (var e of holder.querySelectorAll('li.folder > div.key > span')) {
    e.addEventListener('click', function () {
      this.parentElement.parentElement.classList.toggle('folded');
    });
  }
  for (var e of holder.querySelectorAll('.tooltip')) {
    e.addEventListener('transitionstart', function (e) {
      console.log(e);
    });
  }
  return holder;
}

function filterItems(pattern, parent, regexpErrorHandler) {
  parent = parent.querySelector('.tree');
  for (var e of parent.querySelectorAll('li.filterShow'))
    e.classList.remove('filterShow');
  for (var e of parent.querySelectorAll('span[data-key-data] mark:first-child')) {
    e = e.parentElement;
    e.innerHTML = '';
    e.textContent = '"' + e.dataset.keyData + '"';
  }
  for (var e of parent.querySelectorAll('span[data-value-data]  mark:first-child')) {
    e = e.parentElement;
    e.innerHTML = '';
    if (e.className == 'stringValue')
      e.textContent = '"' + e.dataset.valueData + '"'; // does necessary escaping for us
    else
      e.innerHTML = e.dataset.valueData;
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
  var getMarkedHTML = (text) => {
    if (!text)
      return null;
    var re = new RegExp(pattern, 'gi');
    var result = '';
    var lastIndex = 0;
    var lastMatch = '';
    var haveNonEmptyMatches = false;
    var appendLastMatchMarked = () => {
      if (lastMatch) {
        result += '<mark>' + escaped(lastMatch) + '</mark>';
        lastMatch = '';
        haveNonEmptyMatches = true;
      }
    };
    var match;
    while (match = re.exec(text)) {
      if (lastIndex != match.index) {
        appendLastMatchMarked();
        result += escaped(text.substring(lastIndex, match.index));
      }
      lastMatch += match[0];
      lastIndex = re.lastIndex;
    }
    appendLastMatchMarked();
    if (!haveNonEmptyMatches)
      return null;
    if (text.length != lastIndex)
      result += escaped(text.substring(lastIndex));
    return result;
  }

  for (var e of document.querySelectorAll('.tree li')) {
    var foundName = (() => {
      var nameElement = e.querySelector('div.key > *');
      if (nameElement.dataset.keyData) {
        var markedHTML = getMarkedHTML(nameElement.dataset.keyData);
        if (markedHTML) {
          nameElement.innerHTML = '"' + markedHTML + '"';
          return true;
        }
      }
      return false;
    })();
    var foundValue = (() => {
      var valueElement = e.querySelector('.stringValue, .numericValue, .nullValue');
      if (valueElement) {
        var markedHTML = getMarkedHTML(valueElement.dataset.valueData);
        if (markedHTML) {
          valueElement.innerHTML = valueElement.className == 'stringValue' ? '"' + markedHTML + '"' : markedHTML;
          return true;
        }
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