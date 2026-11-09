import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCard, parseActivityDate, parseActivityDetails} from '../whatsapp/strava-parse.js';

test('reads observed run details and rejects ambiguous or non-running pages', () => {
  const page = {title:'Evening Run | Run | Strava', date:'Monday, September 28, 2026', text:'Evening Run\n1.74 km\nDistance\n10:01\nMoving Time\n5:44 /km\nPace'};
  assert.deepEqual(parseActivityDetails(page), {date:'2026-09-28', distance:'1.74 km', metres:1740, movingTime:'10:01'});
  assert.equal(parseActivityDetails({...page, title:'Evening Run | Walk | Strava'}), null);
  assert.equal(parseActivityDetails({...page, text:page.text + '\n4 km\nDistance'}), null);
  assert.equal(parseActivityDetails({...page, text:'1.74 km\nDistance'}), null);
  assert.deepEqual(parseActivityDetails({title:'Afternoon Run | Run | Strava',date:'Monday, November 9, 2026',text:'0.03 km\nDistance\n41s\nMoving Time'}), {date:'2026-11-09',distance:'0.03 km',metres:30,movingTime:'41s'});
});

test('reads a Strava calendar date without inventing a start time', () => {
  assert.equal(parseActivityDate('Monday, September 28, 2026'), '2026-09-28');
  assert.equal(parseActivityDate('Monday, February 30, 2026'), null);
  assert.equal(parseActivityDate('Tuesday, September 28, 2026'), null);
  assert.equal(parseActivityDate('Yesterday'), null);
});

test('candidate running card uses a stable id, precise timestamp and distance', () => {
  assert.deepEqual(parseCard({id:'42',type:'Run',start:'2026-11-09T10:00:00Z',text:'Morning\n3.20 km'}),{id:'42',startedAt:'2026-11-09T10:00:00Z',metres:3200});
});
test('ambiguous or incomplete cards never become runs', () => {
  assert.equal(parseCard({id:'1',start:'2026-11-09T10:00:00Z',text:'Walk\n5 km'}),null);
  assert.equal(parseCard({id:'1',type:'Run',start:'2026-11-09T10:00:00Z',text:'Run\n5 km\n3 mi'}),null);
  assert.equal(parseCard({id:'1',start:'Monday',text:'Run\n5 km'}),null);
  assert.equal(parseCard({id:'1',type:'Walk',start:'2026-11-09T10:00:00Z',text:'Morning Run\n5 km'}),null);
  assert.equal(parseCard({id:'1',type:'Run',text:'5 km'}),null);
});
