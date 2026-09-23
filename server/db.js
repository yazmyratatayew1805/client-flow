import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'

const db = new Database('client-flow.sqlite')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('client', 'specialist')),
    bio TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    specialist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    price INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'Другое',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialist_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'completed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

const seed = db.transaction(() => {
  if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count > 0) return
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role, bio) VALUES (?, ?, ?, ?, ?)')
  const password = bcrypt.hashSync('demo123', 10)
  const specialists = [
    ['Екатерина Ким', 'katya@clientflow.demo', 'Фитнес-тренер и специалист по функциональному движению', 'specialist'],
    ['Мария Ковалева', 'maria@clientflow.demo', 'Стилист по волосам, 8 лет в профессии', 'specialist'],
    ['Алексей Воронцов', 'alexey@clientflow.demo', 'Барбер и преподаватель классических техник', 'specialist'],
  ]
  specialists.forEach(([name, email, bio, role]) => insertUser.run(name, email, password, role, bio))
  const client = insertUser.run('Анна Петрова', 'anna@clientflow.demo', password, 'client', 'Любит утренние тренировки и постоянный слот по четвергам')
  const secondClient = insertUser.run('Дмитрий Орлов', 'dmitry@clientflow.demo', password, 'client', 'Предпочитает вечерние записи')
  const service = db.prepare('INSERT INTO services (specialist_id, name, description, duration_minutes, price, category) VALUES (?, ?, ?, ?, ?, ?)')
  const katya = db.prepare("SELECT id FROM users WHERE email = 'katya@clientflow.demo'").get().id
  const maria = db.prepare("SELECT id FROM users WHERE email = 'maria@clientflow.demo'").get().id
  const alexey = db.prepare("SELECT id FROM users WHERE email = 'alexey@clientflow.demo'").get().id
  const training = service.run(katya, 'Персональная тренировка', 'Индивидуальная работа с целями и техникой', 60, 2500, 'Фитнес').lastInsertRowid
  const haircut = service.run(maria, 'Стрижка и укладка', 'Подбор формы и укладка', 90, 3200, 'Красота').lastInsertRowid
  const barber = service.run(alexey, 'Барберская стрижка', 'Классическая стрижка и оформление бороды', 60, 1800, 'Барберы').lastInsertRowid
  const appointment = db.prepare('INSERT INTO appointments (client_id, specialist_id, service_id, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)')
  appointment.run(client.lastInsertRowid, katya, training, '2026-09-24T09:30:00.000Z', '2026-09-24T10:30:00.000Z')
  appointment.run(secondClient.lastInsertRowid, maria, haircut, '2026-09-24T12:00:00.000Z', '2026-09-24T13:30:00.000Z')
  appointment.run(client.lastInsertRowid, alexey, barber, '2026-09-25T17:00:00.000Z', '2026-09-25T18:00:00.000Z')
})
seed()

export default db
