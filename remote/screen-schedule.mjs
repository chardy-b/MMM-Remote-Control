export function createScreenSchedule() {
  const form=document.createElement('form');
  form.className='screen-schedule-form';
  const inputs={};
  for (const [name,text] of [['off','Screen off at'],['on','Screen on at']]) {
    const label=document.createElement('label');
    const caption=document.createElement('span');
    caption.textContent=text;
    const input=document.createElement('input');
    Object.assign(input,{type:'time',name,required:true,disabled:true,step:'60'});
    input.setAttribute('aria-label',text);
    inputs[name]=input;
    label.append(caption,input);
    form.append(label);
  }
  const note=document.createElement('p');
  note.className='screen-schedule-note';
  const status=document.createElement('p');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.textContent='Loading schedule…';
  const save=document.createElement('button');
  Object.assign(save,{type:'submit',textContent:'Save schedule',disabled:true});
  const retry=document.createElement('button');
  Object.assign(retry,{type:'button',textContent:'Reload schedule',hidden:true});
  form.append(note,save,retry,status);
  form.addEventListener('click',event=>event.stopPropagation());
  function busy(value) { for(const item of [save,...Object.values(inputs)]) item.disabled=value; }
  async function request(options) {
    const response=await fetch('/remote-screen-schedule',{cache:'no-store',...options});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error || 'Could not reach the mirror.');
    return data;
  }
  function update(data) {
    inputs.off.value=data.off;
    inputs.on.value=data.on;
    note.textContent=`Daily, ${data.timezone.replaceAll('_',' ')}. Changes apply immediately. The interval can cross midnight.`;
  }
  async function load() {
    busy(true); retry.hidden=true;
    try { update(await request()); status.textContent=''; busy(false); }
    catch(e) { status.textContent=e.message; retry.hidden=false; }
  }
  retry.addEventListener('click',load);
  form.addEventListener('submit',async event=> {
    event.preventDefault();
    if(inputs.off.value===inputs.on.value) { status.textContent='Choose different off and on times.'; return; }
    const settings={off:inputs.off.value,on:inputs.on.value};
    busy(true); status.textContent='Saving…';
    try {
      update(await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)}));
      status.textContent='Schedule saved.';
    } catch(e) { status.textContent=e.message; }
    finally { busy(false); }
  });
  void load();
  return form;
}
