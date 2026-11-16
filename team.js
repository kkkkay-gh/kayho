function applyRole(){
 const admin=cloudProfile?.role==='admin';
 document.querySelector('[data-view="history"]').hidden=!admin;
 document.querySelector('#review-all').hidden=!admin||reviewMode;
 document.querySelector('#exit-review').hidden=!reviewMode;
 document.querySelector('#export').hidden=!admin;
 document.querySelector('#account-label').textContent=cloudProfile?cloudProfile.username+' · '+(admin?'管理员':'普通用户'):'';
}
async function openWorkspace(){
 const data=await FeiyaCloud.load();cloudProfile=data.profile;cloudRevision=data.revision;state=data.state;state.sessions||=[];state.beans||=[];state.records||=[];
 for(const s of state.sessions)s.beanIds||=[];
 activeSession=state.sessions[0]?.id||null;selected=null;scores={};currentView='home';reviewMode=false;
 document.querySelector('#login-root').hidden=true;document.querySelector('#app-root').hidden=false;document.querySelector('#sync-status').textContent='云端记录已加载';render();
}
document.querySelector('#login-form').onsubmit=async e=>{
 e.preventDefault();const button=e.submitter;button.disabled=true;document.querySelector('#login-message').textContent='';
 try{await FeiyaCloud.login(document.querySelector('#username').value.trim(),document.querySelector('#password').value);document.querySelector('#password').value='';await openWorkspace()}
 catch(error){document.querySelector('#login-message').textContent=error.status===400?'账号或密码不正确':error.message}
 finally{button.disabled=false}
};
document.querySelector('#logout').onclick=async()=>{
 if(cloudSaving)return;try{await FeiyaCloud.logout()}catch{}cloudProfile=null;state={sessions:[],beans:[],records:[]};resetEvaluation();document.querySelector('#app-root').hidden=true;document.querySelector('#login-root').hidden=false;document.querySelector('#login-message').textContent='已退出';
};
document.querySelector('#review-all').onclick=async()=>{
 if(cloudProfile?.role!=='admin'||cloudSaving)return;
 try{const rows=await FeiyaCloud.review();const combined={sessions:[],beans:[],records:[]};
 for(const row of rows){const data=row.payload||{};combined.sessions.push(...(data.sessions||[]).map(s=>({...s,name:row.username+' · '+s.name})));combined.beans.push(...(data.beans||[]));combined.records.push(...(data.records||[]))}
 const own=state;state=combined;historyMode='session';reviewMode=true;
 document.querySelector('#home').hidden=true;document.querySelector('#record').hidden=true;document.querySelector('#history').hidden=false;document.querySelector('.history-modes').hidden=false;
 renderHistory();state=own;document.querySelectorAll('[data-winner]').forEach(el=>el.disabled=true);document.querySelector('#sync-status').textContent='全员回顾 · 只读';applyRole();
 window.feiyaReview={combined};
 }catch(error){toast('无法读取全员回顾：'+error.message)}
};
document.querySelector('#exit-review').onclick=()=>{reviewMode=false;window.feiyaReview=null;document.querySelector('.history-modes').hidden=true;currentView='home';render()};
for(const [id,mode] of [['by-session','session'],['by-bean','bean']])document.querySelector('#'+id).onclick=()=>{
 if(!reviewMode)return;const own=state;state=window.feiyaReview.combined;historyMode=mode;renderHistory();state=own;document.querySelectorAll('[data-winner]').forEach(el=>el.disabled=true);document.querySelector('#by-session').classList.toggle('active',mode==='session');document.querySelector('#by-bean').classList.toggle('active',mode==='bean');
};
const baseShowView=showView;showView=view=>{reviewMode=false;window.feiyaReview=null;document.querySelector('.history-modes').hidden=true;if(view==='history'&&cloudProfile?.role!=='admin')return;baseShowView(view)};
if(FeiyaCloud.configured())openWorkspace().catch(()=>{document.querySelector('#app-root').hidden=true;document.querySelector('#login-root').hidden=false});
else document.querySelector('#login-message').textContent='部署配置尚未完成，账号服务暂未开放。';
document.querySelector('#export').onclick=()=>{
 if(cloudProfile?.role!=='admin')return;const data=reviewMode?window.feiyaReview.combined:state;
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='啡芽杯测-'+new Date().toLocaleDateString('sv-SE')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
