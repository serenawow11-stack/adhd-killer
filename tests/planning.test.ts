import { test } from 'vitest';
import assert from 'node:assert/strict';
import { progress, overlap, makeDraft, validSlots } from '../src/lib/planning';
const routines = [
  { name: '起床', id: 'wake', done: false, time: '07:30', duration: 0 },
  { name: '洗漱', id: 'wash', done: false, time: '07:40', duration: 15 },
  { name: '早餐', id: 'breakfast', done: false, time: '08:00', duration: 25 },
  { name: '午餐', id: 'lunch', done: false, time: '12:30', duration: 40 },
  { name: '晚餐', id: 'dinner', done: false, time: '18:30', duration: 40 },
  { name: '睡觉', id: 'sleep', done: false, time: '23:00', duration: 0 },
];
test('投入进度不等于成果，超时保留真实比例', () => {
  assert.equal(progress(120, 180), 67);
  assert.equal(progress(240, 180), 133);
  assert.equal(progress(0, 0), null);
});
test('跨小时只计算相交区间', () => {
  assert.equal(overlap(60, 120, 90, 150), 30);
  assert.equal(overlap(60, 120, 120, 180), 0);
});
test('本地排程保护固定事项且超量留待安排', () => {
  let r = makeDraft('简历 3小时\n读书 30分钟\n巨型任务 1000分钟', routines);
  assert.equal(validSlots(r, routines), '');
  assert.equal(r[2].start, null);
  assert.equal(r[0].duration, 180);
});
test('草稿手动修改后检测碰撞和越界', () => {
  assert.match(
    validSlots([{ id: 'a', title: 'a', suggested: false, start: 750, duration: 60 }], routines),
    /冲突/,
  );
  assert.match(
    validSlots([{ id: 'a', title: 'a', suggested: false, start: 60, duration: 60 }], routines),
    /超出/,
  );
  assert.throws(() => makeDraft('简历 0分钟', routines));
  assert.throws(() => makeDraft('任务', []));
});
