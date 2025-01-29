/* v1.3 */
export { loadScripts };

function loadScripts(components = TypeComponents() ?? []) {
  let loadIndex = -1;
  loadComponents(components, loadIndex);
}

function loadComponents(components, index) {
  if (index >= 0 && components[index].callback) {
    components[index].callback();
  }
  index++;
  if (index < components.length) {
    loadExternalFiles(components[index].urls, components[index].type).then(() => {
      loadComponents(components, index);
    });
  }
}

function requireExternalFiles(url, type) {
  return new Promise((resolve, reject) => {
    let el;
    el = document.createElement('script');
    el.setAttribute('src', url);
    if (type) {
      el.setAttribute('type', type);
    }
    el.onload = () => resolve(url);
    el.onerror = () => reject(url);
    document.head.appendChild(el);
    el.remove();
  });
}

function loadExternalFiles(URLs, type) {
  return new Promise(resolve => {
    let bundleURL = [];
    if (URLs) {
      for (let URL of URLs) {
        bundleURL.push(requireExternalFiles(URL, type));
      }
    }
    Promise.all(bundleURL).then(() => {
      resolve();
    }).catch(error => {
      console.log(error);
      console.log('Could not load one or more required file(s).');
    });
  });
}


// #region # types

/**
@typedef {Object} TypeComponent
@property {Array} [urls] 
@property {Function} [callback] 
*/

/** @returns {TypeComponent|null} */ let TypeComponent = () => null  
/** @returns {TypeComponent[]|null} */ let TypeComponents = () => null  

// #endregion