const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const test = require('node:test');
const { normalizeState, readState, writeState, STATE_FILE } = require('../server');

test('normalizeState renumbers stages and normalizes loads', () => {
  const normalized = normalizeState({
    stages: [
      {
        id: 'a',
        title: 'Wrong title',
        done: true,
        loads: [
          {
            id: 'l1',
            colorName: 'Blue',
            colorCode: 'not-a-color',
            groupNames: 'Doors',
            comment: 'First coat',
            done: true
          }
        ]
      },
      {
        id: 'b',
        loads: []
      }
    ]
  });

  assert.equal(normalized.stages[0].title, 'Stage 1');
  assert.equal(normalized.stages[1].title, 'Stage 2');
  assert.equal(normalized.stages[0].loads[0].colorCode, '#2563eb');
  assert.equal(normalized.stages[0].loads[0].done, true);
  assert.equal(normalized.stages[1].done, false);
});

test('writeState and readState persist JSON project state', async () => {
  const original = await fs.readFile(STATE_FILE, 'utf8').catch(() => null);

  try {
    const saved = await writeState({
      stages: [
        {
          id: 'stage-test',
          done: false,
          loads: [
            {
              id: 'load-test',
              colorName: 'Red',
              colorCode: '#ff0000',
              groupNames: 'Panels',
              comment: '',
              done: false
            }
          ]
        }
      ]
    });

    assert.equal(saved.stages[0].title, 'Stage 1');
    assert.equal(saved.stages[0].loads[0].colorName, 'Red');

    const readBack = await readState();
    assert.deepEqual(readBack, saved);
  } finally {
    if (original === null) {
      await fs.rm(STATE_FILE, { force: true });
    } else {
      await fs.writeFile(STATE_FILE, original, 'utf8');
    }
  }
});

