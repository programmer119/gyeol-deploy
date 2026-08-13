document.querySelectorAll('a[href^="#"]').forEach((link)=>{link.addEventListener('click',(event)=>{const target=document.querySelector(link.getAttribute('href'));if(target){event.preventDefault();target.scrollIntoView({behavior:'smooth',block:'center'});}});});

const loginTrigger=document.getElementById('loginTrigger');
const loginDialog=document.getElementById('loginDialog');
const loginClose=document.getElementById('loginClose');

const setLoginDialog=(open)=>{
  if(!loginDialog)return;
  loginDialog.hidden=!open;
  document.body.classList.toggle('dialog-open',open);
  if(open)loginClose?.focus();
  else loginTrigger?.focus();
};

loginTrigger?.addEventListener('click',()=>setLoginDialog(true));
loginClose?.addEventListener('click',()=>setLoginDialog(false));
loginDialog?.addEventListener('mousedown',(event)=>{if(event.target===loginDialog)setLoginDialog(false);});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&loginDialog&&!loginDialog.hidden)setLoginDialog(false);});
