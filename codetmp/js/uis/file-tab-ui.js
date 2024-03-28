let uiFileTab = (function() {
  
    let SELF = {
      HandleClick,
      CreateElement,
    };
    
    function handleClickActions(evt, data) {
        switch (evt.button) {
            case 1: handleMiddleClick(data); break;
        }
    }

    function CreateElement(data) {
        let el = o.element('div', {
            innerHTML: o.template('tmp-file-tab', data)
        })

        el.querySelector('[data-kind="itemFileTab"]').dataset.fid = data.fid;

        return el;
    }

    function handleMiddleClick(data) {
        tabManager.FileClose(`${data.fid}`)
    }
    
    function HandleClick(evt) {
        let targetEl = evt.target;
        let itemEl = targetEl?.closest('[data-kind="itemFileTab"]');

        if (!itemEl) return;
        
        let data = {
            fid: itemEl.dataset.fid,
        };

        handleClickActions(evt, data);
    }
    
    return SELF;
    
  })();