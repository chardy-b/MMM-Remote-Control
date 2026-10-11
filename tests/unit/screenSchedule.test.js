const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validate, timerText} = require('../../lib/screenSchedule.js');
test('rejects invalid or ambiguous screen schedule times', () => {
  for (const body of [null, {}, {off:'24:00',on:'07:00'}, {off:'12:60',on:'07:00'}, {off:'07:00',on:'07:00'}, {off:'$(id)',on:'07:00'}]) assert.throws(() => validate(body));
});
test('accepts minute precision and generates both persistent timer boundaries', () => {
  const settings = validate({off:'23:30',on:'07:15',ignored:'value'});
  assert.deepEqual(settings, {off:'23:30',on:'07:15'});
  const timer = timerText(settings);
  assert.ok(timer.includes('OnCalendar=*-*-* 23:30:00\n'));
  assert.ok(timer.includes('OnCalendar=*-*-* 07:15:00\n'));
  assert.ok(timer.includes('Persistent=true\n'));
  assert.ok(timer.includes('OnStartupSec=45\n'));
});
