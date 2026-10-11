(function(){
  var burger=document.getElementById('shBurger'), nav=document.getElementById('shNav');
  if(!burger||!nav) return;
  var open=false;
  var industries=['hvac','plumbing','roofing','tree-service'];
  var articles=['google-maps-seo-vs-seo-strategy','google-maps-ranking-factors','how-many-reviews-google-maps-ranking','service-area-business-google-maps-ranking','how-lsa-ranking-works','lsa-budget-not-spending','missed-calls-lsa-performance'];
  var path=location.pathname.replace(/\.html$/,'').replace(/\/+$/,'')||'/';
  var key=(path==='/'||path==='/index')?'/':path.replace(/^\//,'');
  var target=industries.indexOf(key)>-1?'services':articles.indexOf(key)>-1?'blog':key;
  nav.querySelectorAll('a[data-page]').forEach(function(a){
    if(a.getAttribute('data-page')===target){a.classList.add('active');a.setAttribute('aria-current','page');}
  });
  function setOpen(v){
    open=v; nav.classList.toggle('open',v);
    burger.setAttribute('aria-expanded',v?'true':'false');
    burger.setAttribute('aria-label',v?'Close menu':'Open menu');
    var b=burger.querySelectorAll('span');
    b[0].style.transform=v?'rotate(45deg) translate(4.5px,4.5px)':'';
    b[1].style.opacity=v?'0':'';
    b[2].style.transform=v?'rotate(-45deg) translate(4.5px,-4.5px)':'';
    document.body.style.overflow=v?'hidden':'';
  }
  burger.addEventListener('click',function(){setOpen(!open);});
  nav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){if(open)setOpen(false);});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&open)setOpen(false);});
  window.addEventListener('resize',function(){if(open&&window.innerWidth>1180)setOpen(false);});
})();
