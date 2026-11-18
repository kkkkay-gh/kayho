(() => {
  const cfg=window.FEIYA_CONFIG||{};
  const authKey='feiya-auth-v1';let session=null;let refreshFlight=null;let keepLogin=false;
  try{session=JSON.parse(sessionStorage.getItem(authKey)||'null')}catch{}
  if(!session)try{session=JSON.parse(localStorage.getItem(authKey)||'null');keepLogin=Boolean(session)}catch{}
  function remember(value){session=value;for(const store of ['localStorage','sessionStorage'])try{(store==='localStorage'?localStorage:sessionStorage).removeItem(authKey)}catch{}if(!value)return;const encoded=JSON.stringify(value);if(keepLogin)try{localStorage.setItem(authKey,encoded);return}catch{keepLogin=false}try{sessionStorage.setItem(authKey,encoded)}catch{}}
  function hasSession(){return Boolean(session)}
  function keepsLogin(){return keepLogin}
  function configured(){return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(cfg.supabaseUrl)&&Boolean(cfg.publishableKey)}
  async function request(path,{method='GET',body,token}={}){
    if(!configured())throw Error('账号服务尚未完成连接，请稍后再试');
    const res=await fetch(cfg.supabaseUrl+path,{method,headers:{apikey:cfg.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    const data=await res.json().catch(()=>null);if(!res.ok){const error=Error(data?.message||data?.msg||data?.error_description||'请求失败');error.status=res.status;throw error}return data;
  }
  async function access(){if(!session)throw Error('请先登录');if(session.expires_at*1000>Date.now()+60000)return session.access_token;if(!refreshFlight)refreshFlight=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}}).then(data=>{remember({...data,expires_at:data.expires_at||Date.now()/1000+data.expires_in});return data.access_token}).catch(error=>{if([400,401,403].includes(error.status))remember(null);throw error}).finally(()=>refreshFlight=null);return refreshFlight}
  async function login(username,password,keep=false){const email=username.includes('@')?username:username+'@'+cfg.accountDomain;const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});keepLogin=Boolean(keep);remember({...data,expires_at:data.expires_at||Date.now()/1000+data.expires_in});return profile()}
  async function profile(){const token=await access();const user=await request('/auth/v1/user',{token});const rows=await request('/rest/v1/feiya_profiles?user_id=eq.'+encodeURIComponent(user.id)+'&select=username,role',{token});if(!rows?.length){remember(null);throw Error('这个账号尚未获准使用啡芽杯测')}return {...rows[0],id:user.id}}
  async function load(){const who=await profile();const rows=await request('/rest/v1/feiya_workspaces?owner_id=eq.'+encodeURIComponent(who.id)+'&select=payload,revision',{token:await access()});return {profile:who,revision:rows[0]?.revision||0,state:rows[0]?.payload||{sessions:[],beans:[],records:[]}}}
  async function save(state,revision){return request('/rest/v1/rpc/feiya_save_workspace',{method:'POST',token:await access(),body:{expected_revision:revision,document:{sessions:state.sessions,beans:state.beans,records:state.records}}})}
  async function review(){return request('/rest/v1/rpc/feiya_admin_review',{method:'POST',token:await access(),body:{}})}
  async function logout(){try{if(session)await request('/auth/v1/logout',{method:'POST',token:await access()})}finally{remember(null)}}
  async function cupping(action,args={}){return request('/rest/v1/rpc/feiya_cupping',{method:'POST',token:await access(),body:{action,args}})}
  async function reviewNotes(){return request('/rest/v1/feiya_review_notes?select=session_id,summary,updated_at',{token:await access()})}
  async function saveReviewNote(sessionId,summary){return request('/rest/v1/rpc/feiya_save_review_note',{method:'POST',token:await access(),body:{target_session:sessionId,summary_text:summary}})}
  window.FeiyaCloud={hasSession,keepsLogin,reviewNotes,saveReviewNote,cupping,configured,login,load,save,review,logout};
})();
