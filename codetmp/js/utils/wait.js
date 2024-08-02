let wait = (function() {
  
  let SELF = {
    Until,
  };
  
  function Until(stateCheckCallback, delay=100, timeout=null) {
    
    let useTimeout = timeout !== null;
    delay = delay ?? 100;
    
    return new Promise((resolve, reject) => {
      let interval = window.setInterval(() => {
        let shouldResolve = stateCheckCallback();
        
        timeout -= delay;
        
        if (shouldResolve) {
          window.clearInterval(interval);
          resolve();
        } else if (useTimeout && timeout <= 0) {
          window.clearInterval(interval);
          reject();
        }
        
      }, delay);
    });
    
  }
  
  return SELF;
  
})();