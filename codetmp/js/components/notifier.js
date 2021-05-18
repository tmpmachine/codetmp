// v0.0 -- 5 May 2021 by tmpmachine

function Notifier(templateNode, wrapperNode) {
    
    let pool = [];
    let uidCounter = 0;
    let activeNotif = 0;

    function Notif() {
      
      let data = {
        id: 0,
        title: '',
        content: '',
        isRemoved: false,
        isDone: false,
        timestamp: new Date().toTimeString().slice(0,5),
      };
      
      return data;
    }
    
    function list() {
      wrapperNode.innerHTML = '';
      let wrapper = document.createDocumentFragment();
      let count = 0;
      for (let i=pool.length-1; i>=0; i--) {
        let notif = pool[i];
        if (notif.isRemoved) {
          pool.splice(i,1)
          i++;
        } else {
          let node = templateNode.content.cloneNode(true);
          $('.Timestamp', node)[0].innerHTML = notif.timestamp;
          $('.Title', node)[0].innerHTML = notif.title;
          $('.Content', node)[0].innerHTML = notif.content;
          wrapper.append(node);
        }
        count++;
        if (count == 50)
          break;
      }

      if (pool.length === 0) {
        let node = templateNode.content.cloneNode(true);
        $('.Title', node)[0].innerHTML = 'No running tasks';
        wrapper.append(node);
      }

      wrapperNode.append(wrapper);
      updateCounter();
    }
    
    var el = document.querySelector('.notif-button');

    function updateCounter() {
        el.setAttribute('data-count', activeNotif);
        el.classList.remove('notify');
        el.offsetWidth = el.offsetWidth;
        el.classList.add('notify');
        el.classList.toggle('show-count', activeNotif > 0);
    }

    function add(data = {}) {
      let notif = Notif();
      for (let key in notif) {
        if (typeof(data[key]) != 'undefined') {
          notif[key] = data[key];
        }
      }
      notif.id = uidCounter;
      uidCounter++;
      activeNotif++;
      pool.push(notif);
      list();
      return notif.id;
    }
    
    function update(uid, data, isDone) {
      let isUpdated = false;
      for (let i=pool.length-1; i>=0; i--) {
        let notif = pool[i];
        if (notif.id === uid) {
          for (let key in notif) {
            if (typeof(data[key]) != 'undefined') {
              notif[key] = data[key];
            }
          }
          if ((isDone && !notif.isDone) || notif.isRemoved) {
            notif.isDone = true;
            activeNotif--;
          }
          isUpdated = true;
          break;
        }
      }
      if (isUpdated)
        list();
    }
    
    function remove(uid) {
      update(uid, {isRemoved:true});
      list();
    }

    function reset() {
      pool.length = 0;
      activeNotif = 0;
      list();
    }
    
    let $ = function(selector, node=document) { let nodes = node.querySelectorAll(selector); return selector.startsWith('#') ? nodes[0] : nodes };
    
    list();

    let self = {
      add,
      update,
      remove,
      reset,
    };

    return self;
  }