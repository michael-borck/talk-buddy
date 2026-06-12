// Named database operation registry.
//
// The renderer can no longer send raw SQL over IPC. Instead it invokes
// a named operation with structured params; every SQL string lives here
// in the main process. Dynamic queries (optional filters, partial
// updates) are built against hardcoded column-name allowlists — only
// allowlisted column NAMES are ever interpolated into SQL, values are
// always bound through parameterized statements.

// Column allowlists for partial-update operations. Unknown fields are
// silently skipped — never interpolated.
const SCENARIO_UPDATE_COLUMNS = [
  'name',
  'description',
  'category',
  'difficulty',
  'estimatedMinutes',
  'systemPrompt',
  'initialMessage',
  'tags',
  'isPublic',
  'voice',
  'updated',
];

const PACK_UPDATE_COLUMNS = [
  'name',
  'description',
  'color',
  'icon',
  'difficulty',
  'estimatedMinutes',
  'order_index',
  'updated',
];

const SESSION_UPDATE_COLUMNS = [
  'startTime',
  'endTime',
  'duration',
  'transcript',
  'metadata',
  'status',
  'updated',
];

// Builds "col1 = ?, col2 = ?" from the allowlisted fields present in
// `fields`, returning the clause and the matching bind values.
function buildSetClause(fields, allowedColumns) {
  const setClause = [];
  const values = [];
  for (const column of allowedColumns) {
    if (fields && Object.prototype.hasOwnProperty.call(fields, column)) {
      setClause.push(`${column} = ?`);
      values.push(fields[column]);
    }
  }
  return { setClause, values };
}

const operations = {
  // --- Scenarios ---

  'scenarios:get': (db, { id }) => {
    return db.prepare('SELECT * FROM scenarios WHERE id = ?').all(id);
  },

  'scenarios:list': (db, params) => {
    const filter = (params && params.filter) || {};
    let query = 'SELECT * FROM scenarios WHERE archived = 0';
    const values = [];

    if (filter.category) {
      query += ' AND category = ?';
      values.push(filter.category);
    }

    if (filter.difficulty) {
      query += ' AND difficulty = ?';
      values.push(filter.difficulty);
    }

    query += ' ORDER BY name';

    return db.prepare(query).all(...values);
  },

  'scenarios:create': (db, params) => {
    return db
      .prepare(
        `INSERT INTO scenarios (id, name, description, category, difficulty, estimatedMinutes,
     systemPrompt, initialMessage, tags, isPublic, voice, created, updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.id,
        params.name,
        params.description,
        params.category,
        params.difficulty,
        params.estimatedMinutes,
        params.systemPrompt,
        params.initialMessage,
        params.tags,
        params.isPublic,
        params.voice,
        params.created,
        params.updated
      );
  },

  'scenarios:update': (db, { id, fields }) => {
    const { setClause, values } = buildSetClause(fields, SCENARIO_UPDATE_COLUMNS);
    values.push(id);
    return db
      .prepare(`UPDATE scenarios SET ${setClause.join(', ')} WHERE id = ?`)
      .run(...values);
  },

  'scenarios:delete': (db, { id }) => {
    return db.prepare('DELETE FROM scenarios WHERE id = ?').run(id);
  },

  'scenarios:archive': (db, { id, updated }) => {
    return db
      .prepare('UPDATE scenarios SET archived = 1, updated = ? WHERE id = ?')
      .run(updated, id);
  },

  'scenarios:unarchive': (db, { id, updated }) => {
    return db
      .prepare('UPDATE scenarios SET archived = 0, updated = ? WHERE id = ?')
      .run(updated, id);
  },

  'scenarios:listArchived': (db) => {
    return db.prepare('SELECT * FROM scenarios WHERE archived = 1 ORDER BY name').all();
  },

  // --- Sessions ---

  'sessions:get': (db, { id }) => {
    return db
      .prepare(
        `SELECT id, scenario_id as scenario, session_pack_id as sessionPackId, startTime, endTime,
     duration, transcript, metadata, status, created, updated FROM sessions WHERE id = ?`
      )
      .all(id);
  },

  'sessions:list': (db, params) => {
    const scenarioId = params && params.scenarioId;
    let query = `SELECT s.id, s.scenario_id as scenario, s.session_pack_id as sessionPackId,
               s.startTime, s.endTime, s.duration, s.transcript, s.metadata, s.status,
               s.created, s.updated, sp.name as packName
               FROM sessions s
               LEFT JOIN session_packs sp ON s.session_pack_id = sp.id
               LEFT JOIN packs p ON sp.pack_id = p.id
               WHERE (s.session_pack_id IS NULL OR p.archived = 0)`;
    const values = [];

    if (scenarioId) {
      query += ' AND s.scenario_id = ?';
      values.push(scenarioId);
    }

    query += ' ORDER BY s.created DESC';

    return db.prepare(query).all(...values);
  },

  'sessions:update': (db, { id, fields }) => {
    const { setClause, values } = buildSetClause(fields, SESSION_UPDATE_COLUMNS);
    values.push(id);
    return db
      .prepare(`UPDATE sessions SET ${setClause.join(', ')} WHERE id = ?`)
      .run(...values);
  },

  'sessions:delete': (db, { id }) => {
    return db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  },

  'sessions:createInPack': (db, params) => {
    return db
      .prepare(
        `INSERT INTO sessions (id, scenario_id, session_pack_id, status, created, updated)
       VALUES (?, ?, ?, 'not_started', ?, ?)`
      )
      .run(params.id, params.scenarioId, params.sessionPackId, params.created, params.updated);
  },

  'sessions:createStandalone': (db, params) => {
    return db
      .prepare(
        `INSERT INTO sessions (id, scenario_id, session_pack_id, startTime, status, created, updated)
     VALUES (?, ?, NULL, ?, 'active', ?, ?)`
      )
      .run(params.id, params.scenarioId, params.startTime, params.created, params.updated);
  },

  'sessions:findInPack': (db, { sessionPackId, scenarioId }) => {
    return db
      .prepare('SELECT * FROM sessions WHERE session_pack_id = ? AND scenario_id = ?')
      .all(sessionPackId, scenarioId);
  },

  'sessions:activate': (db, { id, status, now }) => {
    return db
      .prepare(
        'UPDATE sessions SET status = ?, startTime = COALESCE(startTime, ?), updated = ? WHERE id = ?'
      )
      .run(status, now, now, id);
  },

  'sessions:listByPack': (db, { sessionPackId }) => {
    return db
      .prepare(
        `SELECT id, scenario_id as scenario, session_pack_id as sessionPackId, startTime, endTime,
     duration, transcript, metadata, status, created, updated
     FROM sessions WHERE session_pack_id = ? ORDER BY created ASC`
      )
      .all(sessionPackId);
  },

  // --- Preferences ---

  'prefs:get': (db, { key }) => {
    return db.prepare('SELECT value FROM user_preferences WHERE key = ?').all(key);
  },

  'prefs:set': (db, { key, value }) => {
    return db
      .prepare('INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)')
      .run(key, value);
  },

  'prefs:getAll': (db) => {
    return db.prepare('SELECT key, value FROM user_preferences').all();
  },

  // --- Packs ---

  'packs:get': (db, { id }) => {
    return db.prepare('SELECT * FROM packs WHERE id = ?').all(id);
  },

  'packs:list': (db) => {
    return db
      .prepare('SELECT * FROM packs WHERE archived = 0 ORDER BY order_index, name')
      .all();
  },

  'packs:create': (db, params) => {
    return db
      .prepare(
        `INSERT INTO packs (id, name, description, color, icon, difficulty, estimatedMinutes, order_index, created, updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.id,
        params.name,
        params.description,
        params.color,
        params.icon,
        params.difficulty,
        params.estimatedMinutes,
        params.orderIndex,
        params.created,
        params.updated
      );
  },

  'packs:update': (db, { id, fields }) => {
    const { setClause, values } = buildSetClause(fields, PACK_UPDATE_COLUMNS);
    values.push(id);
    return db
      .prepare(`UPDATE packs SET ${setClause.join(', ')} WHERE id = ?`)
      .run(...values);
  },

  'packs:delete': (db, { id }) => {
    return db.prepare('DELETE FROM packs WHERE id = ?').run(id);
  },

  'packs:archive': (db, { id, updated }) => {
    return db
      .prepare('UPDATE packs SET archived = 1, updated = ? WHERE id = ?')
      .run(updated, id);
  },

  'packs:unarchive': (db, { id, updated }) => {
    return db
      .prepare('UPDATE packs SET archived = 0, updated = ? WHERE id = ?')
      .run(updated, id);
  },

  'packs:listArchived': (db) => {
    return db.prepare('SELECT * FROM packs WHERE archived = 1 ORDER BY name').all();
  },

  // --- Pack-scenario relationships ---

  'packScenarios:add': (db, { packId, scenarioId, orderIndex, created }) => {
    return db
      .prepare(
        `INSERT OR REPLACE INTO pack_scenarios (pack_id, scenario_id, order_index, created)
     VALUES (?, ?, ?, ?)`
      )
      .run(packId, scenarioId, orderIndex, created);
  },

  'packScenarios:remove': (db, { packId, scenarioId }) => {
    return db
      .prepare('DELETE FROM pack_scenarios WHERE pack_id = ? AND scenario_id = ?')
      .run(packId, scenarioId);
  },

  'packScenarios:listScenarios': (db, { packId }) => {
    return db
      .prepare(
        `SELECT s.*, ps.order_index as pack_order FROM scenarios s
     JOIN pack_scenarios ps ON s.id = ps.scenario_id
     WHERE ps.pack_id = ?
     ORDER BY ps.order_index, s.name`
      )
      .all(packId);
  },

  'packScenarios:listPacks': (db, { scenarioId }) => {
    return db
      .prepare(
        `SELECT p.* FROM packs p
     JOIN pack_scenarios ps ON p.id = ps.pack_id
     WHERE ps.scenario_id = ?
     ORDER BY p.order_index, p.name`
      )
      .all(scenarioId);
  },

  'packScenarios:updateOrder': (db, { packId, scenarioId, orderIndex }) => {
    return db
      .prepare('UPDATE pack_scenarios SET order_index = ? WHERE pack_id = ? AND scenario_id = ?')
      .run(orderIndex, packId, scenarioId);
  },

  // --- Session packs ---

  'sessionPacks:create': (db, params) => {
    return db
      .prepare(
        `INSERT INTO session_packs (id, pack_id, name, description, color, created, updated)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.id,
        params.packId,
        params.name,
        params.description,
        params.color,
        params.created,
        params.updated
      );
  },

  'sessionPacks:get': (db, { id }) => {
    return db.prepare('SELECT * FROM session_packs WHERE id = ?').all(id);
  },

  'sessionPacks:list': (db) => {
    return db
      .prepare(
        `SELECT sp.* FROM session_packs sp
     JOIN packs p ON sp.pack_id = p.id
     WHERE p.archived = 0
     ORDER BY sp.updated DESC`
      )
      .all();
  },

  'sessionPacks:getByPack': (db, { packId }) => {
    return db.prepare('SELECT * FROM session_packs WHERE pack_id = ?').all(packId);
  },

  'sessionPacks:delete': (db, { id }) => {
    return db.prepare('DELETE FROM session_packs WHERE id = ?').run(id);
  },
};

function runOperation(db, name, params) {
  const operation = operations[name];
  if (!operation) {
    throw new Error(`Unknown db operation: ${name}`);
  }
  return operation(db, params || {});
}

module.exports = { runOperation };
