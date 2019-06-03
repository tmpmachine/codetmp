const THORdata = {
  root: {
    blogId: '',
    settings:{
      maxPosts:25,
    },
    blog:{
      refresh:false,
      title: '',
      blogId: '',
      homepageUrl: location.origin+location.pathname.replace('THOR-B.html', 'preview.html'),
      searchUrl: location.origin+location.pathname.replace('THOR-B.html', 'preview.html')
    },
    view: {
      description:'',
    },
    posts:[],
    labels:[],
    links:[],
    updated:'',
  },

  links: {
    title:'',
    href:''
  },
  labels: {
    name:'',
    count:0,
    url:''
  },
  posts: {
    id:'',
    title:'',
    body:'',
    snippets:{
      short:'',
      long:''
    },
    url:'',
    date:'',
    author:{
      name:'',
      authorPhoto:{
        image:''
      }
    },
    featuredImage:'',
    labels:[]
  }
};


const fs = new lsdb('B-THOR-fs', {
  root: {
    rootId: '',
    files: [],
    folders: [],
    blogs: [],
    sync: [],
    counter: {
      files: 0,
      folders: 0
    }
  },

  blogs: {
    name: '',
    id: ''
  },
  folders:{
    fid: 0,
    parentId: -1,
    
    id: '',
    name: '',
    description: '',
    modifiedTime: '',
    trashed: false,
  },
  files: {
    fid: 0,
    parentId: -1,
    modifiedTime: '',
    isLock: false,
    loaded: false,
    
    id: '',
    name: '',
    content: '',
    description: '',
    trashed: false,
    
    revisions: [{
      id: 'latest',
      name: 'Latest'
    }]
  },
  revisions: {
    id: '',
    name: ''
  },
  sync: {
    action: '',
    fid: -1,
    source: -1,
    metadata: [],
    type: '',
  },
});

var breadcrumbs = [{folderId:'-1',title:'My Files'}];
var activeFile;
var doubleClick = false;
var lastClickEl;