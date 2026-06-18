const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const DIST_DIR = path.join(__dirname, 'dist', 'thunderjaw', 'browser');

const emptyState = { stages: [] };

function normalizeState(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.stages)) {
    return emptyState;
  }

  return {
    stages: value.stages.map((stage, stageIndex) => ({
      id: typeof stage.id === 'string' ? stage.id : `stage-${Date.now()}-${stageIndex}`,
      title: `Stage ${stageIndex + 1}`,
      done: Boolean(stage.done),
      loads: Array.isArray(stage.loads)
        ? stage.loads.map((load, loadIndex) => ({
            id: typeof load.id === 'string' ? load.id : `load-${Date.now()}-${stageIndex}-${loadIndex}`,
            colorName: typeof load.colorName === 'string' ? load.colorName : '',
            colorCode: /^#[0-9a-f]{6}$/i.test(load.colorCode) ? load.colorCode : '#2563eb',
            groupNames: typeof load.groupNames === 'string' ? load.groupNames : '',
            comment: typeof load.comment === 'string' ? load.comment : '',
            done: Boolean(load.done)
          }))
        : []
    }))
  };
}

async function readState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return emptyState;
    }
    throw error;
  }
}

async function writeState(state) {
  const normalized = normalizeState(state);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STATE_FILE, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

app.use(express.json({ limit: '1mb' }));

app.get('/api/state', async (_req, res, next) => {
  try {
    res.json(await readState());
  } catch (error) {
    next(error);
  }
});

app.put('/api/state', async (req, res, next) => {
  try {
    res.json(await writeState(req.body));
  } catch (error) {
    next(error);
  }
});

app.use(express.static(DIST_DIR));

app.get('*', async (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Failed to process state.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Thunderjaw is running at http://localhost:${PORT}`);
  });
}

module.exports = { app, normalizeState, readState, writeState, STATE_FILE };

