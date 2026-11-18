function normalizeSearch(value){return String(value??'').normalize('NFKC').toLocaleLowerCase().trim()}
function matchesSearch(text,query){const haystack=normalizeSearch(text);return normalizeSearch(query).split(/\s+/).filter(Boolean).every(term=>haystack.includes(term))}
// Filters only the loaded display. Never changes or saves cupping data.
function searchText(value){return String(value??'').normalize('NFKC').toLocaleLowerCase().trim().replace(/\s+/g,' ')}
function matchesSearch(value,query){const text=searchText(value);return searchText(query).split(' ').filter(Boolean).every(term=>text.includes(term))}
function beanSearchText(b){return [b.name,b.beanName,b.roaster,b.roast,b.category,b.roastLevel,...(b.origins||[]),...(b.processes||[]),b.process,...(b.varieties||[]),...(b.flavorTags||[]),b.note].filter(Boolean).join(' ')}
function sessionSearchText(session){const ids=new Set(session.beanIds||[]);return [session.name,session.date,...state.beans.filter(b=>ids.has(b.id)).map(beanSearchText),...state.records.filter(r=>r.sessionId===session.id).map(beanSearchText)].join(' ')}
function applySearch(){const input=$('#global-search');if(!input)return;const query=input.value.trim(),active=Boolean(query);$('#clear-search').hidden=!active;let count=0,label='项结果';
 if(reviewMode||currentView==='history'){
  label='项结果';$$('#records .review-session').forEach(section=>{const heading=section.querySelector('.review-session-heading')||section.querySelector('h3');const sectionMatch=active&&matchesSearch(heading?.textContent||'',query);const cards=[...section.querySelectorAll('.review-bean')];let visible=0;cards.forEach(card=>{const match=!active||sectionMatch||matchesSearch([heading?.textContent||'',card.textContent].join(' '),query);card.hidden=!match;if(match)visible++});section.querySelectorAll('.decision-group').forEach(group=>{const visibleCards=[...group.querySelectorAll('.review-bean')].filter(card=>!card.hidden);group.hidden=!visibleCards.length;const total=group.querySelector('.comparison-heading h4 span');if(total){if(total.dataset.total===undefined)total.dataset.total=total.textContent;total.textContent=active?String(visibleCards.length):total.dataset.total}});section.hidden=active&&!sectionMatch&&!visible;if(section.tagName==='DETAILS'){if(active){if(section.dataset.searchWasOpen===undefined)section.dataset.searchWasOpen=String(section.open);section.open=!section.hidden}else if(section.dataset.searchWasOpen!==undefined){section.open=section.dataset.searchWasOpen==='true';delete section.dataset.searchWasOpen}}if(!section.hidden)count+=visible;});
 }else if(currentView==='detail'){
  label='项结果';const sceneMatch=active&&matchesSearch([current()?.name,current()?.date].join(' '),query);$$('#beans [data-evaluate]').forEach(card=>{const b=state.beans.find(b=>b.id===card.dataset.evaluate);const r=state.records.find(r=>r.sessionId===activeSession&&r.beanId===card.dataset.evaluate);const match=!active||sceneMatch||matchesSearch([current()?.name,current()?.date,b?beanSearchText(b):'',r?beanSearchText(r):''].join(' '),query);card.hidden=!match;if(match)count++});
 }else{
  label='项结果';$$('#session-list [data-session]').forEach(card=>{const s=state.sessions.find(s=>s.id===card.dataset.session);const match=!active||s&&matchesSearch(sessionSearchText(s),query);card.hidden=!match;if(match)count++});$$('#legacy .review-bean').forEach(card=>{card.hidden=active&&!matchesSearch(card.textContent,query);if(!card.hidden)count++});
 }
 const status=$('#search-status');status.hidden=!active;status.textContent=active?(count?'找到 '+count+' '+label:'没有找到相关记录，试试豆名或烘焙商。'):'';
}
const renderBeforeSearch=render;render=function(){renderBeforeSearch();applySearch()};
const historyBeforeSearch=renderHistory;renderHistory=function(){historyBeforeSearch();applySearch()};
$('#global-search').oninput=applySearch;
$('#clear-search').onclick=()=>{$('#global-search').value='';applySearch();$('#global-search').focus()};
