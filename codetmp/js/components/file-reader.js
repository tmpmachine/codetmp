const fileReaderModule = (function() {

  let self = {
		init,
		readSingleUploadItem,
		uploadFile,
		OpenDirectory,
	};

	let activeDropZone;
	let isPressedCtrlKey = false;
	let isDragging = false;
	let isSupportSaveFile = ('showSaveFilePicker' in window) ? true : false;
	let dropTarget = '';
	let readQueue = [];
	const handlerType = {
		'notSet': -1,
		'default': 0, // all browsers, file only
		'webkitGetAsEntry': 1, // firefox, supports directory
		'getAsFileSystemHandle': 2, // chrome, supports directory
		defaultType: -1,
	};

	Object.defineProperty(this, 'HANDLER_TYPE', {
		get: () => {
			return handlerType.defaultType;
		},
		set: type => {
			if (handlerType[type] === undefined)
				console.log('HANDLER_TYPE not defined');
			else
				handlerType.defaultType = handlerType[type];
		}
	});

	function readSingleUploadItem(item) {
			HANDLER_TYPE = 'getAsFileSystemHandle';
			let parentId = activeFolder;
			let isPressedCtrlKey = false
			let queue = {
					items: [],
					isReading: false,
				};
				readQueue.push(queue);

			saveToStorage({
				queue,
				parentId,
				isPressedCtrlKey,
				entry: item,
	 			name: item.name,
				type: item.kind,
			});
	}

	function checkFileSystemHandleSupport(item) {
		return new Promise(resolve => {
			if ('getAsFileSystemHandle' in item) {
				resolve('getAsFileSystemHandle');
			} else {
				reject('default');
			}
		});
	}

	function checkGetAsEntrySupport(item) {
		return new Promise((resolve, reject) => {

			function resolver() {
		 		resolve('webkitGetAsEntry');
			}

			function errorHandler() {
	    		reject('default');
			}

			if ('webkitGetAsEntry' in item) {
				entry = item.webkitGetAsEntry();
				if (entry.isDirectory) {
				    let directoryReader = entry.createReader();
					directoryReader.readEntries(resolver, errorHandler);
			 	} else {
			 		entry.file(resolver, errorHandler);
				}
			} else {
				errorHandler();
			}
		});
	}

	function getContent(fileRef) {
		return new Promise(resolve => {
			fileRef.getFile().then(file => {
				file.text().then(resolve);
			});
		});
	}

	function isDir(type) {
		return (type == 'directory');
	}

	async function openOnEditor(data) {
		if (isDir(data.type))
			return;
		let fileRef = await getFileRef(data.entry);
		let content = await fileRef.text();
		let tabData = {
			content,
			fid: '-' + (new Date).getTime(),
			name: data.name,
			editor: compoEditor.Init(content),
			fileHandle: data.isPressedCtrlKey ? data.entry : null,
		};
		ui.openNewTab(-1, tabData);
	}

	function proceedNextQueueItem(item) {
		let queue = item.queue;
		
		fileStorage.save();
		drive.syncToDrive();
		fileManager.list();

		queue.isReading = false;
		if (queue.items.length > 0) {
			saveToStorage(queue.items.splice(0, 1)[0]);
		} else {
			readQueue.splice(0, 1);
			if (readQueue.length > 0) {
				queue = readQueue[0];
				saveToStorage(queue.items.splice(0, 1)[0]);
			}
		}
	}

	function delayResolve(resolve, param) {
		setTimeout(() => {
			resolve(param);
		}, 150);
	}

	function getFileRef(entry) {
		return new Promise(resolve => {
			if (HANDLER_TYPE == 1)
				entry.file(resolve);
			else if (HANDLER_TYPE == 2)
				entry.getFile().then(resolve);
		});
	}

	function handleItemFile(item) {

		new Promise (async resolve => {

			let fileRef = await getFileRef(item.entry);
			if (item.isPressedCtrlKey)
				fileRef.entry = item.entry;
			let existingItem = await fileManager.TaskGetExistingItem(item.name, item.parentId);
			if (existingItem) {

      			modal.confirm(`Item with the same name already exists. Overwrite? (${truncate(item.name)})`).then(async () => {

					  if (activeWorkspace == 2) {
						// rewrite the content of existing file
						if (helper.hasFileReference(existingItem.fileRef)) {
							let fileHandle = await existingItem.fileRef.entry;
							const writable = await fileHandle.createWritable();
							await writable.write(fileRef);
							await writable.close();
						}
					} else {
						existingItem.fileRef = fileRef;
						delete existingItem.blob;
						existingItem.loaded = true;
						fileManager.sync({
							fid: existingItem.fid, 
							action: 'update',
							metadata: ['media'], 
							type: 'files',
							isTemp: true,
						});
					}
					delayResolve(resolve, item);

				}).catch(() => {
					delayResolve(resolve, item);
				});

			} else {

				let file = await fileManager.CreateFile({
				    fileRef,
				    content: null,
				    name: item.name,
				    parentId: item.parentId,
				    isTemp: true,
				});
				ui.tree.appendFile(file);
				fileManager.sync({
					fid: file.fid, 
				    action: 'create', 
				    type: 'files',
				    isTemp: true,
				});
				resolve(item);
			}

		}).then(proceedNextQueueItem);
	}

	async function handleItemDirectory(item) {
		let folder = await fileManager.TaskGetExistingItem(item.name, item.parentId, 'folder');
		if (folder === null) {
			folder = await fileManager.CreateFolder({
			    parentId: item.parentId,
			    name: item.name,
			});
			ui.tree.appendFolder(folder);
			fileManager.sync({
				fid: folder.fid, 
			    action: 'create', 
			    type: 'folders',
			});
		}

		new Promise(resolve => {
			readDirectoryEntries(item.entry, folder.fid, item.queue, item.isPressedCtrlKey, resolve);
		}).then(() => {
			proceedNextQueueItem(item);
		});
	}

	async function readEntries(entry, parentId, queue, isPressedCtrlKey, resolve) {
	  	let item = await entry.next();
	  	if (!item.done) {
	  		item.value[1].isPressedCtrlKey = isPressedCtrlKey;
			  getFileContent(item.value[1], parentId, queue, false).then(saveToStorage);
	    	readEntries(entry, parentId, queue, isPressedCtrlKey, resolve);
	  	} else {
	  		resolve();
	  	}
	}

	function scanDirEntries(entry, parentId, queue, isPressedCtrlKey, resolve) {
		let directoryReader = entry.createReader();
		directoryReader.readEntries(entries => {
	    	for (let i=0; i<entries.length; i++) {
	    		entries[i].isPressedCtrlKey = isPressedCtrlKey;
		  		getEntryContent(entries[i], parentId, queue, false).then(saveToStorage);
	    	}
	    	resolve();
	    });
	}

	async function readDirectoryEntries(entry, parentId, queue, isPressedCtrlKey, resolve) {
		if (HANDLER_TYPE == 1) {
			scanDirEntries(entry, parentId, queue, isPressedCtrlKey, resolve);
		} else if (HANDLER_TYPE == 2) {
			let entries = await entry.entries();
			readEntries(entries, parentId, queue, isPressedCtrlKey, resolve);
		} else {
			resolve();
		}
	}

	function proceedQueueItem(item) {
		if (item.type == 'file')
			handleItemFile(item);
		else if (item.type == 'directory')
			handleItemDirectory(item);
	}

	function saveToStorage(item) {
		let queue = item.queue;
		if (queue.isReading || readQueue.length > 1) {
			queue.items.push(item);
		} else {
			queue.isReading = true;
			proceedQueueItem(item);
		}
	}

	function getFileContent(item, parentId, queue, isDataTransferItem = true) {
  	return new Promise(async resolve => {
  		let entry = item;
  		if (isDataTransferItem) {
	  		entry = await item.getAsFileSystemHandle();
  		}
			resolve({
				queue,
				parentId,
				entry,
	 			name: entry.name,
				type: entry.kind,
				isPressedCtrlKey: item.isPressedCtrlKey,
			});	
  	})
	}

	function getEntryContent(item, parentId, queue, isDataTransferItem = true) {
		return new Promise(resolve => {
			let entry = item;
			if (isDataTransferItem)
				entry = item.webkitGetAsEntry();
			entry.type = item.type;
			resolve({
				queue,
				parentId,
				entry, 
	 			name: entry.name,
				type: entry.isFile ? 'file' : 'directory',
				isPressedCtrlKey: item.isPressedCtrlKey,
			});
		})
	}

	function getAsEntry(items, callback, parentId, queue, isPressedCtrlKey) {
		for (let item of items) {
			if (item.kind == 'file') {
				item.isPressedCtrlKey = isPressedCtrlKey;
		  		getEntryContent(item, parentId, queue).then(callback);
			}
		}
	}

	function getAsFileSystemHandle(items, callback, parentId, queue, isPressedCtrlKey) {
		for (let item of items) {
			if (item.kind == 'file') {
				item.isPressedCtrlKey = isPressedCtrlKey;
	  		getFileContent(item, parentId, queue).then(callback);
	  	}
		}
	}

	function setSupportedFileHandler(items) {
		return new Promise(resolve => {
		  if (HANDLER_TYPE === -1) {
		  	checkFileSystemHandleSupport(items[0])
		  	.then(resolve)
		  	.catch(() => {
			  	checkGetAsEntrySupport(items[0])
			  	.then(resolve)
			  	.catch(resolve);
		  	});
		  } else {
		  	resolve();
		  }
		});
	}

	function getAsDropItems() {
		aww.pop('No supported file handler at the moment');
	}

	function readTransferItems(items, dropTarget, isPressedCtrlKey) {
		if (items[0].kind != 'file')
			return;

	  	setSupportedFileHandler(items).then(type => {
	  		if (type !== undefined)
				HANDLER_TYPE = type;
			let parentId = activeFolder;
			
			let callback = (dropTarget == 'editor') ? openOnEditor : saveToStorage;
			let queue;

			if (dropTarget == 'explorer') {
				queue = {
					items: [],
					isReading: false,
				};
				readQueue.push(queue);
			}
			
  		switch (HANDLER_TYPE) {
    		case 1: 
    		  getAsEntry(items, callback, parentId, queue, isPressedCtrlKey);
    		  break;
    		case 2: 
    		  getAsFileSystemHandle(items, callback, parentId, queue, isPressedCtrlKey);
    		  break;
    		default:
    		  getAsDropItems(items, callback, parentId, queue, isPressedCtrlKey);
    	}
		});
	}

	function handleEditorDrop(e, target, isPressedCtrlKey) {
		readTransferItems(e.dataTransfer.items, target, isPressedCtrlKey);
	}

	function changeDropMessage() {
		let message = activeDropZone.dataset.message;
		if (isPressedCtrlKey) {
			if (message == '1') {
				activeDropZone.dataset.message = '2';
				activeDropZone.innerHTML = '';
				activeDropZone.append($('#msg-drop-edit-mode').content.cloneNode(true));
			}
		} else {
			if (message == '2') {
				activeDropZone.dataset.message = '1';
				activeDropZone.innerHTML = '';
				activeDropZone.append($('#msg-drop-zone').content.cloneNode(true));
			}
		}
	}

	// function keyHandler(e) {
	// 	if (e.type == 'keydown' && e.keyCode == 17) {
	// 		clearTimeout(keyHandler.timeout);
	// 		isPressedCtrlKey = true;
	// 		changeDropMessage()
	// 	} else {
	// 		clearTimeout(keyHandler.timeout);
	// 		keyHandler.timeout = setTimeout(function() {
	// 			isPressedCtrlKey = false;
	// 			changeDropMessage()
	// 		}, 50);
	// 	}
	// }

	function showDropZone(dropZone) {
		changeDropMessage()
		dropZone.classList.toggle('w3-hide', false);
		// if (isSupportSaveFile) {
			// window.addEventListener('keydown', keyHandler);
			// window.addEventListener('keyup', keyHandler);
			// $('.Helpnote', dropZone)[0].classList.toggle('w3-opacity', !document.hasFocus());
			// $('.Helpnote', dropZone)[1].classList.toggle('w3-hide', document.hasFocus());
		// }
	}

	function hideDropZone(dropZone) {
		dropZone.classList.toggle('w3-hide', true);
		// if (isSupportSaveFile) {
			// window.removeEventListener('keydown', keyHandler);
			// window.removeEventListener('keyup', keyHandler);
		// }
	}

	function handleExplorerDrop(e, target, isPressedCtrlKey) {
		readTransferItems(e.dataTransfer.items, target, isPressedCtrlKey);
	}

  function truncate(name) {
    if (name.length > 30)
      name = name.slice(0, 30) + '...';
    return name;
  }

  function preventDefault(e) {
  	e.preventDefault();
  }

	function initDragDropZone(target, dragZone) {
		let dropZone = $('.drop-zone[data-target="'+target+'"]')[0];
		if (isSupportSaveFile)
			dropZone.append($('#msg-drop-zone').content.cloneNode(true));
		else
			dropZone.append($('#msg-drop-zone-no-edit').content.cloneNode(true));
		dropZone.addEventListener('drop', preventDefault);
		dropZone.addEventListener('dragover', preventDefault);
		dragZone.addEventListener('dragover', preventDefault);
		dragZone.addEventListener('dragenter', () => {
			isDragging = true;
			// isPressedCtrlKey = false;
			isPressedCtrlKey = (ui.states.storage == constant.STORAGE_STATE.FileSystem);
			activeDropZone = dropZone;
			showDropZone(dropZone);
		});

		dropZone.addEventListener('drop', e => {
			hideDropZone(dropZone);
			if (target == 'editor')
				handleEditorDrop(e, target, isPressedCtrlKey);
			else if (target == 'explorer')
				handleExplorerDrop(e, target, isPressedCtrlKey);
			isDragging = false;
			// isPressedCtrlKey = false;
		});
		dropZone.addEventListener('dragleave', () => {
			hideDropZone(dropZone);
			// isPressedCtrlKey = false;
			isDragging = false;
		});
	}

	function init() {
		initDragDropZone('editor', $('#editor-wrapper'));
		initDragDropZone('explorer', $('#in-my-files-drop-zone'));
	}

	async function uploadFile(self) {
		let f = self.files[0];
		let file = await fileManager.CreateFile({
		    fileRef: f,
		    content: null,
		    name: f.name,
		    parentId: activeFolder,
		    isTemp: true,
		});
		ui.tree.appendFile(file);

		fileManager.sync({
			fid: file.fid, 
		    action: 'create', 
		    type: 'files',
		    isTemp: true,
		});
		fileStorage.save();
		drive.syncToDrive();
		fileManager.list();
		self.value = '';
	}

	Object.defineProperty(self, 'isDragging', {
		get: () => isDragging,
	});
	
	async function OpenDirectory(mode = "read") {
	  
    let directoryStructure;

    // Recursive function that walks the directory structure.
    const getFiles = async (dirHandle, parentFolderFid) => {
		
      const dirs = [];
      const files = [];

		// create the root directory
		if (parentFolderFid == -1 && !dirHandle.name.startsWith('.git')) {
			let folder = await fileManager.CreateFolder({
				parentId: parentFolderFid,
				name: dirHandle.name,
				directoryHandle: dirHandle,
			});
			ui.tree.appendFolder(folder);
			parentFolderFid = folder.fid;

			dirs.push(folder);
		}
		
		
		// iterate through subdirectories and files
      for await (const entry of dirHandle.values()) {
          if (entry.kind === "file") {

			let isStoreWriteable = false;

			let fileRef = await entry.getFile();
			fileRef.entry = entry;
			
			let file = await fileManager.CreateFile({
				fileRef,
				content: null,
				name: entry.name,
				parentId: parentFolderFid,
				isTemp: true,
			}, activeWorkspace, isStoreWriteable);
			
			ui.tree.appendFile(file);
          
        } else if (entry.kind === "directory") {
          
          if (entry.name.startsWith('.git')) {
            continue;
          }
		  
          let folder = await fileManager.CreateFolder({
  			    parentId: parentFolderFid,
				parentDirectoryHandle: dirHandle,
  			    name: entry.name,
		  });
    	  ui.tree.appendFolder(folder);
          
          dirs.push(getFiles(entry, folder.fid));
        } 
      }
      return [
        ...(await Promise.all(dirs)).flat(),
        ...(await Promise.all(files)),
      ];
    };

    try {
      // Open the directory.
      const handle = await showDirectoryPicker({
        mode,
      });
      // Get the directory structure.
	  let parentFolderId = -1; // root
      directoryStructure = await getFiles(handle, parentFolderId);
      fileManager.list();
    } catch (err) {
      if (err.name !== "AbortError") {
        logStackTrace(err);
        // console.error(err.name, err.message);
      }
    }
    
  }
  
  function logStackTrace(error) {
    if (error && error.stack) {
      const stackLines = error.stack.split('\n').slice(1);
      const formattedStack = stackLines.map((line) => {
        const matches = line.match(/((?:http|https):\/\/[^\s]+)/);
        if (matches && matches.length > 0) {
          const url = matches[0];
          const path = url.replace(window.location.origin, '');
          return `at ${path}`;
        }
        return line;
      });
  
      console.log('StackTrace:');
      console.log(formattedStack.join('\n'));
    }
  }

	return self;

})();