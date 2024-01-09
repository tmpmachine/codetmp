let compoNotif = (function() {
  
  let SELF = {
    Init,
    Add,
    Reset,
    GetInstance,
  };

  let local = {
    notifInstance: null
  };

  function GetInstance() {
    return local.notifInstance;
  }

  function Add(options) {
    local.notifInstance.add({
      title: options.title,
      content: options.content,
    })
  }

  function Reset() {
    local.notifInstance.reset();
  }

  function Init() {
    local.notifInstance = Notifier($('#tmp-notif'), $('#notif-list'));
  }
  
  return SELF;
  
})();