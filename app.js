const API_BASE='https://gyeol-api.suaveforge.com';
const REVIEW_ACCOUNTS={
  USER:{email:'client.user@gyeol.suaveforge.com',password:'GyeolClient!2026'},
  ADMIN:{email:'client.admin@gyeol.suaveforge.com',password:'GyeolAdmin!2026'},
};

const BUILD_INFO=window.GYEOL_BUILD_INFO||{version:'dev',build:'dev'};
const siteVersion=document.getElementById('siteVersion');
const siteBuild=document.getElementById('siteBuild');
if(siteVersion)siteVersion.textContent=`v${BUILD_INFO.version}`;
if(siteBuild)siteBuild.textContent=String(BUILD_INFO.build);

const loginTrigger=document.getElementById('loginTrigger');
const heroLoginTrigger=document.getElementById('heroLoginTrigger');
const loginDialog=document.getElementById('loginDialog');
const loginClose=document.getElementById('loginClose');
const demoAccountBox=document.getElementById('demoAccountBox');
const demoAccountSelect=document.getElementById('demoAccountSelect');
const authForm=document.getElementById('authForm');
const authModeTitle=document.getElementById('authModeTitle');
const authModeToggle=document.getElementById('authModeToggle');
const authEmail=document.getElementById('authEmail');
const authPassword=document.getElementById('authPassword');
const authConfirmPassword=document.getElementById('authConfirmPassword');
const authAgreement=document.getElementById('authAgreement');
const confirmField=document.getElementById('confirmField');
const agreementField=document.getElementById('agreementField');
const authError=document.getElementById('authError');
const authSubmit=document.getElementById('authSubmit');
const dialogFootnote=document.getElementById('dialogFootnote');

let mode='LOGIN';
let submitting=false;

function setError(message=''){
  if(!authError)return;
  authError.textContent=message;
  authError.hidden=!message;
}

function setDialog(open){
  if(!loginDialog)return;
  loginDialog.hidden=!open;
  document.body.classList.toggle('dialog-open',open);
  if(open){
    mode='LOGIN';
    if(demoAccountSelect)demoAccountSelect.value='';
    renderAuthState();
    setTimeout(()=>demoAccountSelect?.focus(),0);
  }
}

function renderAuthState(){
  const signup=mode==='SIGNUP';
  if(authModeTitle)authModeTitle.textContent=signup?'새 계정 만들기':'로그인';
  if(authModeToggle)authModeToggle.textContent=signup?'로그인으로 돌아가기':'회원가입';
  if(demoAccountBox)demoAccountBox.hidden=signup;
  if(confirmField)confirmField.hidden=!signup;
  if(agreementField)agreementField.hidden=!signup;
  if(authPassword)authPassword.autocomplete=signup?'new-password':'current-password';
  if(authConfirmPassword)authConfirmPassword.required=signup;
  if(authAgreement)authAgreement.required=signup;
  if(authSubmit)authSubmit.textContent=signup?'회원가입':'로그인';
  if(dialogFootnote)dialogFootnote.textContent=signup
    ?'가입이 완료되면 사용자 앱으로 바로 이동합니다.'
    :'계정 권한에 따라 사용자 앱 또는 관리자 화면으로 자동 이동합니다.';
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

  const email=authEmail?.value.trim()||'';
  const password=authPassword?.value||'';
  const signup=mode==='SIGNUP';
  if(!email||!email.includes('@'))return setError('이메일 주소를 확인해 주세요.');
  if(password.length<10)return setError('비밀번호는 10자 이상 입력해 주세요.');
  if(signup&&authConfirmPassword?.value!==password)return setError('비밀번호 확인이 일치하지 않습니다.');
  if(signup&&!authAgreement?.checked)return setError('회원가입을 계속하려면 필수 항목에 동의해 주세요.');

  submitting=true;
  authSubmit.disabled=true;
  authSubmit.textContent=signup?'계정 생성 중…':'로그인 중…';
  try{
    const payload=await jsonRequest(signup?'/v1/auth/email/signup':'/v1/auth/email/login',{
      method:'POST',
      body:JSON.stringify({email,password}),
    });
    const userRole=String(payload.user?.role||'');
    if(signup){
      if(userRole!=='USER')throw new Error('일반 사용자 계정을 만들지 못했습니다.');
      await completeSignupPolicy(payload);
      openUserApp(payload);
      return;
    }
    if(userRole==='ADMIN'){
      localStorage.setItem('gyeolAdminToken',String(payload.accessToken||''));
      window.location.assign('./admin/');
      return;
    }
    if(userRole==='USER'){
      openUserApp(payload);
      return;
    }
    throw new Error('이 계정으로 이동할 화면을 확인할 수 없습니다.');
  }catch(error){
    setError(error instanceof Error?error.message:'로그인에 실패했습니다.');
  }finally{
    submitting=false;
    authSubmit.disabled=false;
    authSubmit.textContent=mode==='SIGNUP'?'회원가입':'로그인';
  }
}

loginTrigger?.addEventListener('click',()=>setDialog(true));
heroLoginTrigger?.addEventListener('click',()=>setDialog(true));
loginClose?.addEventListener('click',()=>setDialog(false));
loginDialog?.addEventListener('mousedown',(event)=>{if(event.target===loginDialog)setDialog(false);});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&loginDialog&&!loginDialog.hidden)setDialog(false);});

demoAccountSelect?.addEventListener('change',()=>{
  const selected=demoAccountSelect.value;
  if(!selected)return;
  const account=REVIEW_ACCOUNTS[selected];
  if(!account)return;
  mode='LOGIN';
  renderAuthState();
  authEmail.value=account.email;
  authPassword.value=account.password;
  authConfirmPassword.value='';
  authAgreement.checked=false;
  setError('');
  authSubmit.focus();
});

authModeToggle?.addEventListener('click',()=>{
  mode=mode==='LOGIN'?'SIGNUP':'LOGIN';
  if(demoAccountSelect)demoAccountSelect.value='';
  authEmail.value='';
  authPassword.value='';
  authConfirmPassword.value='';
  authAgreement.checked=false;
  renderAuthState();
  authEmail.focus();
});

authForm?.addEventListener('submit',submitAuth);
renderAuthState();
