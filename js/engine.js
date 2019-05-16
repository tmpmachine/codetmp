var waitDeploy = false;

const THOR = (function() {
  return {
    plugins: {
      _add: function(name, func) {
        THOR.plugins[name] = func;
      }
    },
    resetApp: function() {
      fs.reset();
      fs.save();
      
      fileList();
    },
    blogsphereLogin: function() {
      if (this.textContent == 'Login')
        oblog.login();
      else
      {
        if (window.confirm('Logout from Blogsphere?'))
        {
          oblog.logout();
          aww.pop("You've been logged out from Blogsphere.");
          THOR.resetApp();
          
          fileClose();
          activeFolder = -1;
          while (breadcrumbs.length > 1)
            breadcrumbs.splice(1,1);
            
          loadBreadCrumbs();
        }
      }
    },
    ready: function() {
      // initial setup
      document.body.removeChild($('#preload-style'));

      fileList();

      o.click({
        // feature
        'btn-blogsphere-login':[THOR.blogsphereLogin],
        'btn-menu-template': [toggleInsertSnippet],
        'btn-reset': [function() {
          if (window.confirm('All data will be erased. Continue?'))
            THOR.resetApp();
        }],
        'btn-fullscreen': [toggleFullScreen],
        'btn-sync': [syncBlog],
        'btn-classic-editor': [function() {
          if (this.textContent === 'Enable')
          {
            THOR.plugins.loadEditor(true);
            this.textContent = 'Disable';
          }
          else
          {
            THOR.plugins.loadEditor(false);
            this.textContent = 'Enable';
            $('#editor-wrapper').style.height = 'calc(100% - '+$('#file-title').offsetHeight+'px)';
          }
          $('#my-osk').classList.toggle('hide');
        }],

        // files
        'btn-new-folder':[ui.fm.newFolder],
        'btn-rename-folder':[ui.fm.renameFolder],
        // 'btn-edit': [fileRename],
        'btn-deploy': [chooseDeploy],
        'btn-delete-file': [function() {
          ui.fm.deleteFile(activeFile.fid);
        }],
        'btn-download-file': [fileDownload],
        'btn-refresh-sync': [drive.syncFromDrive],
        'btn-save':[fileSave],
        
        // sidebar
        '.btn-material': [ui.toggleMenu],
        '.osk': [function() {
          if (this.textContent === '~')
            insertAtCaret('editor', '\t');
          else
            insertAtCaret('editor', this.textContent);
        }],
        'btn-preview':[function() {
          if (previewWindow === null || previewWindow.window === null || previewWindow.parent === null)
            previewWindow = window.open('preview.html'+currentPage, 'preview');
        
          renderBlog();
        }],
      });
      
      
      oblog.onready = function(){
        $('#btn-blogsphere-login').textContent = 'Logout';
        
        if (fs.data.rootId === '')
          drive.readAppData();
        else
        {
          drive.syncFromDrive();
          drive.syncToDrive();
        }
      };
      
      oblog.onlogin = function() {
          
      };
      
      oblog.onlogout = function(){
        $('#btn-blogsphere-login').textContent = 'Login';
      };
      
      oblog.config({
        blog:'tmpmachine7',
        portal:'portal-8177',
        line:'Portal 2',
      });
      
      
      
      fixCss(function() {
        // load plugins here
        THOR.plugins.loadEditor(false);
        THOR.plugins.dragDrop();
        
        let el = o.cel('div', {
          innerHTML: o.creps('tmp-file-tab', {
            fid: '-1',
            name: 'Untitled File'
          })
        })
        
        el.firstElementChild.lastElementChild.style.background = '#154358';
        $('#file-title').appendChild(el.firstElementChild)
        
        
        if ($('#btn-save').offsetWidth > 100)
        {
          document.head.appendChild( o.cel('link', {
            rel: 'stylesheet',
            href: 'fonts/material/material-icons.css'
          }) );
        }
        
      });
    }

  }; // END of THOR return statement
})();




(function() {
  
  const require = function(url) {
    return new Promise(function(resolve, reject) {
      var el;
      if (url.includes('.css'))
      {
        el = document.createElement('link');
        el.setAttribute('href', url);
        el.setAttribute('rel', 'stylesheet');
      }
      else
      {
        el = document.createElement('script');
        el.setAttribute('src', url);
      }
      
      el.onload = function() {
        resolve(url);
      };
      el.onerror = function() {
        reject(url);
      };
      document.head.appendChild(el);
    });
  };
  
  Promise.all([
    require('require/lsdb.js'),
    require('require/plate.js'),
    require('require/o.js'),
    require('require/odin.js'),
    require('require/oblog.js'),
    require('require/aww.js'),
    require('require/w3-4.10.css'),
    
    require('js/idb.js'),
    require('js/THOR.js'),
    require('js/THOR-data.js'),
    require('js/ux.js'),
    require('js/file-manager.js'),
    require('js/drive.js'),
    require('js/debug.js'),
    require('js/template.js'),
    
    require('ace/ace.js'),
    require('plugins/custom-editor-init.js'),
    require('plugins/drag-drop.js'),
  ]).then( function() {
    
    plate.tag.push(
    {
      short: ' ',
      attributes: {
        class: 'w3-row'
      }
    });
    plate.cook();
    // plate.tag = [];
        
    THOR.ready();
    
  }).catch( function(s) {
    console.log(s);
    console.log('Could not load one or more required file(s).');
  });
  
})();