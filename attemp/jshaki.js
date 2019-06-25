function haki(input) {
  
  
  var debug = false;
  
  var coded = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  var coded2 = 'aa ab ac ad ae af ag ah ai aj ak al am an ao ap aq ar as at au av aw ax ay az aA aB aC aD aE aF aG aH aI aJ aK aL aM aN aO aP aQ aR aS aT aU aV aW aX aY aZ a0 a1 a2 a3 a4 a5 a6 a7 a8 a9 a0 ba bb bc bd be bf bg bh bi bj bk bl bm bn bo bp bq br bs bt bu bv bw bx by bz bA bB bC bD bE bF bG bH bI bJ bK bL bM bN bO bP bQ bR bS bT bU bV bW bX bY bZ b0 b1 b2 b3 b4 b5 b6 b7 b8 b9 b0 ca cb cc cd ce cf cg ch ci cj ck cl cm cn co cp cq cr cs ct cu cv cw cx cy cz cA cB cC cD cE cF cG cH cI cJ cK cL cM cN cO cP cQ cR cS cT cU cV cW cX cY cZ c0 c1 c2 c3 c4 c5 c6 c7 c8 c9 c0 da db dc dd de df dg dh di dj dk dl dm dn dp dq dr ds dt du dv dw dx dy dz dA dB dC dD dE dF dG dH dI dJ dK dL dM dN dO dP dQ dR dS dT dU dV dW dX dY dZ d0 d1 d2 d3 d4 d5 d6 d7 d8 d9 ea eb ec ed ee ef eg eh ei ej ek el em en eo ep eq er es et eu ev ew ex ey ez eA eB eC eD eE eF eG eH eI eJ eK eL eM eN eO eP eQ eR eS eT eU eV eW eX eY eZ e0 e1 e2 e3 e4 e5 e6 e7 e8 e9 fa fb fc fd fe ff fg fh fi fj fk fl fm fn fo fp fq fr fs ft fu fv fw fx fy fz fA fB fC fD fE fF fG fH fI fJ fK fL fM fN fO fP fQ fR fS fT fU fV fW fX fY fZ f0 f1 f2 f3 f4 f5 f6 f7 f8 f9 ga gb gc gd ge gf gg gh gi gj gk gl gm gn go gp gq gr gs gt gu gv gw gx gy gz gA gB gC gD gE gF gG gH gI gJ gK gL gM gN gO gP gQ gR gS gT gU gV gW gX gY gZ g0 g1 g2 g3 g4 g5 g6 g7 g8 g9 ha hb hc hd he hf hg hh hi hj hk hl hm hn ho hp hq hr hs ht hu hv hw hx hy hz hA hB hC hD hE hF hG hH hI hJ hK hL hM hN hO hP hQ hR hS hT hU hV hW hX hY hZ h0 h1 h2 h3 h4 h5 h6 h7 h8 h9 ia ib ic id ie if ig ih ii ij ik il im in io ip iq ir is it iu iv iw ix iy iz iA iB iC iD iE iF iG iH iI iJ iK iL iM iN iO iP iQ iR iS iT iU iV iW iX iY iZ i0 i1 i2 i3 i4 i5 i6 i7 i8 i9 ja jb jc jd je jf jg jh ji jj jk jl jm jn jo jp jq jr js jt ju jv jw jx jy jz jA jB jC jD jE jF jG jH jI jJ jK jL jM jN jO jP jQ jR jS jT jU jV jW jX jY jZ j0 j1 j2 j3 j4 j5 j6 j7 j8 j9'.split(' ');
  
  
  // x2 = []
  // for (let a of 'defghij')
  // {
  //   for (let x of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
  //   {
  //     x2.push(a+x)
  //   }
  // }
  // console.log(x2.join(' '))
  
  for (let c of coded2)
    coded.push(c);
  
  var cx = 0;
  
  var reser = 'var const this let event Image MediaRecorder requestAnimationFrame AudioContext location screen document TypeError Uint8Array Object Error Notification URL FormData localStorage Array undefined isArray of function console this null addEventListener false true window JSON RegExp forEach delete for removeEventListener fetch history switch self case break clearTimeout clearInterval continue setTimeout instanceof Number setInterval navigator Navigator new throw Math arguments do Date while parseInt indexedDB parseFloat return else in if alert prompt confirm Blob typeof'.split(' ');
  var proto = 'split ok arc fill origin orientation lock x y json PI requestPermission captureStream ondataavailable arrayBuffer onload sort fullscreenElement getBoundingClientRect duration type src currentTime exec execCommand userAgent backgroundSize mozFullScreenElement webkitFullscreenElement msFullscreenElement call marginLeft documentElement exitFullscreen mozCancelFullScreen webkitExitFullscreen msExitFullscreen requestFullscreen webkitRequestFullScreen play pause mozRequestFullScreen substring onstop revokeObjectURL start msRequestFullscreen hasOwnProperty marginRight innerText marginTop marginBottom margin padding paddingTop paddingLeft paddingRight paddingBottom webkitTransform abs transform defineProperty imageSmoothingEnabled deltaY deltaX type display canvas text indexedDB files contains includes openCursor clear strokeStyle pow cos sin asin value toBlob push pageX pageY length href onresize transform transformOrigin status onload state createObjectURL clearRect removeItem autoIncrement createObjectStore onupgradeneeded fillRect open fillStyle preventDefault rect checked then body head catch appendChild removeChild floor ceil fillpreventDefault Rect changedTouches identifier moveTo getContext top bottom right keyCode beginPath closePath drawImage stroke sqrt max min dataset lineTo getAttribute splice setItem getItem prototype onMessage firstElementChild lastElementChild left offsetLeft offsetRight offsetWidth offsetHeight width height indexOf match textContent style innerHTML createElement querySelector querySelectorAll classList click startsWith bind toggle className log stringify join parse apply setAttribute replace'.split(' ');
  
  var reserved = [];
  for (var x of reser)
    reserved.push({key: x, reserved: true});
  for (var x of proto)
    reserved.push({key: x, reserved: false});
  
  
  if (typeof(haki.v) == 'undefined')
    haki.v = [];
    
  var s = [];
  var p = 0;
  var t = input.split('');
  
  var log = console.log
  var varTree = [];
  var activeRoot = [0];
  var rootPointer = 0;
  var root = [];
  
  // limier
  var limitv = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890_'
  var limitn = '1234567890';
  
  //
  //
  //  functions
  
  function isReserved(varName) {
    for (let i=0; i<reserved.length; i++)
    {
      let x = reserved[i];
      if (x.key == varName)
        return {match: true, reserved: x.reserved}
    }
    
    return {match: false}
  }
  
  function replaceVarName(i, codedIdx, varName) {
    
    let start = i-varName.length;
    while (i > start)
    {
      i--;
      t[i] = ''
    }
  
    t[i] = coded[codedIdx]
    
  }
  
  function isRegex(i, follow) {
    
    switch (follow)
    {
      case '/':
        if (t[i] == '(' || t[i] == '+')
          return true;
        else if (t[i] == ' ')
          return isRegex(i-1, ' ');
        else
          return false;
      break;
        
      case ' ':
        if (t[i] == '='  || t[i] == '+')
          return true;
        else if (t[i] == ' ')
          return isRegex(i-1, ' ');
        else
          return false
      break;
    }
    
  }
  
  //
  //
  // begin read
  var isProto = false;
  var isLock1 = false;
  var isLock2 = false;
  var isLock3 = false;
  var isLock4 = false;
  var isLock5 = false;
  var isLock6 = false;
  
  var waitLock3 = false;
  var waitLock5 = false;
  var lockP = 0;
  for (let i=0; i<t.length; i++)
  {
      let c = t[i];
      
      if (isLock1)
      {
        if (c == "'")
          isLock1 = false;
        continue;
      }
      else if (isLock2)
      {
        if (c == '"')
          isLock2 = false;
        continue;
      }
      else if (isLock3)
      {
        if (lockP == 0)
        {
          if (c == '/')
          {
            isLock3 = false;
            isLock4 = true;
          }
          else if (c == '*')
          {
            isLock3 = false;
            isLock5 = true;
          }
          else
          {
            let itIs = isRegex(i-2, '/');
            if (itIs)
              lockP++;
            else
            {
              isLock3 = false;
              i--;
            }
          }
          continue;
        }
        else
        {
          if (c == '/')
          {
            if (waitLock3)
              waitLock3 = false
            else
            {
              isLock3 = false;
              waitLock3 = false;
              isLock6 = true;
            }
          }
          else if (c == '\\')
            waitLock3 = true
          else
          {
            if (waitLock3)
              waitLock3 = false
          }

          continue;
        }
      }
      else if (isLock4)
      {
        if (c == '\n')
          isLock4 = false;
        continue;
      }
      else if (isLock5)
      {
        if (c == '*')
          waitLock5 = true;
        else if (waitLock5)
        {
          if (c == '/')
          {
            isLock5 = false;
            waitLock5 = false;
          }
          else
            waitLock5 = false;
        }
        continue;
      }
      else if (isLock6)
      {
        if ('\n;+) '.indexOf(c))
          isLock6 = false;
        continue;
      }
      
      
      if (limitv.indexOf(c) >= 0)
      {
        if (p == 0 & limitn.indexOf(c) >= 0)
        {
          p = 0;
          s.length = 0;
        }
        else
        {
          s.push(c);
          p++;
        }
      }
      else // non variable name char
      {
        if (s.length > 0)
        {
          let varName = s.join('');
          let check = isReserved(varName)
          let operation = false;
          
          if ((check.match && (!check.reserved && !isProto)) || !check.match)
          {
            let codedIdx = haki.v.indexOf(varName);
            if (codedIdx < 0)
            {
              haki.v.push(varName);
              
              if (c == ':')
              {
                root = '';
                varTree[varTree.length-1] = [varTree[varTree.length-1]]
                varTree[varTree.length-1].push(varName)
              }
              else
                varTree.push(varName);
              
              replaceVarName(i, haki.v.length-1, varName);
              
            }
            else
            {
              root = varName;
              replaceVarName(i, codedIdx, varName);
            }
          }
          else if (check.match && isProto)
          {
            function inTree(root, varName, tree) {
              
              for (let name of tree)
              {
                if (Array.isArray(name))
                {
                  if (name[0] == root)
                    return true
                }
              }
              
              return false
            }
            
            if (inTree(root, varName, varTree))
            {
              let codedIdx = haki.v.indexOf(varName);
                replaceVarName(i, codedIdx, varName);
            }

            root = '';
          }
          
          if (isProto)
            isProto = false;
        }
  
        p = 0;
        s.length = 0;
        
        if (c == '.')
          isProto = true;
        else if (c == "'")
          isLock1 = true;
        else if (c == '"')
          isLock2 = true;
        else if (c == '/')
        {
          isLock3 = true;
          lockP = 0;
        }
      }
    
  }
  
  log(varTree)
  
  return t.join('');
}