let compoNotif = (function() {
  
  let $ = document.querySelector.bind(document);
  let $$ = document.querySelectorAll.bind(document);

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
    return local.notifInstance.add({
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