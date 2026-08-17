const API_BASE='https://gyeol-api.suaveforge.com';
const REVIEW_ACCOUNTS={
  USER:{email:'client.user@gyeol.suaveforge.com',password:'GyeolClient!2026'},
  ADMIN:{email:'client.admin@gyeol.suaveforge.com',password:'GyeolAdmin!2026'},
};

const loginTrigger=document.getElementById('loginTrigger');
const heroLoginTrigger=document.getElementById('heroLoginTrigger');
const loginDialog=document.getElementById('loginDialog');
const loginClose=document.getElementById('loginClose');
const roleTabs=[...document.querySelectorAll('.role-tab')];
const authForm=document.getElementById('authForm');
const authModeRow=document.getElementById('authModeRow');
const authModeTitle=document.getElementById('authModeTitle');
const authModeToggle=document.getElementById('authModeToggle');
const authEmail=document.getElementById('authEmail');
const authPassword=document.getElementById('authPassword');
const authConfirmPassword=document.getElementById('authConfirmPassword');
const confirmField=document.getElementById('confirmField');
const agreementField=document.getElementById('agreementField');
const authAgreement=document.getElementById('authAgreement');
const authError=document.getElementById('authError');
const authSubmit=document.getElementById('authSubmit');
const reviewEmail=document.getElementById('reviewEmail');
const reviewPassword=document.getElementById('reviewPassword');
const reviewFill=document.getElementById('reviewFill');
const dialogFootnote=document.getElementById('dialogFootnote');

let role='USER';
let mode='LOGIN';
let submitting=false;

function setError(message=''){
  authError.textContent=message;
  authError.hidden=!message;
}

function setDialog(open){
  if(!loginDialog)return;
  loginDialog.hidden=!open;
  document.body.classList.toggle('dialog-open',open);
  if(open){setTimeout(()=>authEmail?.focus(),50);}else{loginTrigger?.focus();}
}

function renderAuthState(){
  const signup=mode==='SIGNUP'&&role==='USER';
  roleTabs.forEach((tab)=>{
    const selected=tab.dataset.role===role;
    tab.classList.toggle('active',selected);
    tab.setAttribute('aria-selected',String(selected));
  });
  authModeRow.hidden=role==='ADMIN';
  authModeTitle.textContent=signup?'새 계정 만들기':'보유한 계정으로 로그인';
  authModeToggle.textContent=signup?'로그인으로 돌아가기':'회원가입';
  confirmField.hidden=!signup;
  agreementField.hidden=!signup;
  authPassword.autocomplete=signup?'new-password':'current-password';
  authConfirmPassword.required=signup;
  authAgreement.required=signup;
  authSubmit.textContent=signup?'회원가입':'로그인';
  const review=REVIEW_ACCOUNTS[role];
  reviewEmail.textContent=review.email;
  reviewPassword.textContent=review.password;
  dialogFootnote.textContent=role==='ADMIN'
    ?'관리자는 발급된 계정으로만 로그인할 수 있으며 공개 회원가입은 제공하지 않습니다.'
    :'일반 사용자는 로그인과 회원가입 모두 가능합니다. 검수 계정은 클라이언트 기능 확인용입니다.';
  setError('');
}

async function jsonRequest(path,options={}){
  const response=await fetch(`${API_BASE}${path}`,{
    ...options,
    headers:{'Content-Type':'application/json',...(options.headers||{})},
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok){
    const code=payload.code||`HTTP_${response.status}`;
    const messages={
      INVALID_EMAIL_OR_PASSWORD:'이메일 또는 비밀번호가 맞지 않습니다.',
      EMAIL_ALREADY_REGISTERED:'이미 가입된 이메일입니다.',
      ACCOUNT_NOT_ACTIVE:'현재 사용할 수 없는 계정입니다.',
    };
    throw new Error(messages[code]||'요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  return payload;
}

function openUserApp(payload){
  const user=payload.user||{};
  sessionStorage.setItem('gyeolWebSessionHandoff',JSON.stringify({
    accessToken:String(payload.accessToken||''),
    refreshToken:String(payload.refreshToken||''),
    userId:String(user.id||''),
    role:String(user.role||'USER'),
  }));
  window.location.assign('./app/');
}

async function completeSignupPolicy(payload){
  await jsonRequest('/v1/me/policies/accept',{
    method:'POST',
    headers:{Authorization:`Bearer ${payload.accessToken}`},
    body:JSON.stringify({termsVersion:'2026-08',privacyVersion:'2026-08',adultConfirmed:true}),
  });
}

async function submitAuth(event){
  event.preventDefault();
  if(submitting)return;
  setError('');
  const email=authEmail.value.trim();
  const password=authPassword.value;
  const signup=mode==='SIGNUP'&&role==='USER';
  if(!email||!email.includes('@'))return setError('이메일 주소를 확인해 주세요.');
  if(password.length<10)return setError('비밀번호는 10자 이상 입력해 주세요.');
  if(signup&&authConfirmPassword.value!==password)return setError('비밀번호 확인이 일치하지 않습니다.');
  if(signup&&!authAgreement.checked)return setError('회원가입을 계속하려면 필수 항목에 동의해 주세요.');

  submitting=true;
  authSubmit.disabled=true;
  authSubmit.textContent=signup?'계정 생성 중…':'로그인 중…';
  try{
    const payload=await jsonRequest(signup?'/v1/auth/email/signup':'/v1/auth/email/login',{
      method:'POST',body:JSON.stringify({email,password}),
    });
    const userRole=String(payload.user?.role||'');
    if(role==='ADMIN'){
      if(userRole!=='ADMIN')throw new Error('관리자 권한이 없는 계정입니다.');
      localStorage.setItem('gyeolAdminToken',payload.accessToken);
      window.location.assign('./admin/');
      return;
    }
    if(userRole!=='USER')throw new Error('일반 사용자 계정이 아닙니다.');
    if(signup)await completeSignupPolicy(payload);
    openUserApp(payload);
  }catch(error){
    setError(error instanceof Error?error.message:'로그인에 실패했습니다.');
  }finally{
    submitting=false;
    authSubmit.disabled=false;
    authSubmit.textContent=(mode==='SIGNUP'&&role==='USER')?'회원가입':'로그인';
  }
}

loginTrigger?.addEventListener('click',()=>setDialog(true));
heroLoginTrigger?.addEventListener('click',()=>setDialog(true));
loginClose?.addEventListener('click',()=>setDialog(false));
loginDialog?.addEventListener('mousedown',(event)=>{if(event.target===loginDialog)setDialog(false);});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&loginDialog&&!loginDialog.hidden)setDialog(false);});
roleTabs.forEach((tab)=>tab.addEventListener('click',()=>{
  role=tab.dataset.role==='ADMIN'?'ADMIN':'USER';
  mode='LOGIN';
  authEmail.value='';authPassword.value='';authConfirmPassword.value='';authAgreement.checked=false;
  renderAuthState();authEmail.focus();
}));
authModeToggle?.addEventListener('click',()=>{
  mode=mode==='LOGIN'?'SIGNUP':'LOGIN';
  authPassword.value='';authConfirmPassword.value='';authAgreement.checked=false;
  renderAuthState();authEmail.focus();
});
reviewFill?.addEventListener('click',()=>{
  mode='LOGIN';
  const review=REVIEW_ACCOUNTS[role];
  authEmail.value=review.email;authPassword.value=review.password;authConfirmPassword.value='';authAgreement.checked=false;
  renderAuthState();authSubmit.focus();
});
authForm?.addEventListener('submit',submitAuth);
renderAuthState();
