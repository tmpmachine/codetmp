let uiFileTab = (function() {
  
    let SELF = {
      HandleClick,
      CreateElement,
      HandleContextMenu,
    };
    
    function handleClickActions(evt, action, data, itemEl) {
        switch (evt.button) {
            case 0 : handleClickAction(action, data); break;
            case 1: handleMiddleClick(data); break;
        }
    }

    function openTabInExplorer(itemEl) {
        if (itemEl.dataset.parentId === '') return;

        let parentId = parseInt(itemEl.dataset.parentId);
        compoFileTab?.openDirectory(parentId);
    }

    function handleClickAction(action, data) {
        switch (action) {
            case 'close': compoFileTab.FileClose(data.fid); break;
            default: {
                let isRevealFileTree = true;
                compoFileTab.focusTab(data.fid, isRevealFileTree); 
            }
            break;
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
        compoFileTab.FileClose(`${data.fid}`)
    }
    
    function HandleClick(evt) {
        let targetEl = evt.target;
        let itemEl = targetEl?.closest('[data-kind="itemFileTab"]');
        let actionEl = targetEl?.closest('[data-action]');
        let action = actionEl?.dataset.action;

        if (!itemEl) return;
        
        let data = {
            fid: itemEl.dataset.fid,
        };

        handleClickActions(evt, action, data, itemEl);
    }

    function HandleContextMenu(evt) {        
        let targetEl = evt.target;
        let itemEl = targetEl?.closest('[data-kind="itemFileTab"]');
        
        if (!itemEl) return;

        evt.preventDefault();
        openTabInExplorer(itemEl);
    }
    
    return SELF;
    
  })();