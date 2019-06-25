THOR.plugins._add('dragDrop', function() {
  
  document.body.addEventListener('dragover', function(event) {
    event.preventDefault();
  });
  document.body.addEventListener('drop', function(event) {
    event.preventDefault();
    let reader = new FileReader();
    reader.onload = function() {
      $('#editor').env.editor.setValue(this.result);
    };
    reader.readAsText(event.dataTransfer.files[0]);
  });
  
});