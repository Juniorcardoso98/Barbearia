const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'barbershop.db');
let db;
let saveTimeout;

// Wrapper to mimic better-sqlite3 API using sql.js
class StatementWrapper {
  constructor(database, sql, saveFn) {
    this.database = database;
    this.sql = sql;
    this.saveFn = saveFn;
  }

  run(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    this.database.run(this.sql, flatParams);
    this.saveFn();
    const lastId = this.database.exec("SELECT last_insert_rowid() as id");
    const changes = this.database.getRowsModified();
    return {
      lastInsertRowid: lastId[0]?.values[0]?.[0] || 0,
      changes
    };
  }

  get(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    let stmt;
    try {
      stmt = this.database.prepare(this.sql);
      if (flatParams.length > 0) stmt.bind(flatParams);
      if (stmt.step()) {
        return stmt.getAsObject();
      }
      return undefined;
    } finally {
      if (stmt) stmt.free();
    }
  }

  all(...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    let stmt;
    try {
      stmt = this.database.prepare(this.sql);
      if (flatParams.length > 0) stmt.bind(flatParams);
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      return results;
    } finally {
      if (stmt) stmt.free();
    }
  }
}

// Database wrapper with better-sqlite3-compatible API
class DatabaseWrapper {
  constructor(sqlDb) {
    this.sqlDb = sqlDb;
  }

  prepare(sql) {
    return new StatementWrapper(this.sqlDb, sql, () => this.scheduleSave());
  }

  exec(sql) {
    this.sqlDb.run(sql);
    this.scheduleSave();
  }

  transaction(fn) {
    return (...args) => {
      this.sqlDb.run('BEGIN TRANSACTION');
      try {
        fn(...args);
        this.sqlDb.run('COMMIT');
        this.scheduleSave();
      } catch (e) {
        this.sqlDb.run('ROLLBACK');
        throw e;
      }
    };
  }

  pragma(pragmaStr) {
    try {
      this.sqlDb.run(`PRAGMA ${pragmaStr}`);
    } catch (e) {
      // Ignore pragma errors in sql.js
    }
  }

  scheduleSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        const data = this.sqlDb.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
      } catch (e) {
        console.error('Erro ao salvar banco de dados:', e);
      }
    }, 100);
  }

  saveNow() {
    if (saveTimeout) clearTimeout(saveTimeout);
    try {
      const data = this.sqlDb.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.error('Erro ao salvar banco de dados:', e);
    }
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

async function initDatabase() {
  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = new DatabaseWrapper(sqlDb);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'client' CHECK(role IN ('client', 'admin', 'barber')),
      google_id TEXT UNIQUE,
      avatar_url TEXT,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      price REAL NOT NULL,
      icon TEXT DEFAULT '✂️',
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS barber_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barber_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      active BOOLEAN DEFAULT 1,
      FOREIGN KEY (barber_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(barber_id, day_of_week)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      barber_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
      whatsapp_notified BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES users(id),
      FOREIGN KEY (barber_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      client_id INTEGER NOT NULL,
      barber_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id),
      FOREIGN KEY (barber_id) REFERENCES users(id)
    )
  `);

  // Create indexes (ignore if they already exist)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_reviews_barber ON reviews(barber_id)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_reviews_appointment ON reviews(appointment_id)'); } catch(e) {}

  // Seed default data if database is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    console.log('🌱 Inserindo dados iniciais...');

    // Admin principal
    const adminHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run('Junior Admin', 'admin@barbearia.com', '11999999999', adminHash, 'admin');

    // Barbers
    const barberHash = bcrypt.hashSync('barber123', 10);
    const b1 = db.prepare(`INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run('Carlos Silva', 'carlos@barbearia.com', '11988888888', barberHash, 'barber');
    const b2 = db.prepare(`INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run('João Santos', 'joao@barbearia.com', '11977777777', barberHash, 'barber');
    const b3 = db.prepare(`INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run('Pedro Oliveira', 'pedro@barbearia.com', '11966666666', barberHash, 'barber');

    // Schedules (Mon-Sat)
    const insertSchedule = db.prepare(`INSERT INTO barber_schedules (barber_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)`);
    [b1.lastInsertRowid, b2.lastInsertRowid, b3.lastInsertRowid].forEach(bid => {
      for (let day = 1; day <= 6; day++) {
        insertSchedule.run(bid, day, '09:00', '19:00');
      }
    });

    // Sample client
    const clientHash = bcrypt.hashSync('cliente123', 10);
    db.prepare(`INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run('Cliente Teste', 'cliente@email.com', '11955555555', clientHash, 'client');
  }

  // Seed services if empty
  const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get();
  if (serviceCount.count === 0) {
    const ins = db.prepare(`INSERT INTO services (name, description, duration_minutes, price, icon) VALUES (?, ?, ?, ?, ?)`);
    ins.run('Corte de Cabelo', 'Corte masculino tradicional ou moderno com acabamento perfeito', 30, 35.00, '✂️');
    ins.run('Barba', 'Aparar e modelar a barba com navalha e toalha quente', 20, 25.00, '🧔');
    ins.run('Corte + Barba', 'Combo completo: corte de cabelo e barba com acabamento', 50, 55.00, '💈');
    ins.run('Sobrancelha', 'Design e limpeza de sobrancelha masculina', 15, 15.00, '👁️');
    ins.run('Pigmentação Capilar', 'Pigmentação e coloração capilar profissional', 60, 80.00, '🎨');
    ins.run('Hidratação', 'Tratamento de hidratação profunda capilar', 30, 40.00, '💧');
    ins.run('Corte Infantil', 'Corte especial para crianças até 12 anos', 25, 25.00, '👦');
    ins.run('Platinado', 'Descoloração e platinação completa', 90, 120.00, '⭐');
  }

  // Seed site settings if empty
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM site_settings').get();
  if (settingsCount.count === 0) {
    const insSetting = db.prepare(`INSERT INTO site_settings (key, value) VALUES (?, ?)`);
    insSetting.run('site_name', 'BarberShop');
    insSetting.run('site_logo', '');
    insSetting.run('hero_title', 'Seu Estilo, Nossa Arte');
    insSetting.run('hero_subtitle', 'Agende seu corte de cabelo, barba e outros serviços de forma rápida e prática.');
    insSetting.run('hero_cta', 'Agendar Agora');
    insSetting.run('footer_text', '© 2026 BarberShop. Todos os direitos reservados.');
    insSetting.run('whatsapp_number', '');
    insSetting.run('instagram_url', '');
    insSetting.run('address', '');
  }

  db.saveNow();
  console.log('✅ Banco de dados inicializado com sucesso!');
}

module.exports = { getDb, initDatabase };
