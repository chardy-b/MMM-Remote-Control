"use strict";
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {promisify} = require('node:util');
const run = promisify(require('node:child_process').execFile);
const configPath = path.resolve(__dirname, '../../../config/screen-schedule.json');
const timerPath = path.join(os.homedir(), '.config/systemd/user/mirror-night-schedule.timer');
const valid = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
function validate(body) {
  if (!body || !valid(body.off) || !valid(body.on) || body.off === body.on) throw new Error('Choose two different times in HH:MM format.');
  return {off: body.off, on: body.on};
}
function timerText(s) {
  return `[Unit]\nDescription=Daily mirror screen schedule\n\n[Timer]\nOnCalendar=*-*-* ${s.off}:00\nOnCalendar=*-*-* ${s.on}:00\nOnStartupSec=45\nPersistent=true\nAccuracySec=1s\nUnit=mirror-night-schedule.service\n\n[Install]\nWantedBy=timers.target\n`;
}
async function write(file, data) {
  await fs.writeFile(file+'.tmp', data, {mode:0o600});
  await fs.rename(file+'.tmp',file);
}
async function apply() {
  for (const args of [['daemon-reload'],['restart','mirror-night-schedule.timer'],['start','mirror-night-schedule.service']]) await run('/usr/bin/systemctl',['--user',...args],{timeout:160000});
}
function register(app) {
  let saving = false;
  const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
  app.get('/remote-screen-schedule',async (req,res) => {
    res.set('Cache-Control','no-store');
    try { res.json({...JSON.parse(await fs.readFile(configPath,'utf8')),timezone:timezone()}); }
    catch { res.status(500).json({error:'Could not load the screen schedule.'}); }
  });
  app.post('/remote-screen-schedule',require('express').json({limit:'1kb'}),async (req,res) => {
    if (req.headers.origin && req.headers.origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({error:'Open this control on the mirror controller itself.'});
    if (!req.is('application/json')) return res.status(415).json({error:'JSON is required.'});
    let settings;
    try { settings=validate(req.body); } catch(e) { return res.status(400).json({error:e.message}); }
    if (saving) return res.status(409).json({error:'A schedule is being saved. Try again.'});
    saving=true;
    let oldConfig,oldTimer;
    try {
      [oldConfig,oldTimer]=await Promise.all([fs.readFile(configPath),fs.readFile(timerPath)]);
      await write(configPath,JSON.stringify(settings,null,2)+'\n');
      await write(timerPath,timerText(settings));
      await apply();
      res.json({...settings,timezone:timezone()});
    } catch(e) {
      console.error('Schedule save failed:',e.message);
      if (oldConfig && oldTimer) {
        try { await write(configPath,oldConfig); await write(timerPath,oldTimer); await apply(); }
        catch(e) { console.error('Schedule restore failed:',e.message); }
      }
      res.status(500).json({error:'Could not apply the schedule. Please try again.'});
    } finally { saving=false; }
  });
}
module.exports={register,validate,timerText};
