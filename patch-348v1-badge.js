(function(){
  if (window.__patch_348v1_badge__) return; window.__patch_348v1_badge__=true;
  function place(){
    if (document.getElementById('ver-badge-348v1')) return;
    const el = document.createElement('div');
    el.id='ver-badge-348v1';
    el.textContent='Versión: 348 v1';
    el.style.position='fixed'; el.style.top='10px'; el.style.right='12px';
    el.style.background='rgba(17,24,39,.85)'; el.style.color='#fff';
    el.style.padding='6px 10px'; el.style.borderRadius='10px'; el.style.fontSize='12px';
    el.style.zIndex='9999';
    document.body.appendChild(el);
  }
  if (document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', place,{once:true}); } else { place(); }
})();