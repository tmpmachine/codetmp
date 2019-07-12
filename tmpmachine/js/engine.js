let L = console.log;
var waitDeploy = false;
var debugAttempUrl = '';

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
    blogsphereLogout: function() {
      
      $('#btn-blogsphere-login').style.display = 'block';
      $('#btn-blogsphere-logout').style.display = 'none';
      
      auth0.logout();
      aww.pop("You've been logged out from TMPmachine.");
      THOR.resetApp();
      
      fileClose();
      activeFolder = -1;
      while (breadcrumbs.length > 1)
        breadcrumbs.splice(1,1);
        
      loadBreadCrumbs();
    },
    blogsphereLogin: function() {
      auth0.login();
    },
    ready: function() {
            
      //
      //
      // buttons
      
      o.click({
        'btn-blog-vc':[function() {
          
          oblog.config({ blog: $('#in-blog-name').value });
          oblog.getBlogId(function(blogId) {
              
            window.open('https://www.blogger.com/rearrange?blogID='+blogId+'&action=editWidget&sectionId=main&widgetType=null&widgetId=HTML1')
              
          })
          
        }],
        'btn-blogsphere-login':[THOR.blogsphereLogin],
        'btn-blogsphere-logout':[THOR.blogsphereLogout],
        'btn-menu-template': [toggleInsertSnippet],
        'btn-reset': [function() {
          if (window.confirm('All data will be erased. Continue?'))
            THOR.resetApp();
        }],
        'btn-sync': [syncBlog],
        'btn-new-folder':[ui.fm.newFolder],
        'btn-rename-folder':[ui.fm.renameFolder],
        'btn-backup-revision': [function() {
          
          keepRevision();
          
        }],
        'btn-list-revisions': [function() {
          
          listRevisions();
          
        }],
        'btn-deploy': [chooseDeploy],
        'btn-delete-file': [function() {
          ui.fm.deleteFile(activeFile.fid);
        }],
        'btn-open-directory': [function() {
          openFolder(activeFile.parentFolderId);
          $('#btn-menu-project').click();
        }],
        'btn-download-file': [fileDownload],
        'btn-refresh-sync': [drive.syncFromDrive],
        'btn-save':[fileSave],
        
        '.btn-material': [ui.toggleMenu],
        '.osk': [function() {
            insertAtCaret('editor', this.textContent);
            $('#editor').env.editor.focus();
        }],
        'btn-preview':[function() {
          if (previewWindow === null || previewWindow.window === null || previewWindow.parent === null)
          {
            if ($('#in-blossem').value.trim().length > 0)
              previewWindow = window.open($('#in-blossem').value.trim(), 'blossem');
            else
              previewWindow = window.open('https://attemp.web.app/'+currentPage, 'preview');
          }
        
          renderBlog();
        }],
      });
      
      
      //
      //
      // auth
      
      auth0.onready = function() {
        
        $('#btn-blogsphere-login').style.display = 'none';
        $('#btn-blogsphere-logout').style.display = 'block';
        
        if (fs.data.rootId === '')
          drive.readAppData();
        else
        {
          drive.syncFromDrive();
          drive.syncToDrive();
        }
        
        $('#txt-login-status').textContent = 'Logout';
        $('#login-info').style.visibility = 'hidden';
      };
      
      auth0.onlogin = function() {
        
        $('#btn-blogsphere-login').style.display = 'none';
        $('#btn-blogsphere-logout').style.display = 'block';
      };
      
      auth0.onlogout = function(){
        $('#login-info').style.visibility = 'visible';
        
        $('#btn-blogsphere-login').style.display = 'block';
        $('#btn-blogsphere-logout').style.display = 'none';
        
        $('#txt-login-status').textContent = 'Login';
      };
      
      let rd = (location.href.includes('file:')) ? false : true;
      
      auth0.config({
        portal: 'portal-8177',
        line: 'TMPmachine',
        redirect: rd
      });
      oblog.connect(auth0);

      
      //
      //
      // update UI
      
      fileList();
      if (localStorage.getItem('homepage') == 'false')
      {
        $('#btn-home').click();
        $('#check-show').checked = false;
        $('#btn-home').classList.toggle('active', false)
        $('#btn-home').firstElementChild.classList.toggle('active', false)
      }
      else
      {
        $('#btn-home').classList.toggle('active', true)
        $('#btn-home').firstElementChild.classList.toggle('active', true)
      }

      document.body.removeChild($('#preload-style'));
      
      fixCss(function() {
        
        // load plugins here
        THOR.plugins.loadEditor(false);
        THOR.plugins.dragDrop();
        
        
        newTab();
        
        
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
    require('require/opopnomi.js'),
    require('require/odin.js'),
    require('require/auth0.js'),
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
    
    // if (location.href.includes('unplate.html'))
    plate.cook();
    // plate.tag = [];
        
    THOR.ready();
    
  }).catch( function(s) {
    console.log(s);
    console.log('Could not load one or more required file(s).');
  });
  
})();