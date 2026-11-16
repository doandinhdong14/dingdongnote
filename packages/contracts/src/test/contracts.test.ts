import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateNoteSchema,
  CreateTaskSchema,
  CreateHabitSchema,
  CreateTransactionSchema,
  MoneyAmountSchema,
} from '../index.js';

describe('Contracts Validation', () => {
  test('CreateNoteSchema requires either title or body', () => {
    assert.throws(() => {
      CreateNoteSchema.parse({ title: '', body: '' });
    });

    const note = CreateNoteSchema.parse({ title: 'Ghi chú họp', body: '' });
    assert.equal(note.title, 'Ghi chú họp');
  });

  test('MoneyAmountSchema accepts positive integer strings within range', () => {
    assert.equal(MoneyAmountSchema.parse('35000'), '35000');
    assert.equal(MoneyAmountSchema.parse('1'), '1');
    assert.equal(MoneyAmountSchema.parse('999999999999'), '999999999999');

    // Reject 0, negative, floats, or > 12 digits
    assert.throws(() => MoneyAmountSchema.parse('0'));
    assert.throws(() => MoneyAmountSchema.parse('-5000'));
    assert.throws(() => MoneyAmountSchema.parse('35.50'));
    assert.throws(() => MoneyAmountSchema.parse('1000000000000'));
  });

  test('CreateTaskSchema validates title and priority defaults', () => {
    assert.throws(() => {
      CreateTaskSchema.parse({ title: '' });
    });

    const task = CreateTaskSchema.parse({ title: 'Nộp báo cáo' });
    assert.equal(task.title, 'Nộp báo cáo');
    assert.equal(task.priority, 'normal');
    assert.equal(task.baseVersion, 0);
  });

  test('CreateHabitSchema validates weekdays', () => {
    assert.throws(() => {
      CreateHabitSchema.parse({
        name: 'Tập thể dục',
        startDate: '2026-11-16',
        weekdays: [],
      });
    });

    const habit = CreateHabitSchema.parse({
      name: 'Tập thể dục',
      startDate: '2026-11-16',
      weekdays: [1, 3, 5],
      reminderTime: '06:30',
    });
    assert.equal(habit.name, 'Tập thể dục');
    assert.deepEqual(habit.weekdays, [1, 3, 5]);
  });
});
