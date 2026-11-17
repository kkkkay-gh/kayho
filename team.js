function applyRole(){
 const admin=cloudProfile?.role==='admin';
 $('[data-view="history"]').hidden=!admin;
 $('#review-all').hidden=!admin||reviewMode;
 $('#exit-review').hidden=!reviewMode;
 $('#export').hidden=!admin;
 $('.history-modes').hidden=!admin||(!reviewMode&&currentView!=='history');
 $('#account-label').textContent=cloudProfile?cloudProfile.username+' · '+(admin?'管理员':'普通用户'):'';
 if(currentView==='history'&&!reviewMode){$('#by-session').classList.toggle('active',historyMode==='session');$('#by-bean').classList.toggle('active',historyMode==='bean')}
}
async function openWorkspace(){
 const data=await FeiyaCloud.load();cloudProfile=data.profile;cloudRevision=data.revision;state=data.state;state.sessions||=[];state.beans||=[];state.records||=[];
 for(const s of state.sessions)s.beanIds||=[];
 if(cloudProfile.role==='admin')await loadReviewNotes();
 activeSession=state.sessions[0]?.id||null;selected=null;scores={};currentView='home';historyMode='session';reviewMode=false;
 $('#login-root').hidden=true;$('#app-root').hidden=false;$('#sync-status').textContent='云端记录已加载';render();
}
$('#login-form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;$('#login-message').textContent='';try{await FeiyaCloud.login($('#username').value.trim(),$('#password').value);$('#password').value='';await openWorkspace()}catch(error){$('#login-message').textContent=error.status===400?'账号或密码不正确':error.message}finally{button.disabled=false}};
$('#logout').onclick=async()=>{if(cloudSaving)return;try{await FeiyaCloud.logout()}catch{}cloudProfile=null;state={sessions:[],beans:[],records:[]};reviewNotes={};resetEvaluation();$('#app-root').hidden=true;$('#login-root').hidden=false;$('#login-message').textContent='已退出'};
$('#review-all').onclick=async()=>{
 if(cloudProfile?.role!=='admin'||cloudSaving)return;
 try{const [rows]=await Promise.all([FeiyaCloud.review(),loadReviewNotes()]);const combined={sessions:[],beans:[],records:[]};
 for(const row of rows){const data=row.payload||{};combined.sessions.push(...(data.sessions||[]).map(s=>({...s,sourceUser:row.username})));combined.beans.push(...(data.beans||[]));combined.records.push(...(data.records||[]))}
 window.feiyaReview={combined};historyMode='session';reviewMode=true;
 $('#home').hidden=true;$('#record').hidden=true;$('#history').hidden=false;document.body.dataset.screen='history';paintHistory();$('#sync-status').textContent='全员回顾 · 原始评分只读';applyRole();
 }catch(error){toast('无法读取全员回顾：'+error.message)}
};
$('#exit-review').onclick=()=>{reviewMode=false;window.feiyaReview=null;currentView='home';render()};
for(const [id,mode] of [['by-session','session'],['by-bean','bean']])$('#'+id).onclick=()=>{historyMode=mode;paintHistory()};
const baseShowView=showView;showView=view=>{reviewMode=false;window.feiyaReview=null;if(view==='history'&&cloudProfile?.role!=='admin')return;baseShowView(view)};
if(FeiyaCloud.configured())window.addEventListener('DOMContentLoaded',()=>openWorkspace().catch(()=>{$('#app-root').hidden=true;$('#login-root').hidden=false}));else $('#login-message').textContent='部署配置尚未完成，账号服务暂未开放。';
$('#export').onclick=()=>{if(cloudProfile?.role!=='admin')return;const data={...(reviewMode?window.feiyaReview.combined:state),adminSummaries:reviewNotes};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='啡芽杯测-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
