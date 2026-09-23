import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from './db.js'

const app = express()
const port = Number(process.env.PORT || 8787)
const isProduction = process.env.NODE_ENV === 'production'
const jwtSecret = process.env.JWT_SECRET || (!isProduction ? 'client-flow-local-secret' : '')
if (isProduction && (!jwtSecret || jwtSecret.length < 32)) throw new Error('JWT_SECRET must be set to a random value of at least 32 characters in production')
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim())
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: (origin, callback) => !origin || allowedOrigins.includes(origin) ? callback(null, true) : callback(new Error('Origin not allowed')), credentials: false }))
app.use(express.json({ limit: '16kb' }))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }))
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false })

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, bio: user.bio })
const tokenFor = (user) => jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' })
const auth = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Требуется авторизация' })
  try { req.auth = jwt.verify(header.slice(7), jwtSecret); next() } catch { res.status(401).json({ message: 'Сессия истекла' }) }
}
const optionalAuth = (req, _res, next) => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) { try { req.auth = jwt.verify(header.slice(7), jwtSecret) } catch { /* public request */ } }
  next()
}
const validateCredentials = (body) => body.email && body.password && body.password.length >= 6 && body.name

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'client-flow-api' }))
app.post('/api/auth/register', authLimiter, (req, res) => {
  const { name, email, password, role = 'client', bio = '' } = req.body
  if (!validateCredentials({ name, email, password }) || !['client', 'specialist'].includes(role) || name.trim().length > 100 || email.trim().length > 254 || password.length > 128 || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Проверьте имя, email и пароль от 6 до 128 символов' })
  try {
    const result = db.prepare('INSERT INTO users (name, email, password_hash, role, bio) VALUES (?, ?, ?, ?, ?)').run(name.trim(), email.trim().toLowerCase(), bcrypt.hashSync(password, 10), role, bio)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ user: publicUser(user), token: tokenFor(user) })
  } catch (error) { res.status(409).json({ message: error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'Этот email уже зарегистрирован' : 'Не удалось создать аккаунт' }) }
})
app.post('/api/auth/login', authLimiter, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(req.body.email?.trim().toLowerCase())
  if (!user || !bcrypt.compareSync(req.body.password || '', user.password_hash)) return res.status(401).json({ message: 'Неверный email или пароль' })
  res.json({ user: publicUser(user), token: tokenFor(user) })
})
app.get('/api/me', auth, (req, res) => res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth.id)) }))

app.get('/api/specialists', optionalAuth, (_req, res) => {
  const specialists = db.prepare(`SELECT id, name, bio, (SELECT COUNT(*) FROM services WHERE specialist_id = users.id) AS service_count FROM users WHERE role = 'specialist' ORDER BY name`).all()
  const serviceQuery = db.prepare('SELECT id, name, description, duration_minutes, price, category FROM services WHERE specialist_id = ? ORDER BY name')
  res.json({ specialists: specialists.map((specialist) => ({ ...specialist, services: serviceQuery.all(specialist.id) })) })
})
app.get('/api/services', (_req, res) => res.json({ services: db.prepare(`SELECT services.*, users.name AS specialist_name FROM services JOIN users ON users.id = services.specialist_id ORDER BY services.category, services.name`).all() }))

app.get('/api/appointments', auth, (req, res) => {
  const where = req.auth.role === 'specialist' ? 'appointments.specialist_id = ?' : 'appointments.client_id = ?'
  const appointments = db.prepare(`SELECT appointments.*, services.name AS service_name, services.price, users.name AS ${req.auth.role === 'specialist' ? 'client_name' : 'specialist_name'} FROM appointments JOIN services ON services.id = appointments.service_id JOIN users ON users.id = ${req.auth.role === 'specialist' ? 'appointments.client_id' : 'appointments.specialist_id'} WHERE ${where} ORDER BY starts_at`).all(req.auth.id)
  res.json({ appointments })
})
app.get('/api/availability', (req, res) => {
  const { specialistId, serviceId, date } = req.query
  if (!Number.isInteger(Number(specialistId)) || !Number.isInteger(Number(serviceId)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return res.status(400).json({ message: 'Некорректные параметры availability' })
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND specialist_id = ?').get(serviceId, specialistId)
  if (!service || !date) return res.status(400).json({ message: 'Нужны specialistId, serviceId и date' })
  const day = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(day.getTime())) return res.status(400).json({ message: 'Некорректная дата' })
  const slots = []
  for (let hour = 9; hour < 19; hour++) {
    const startsAt = new Date(day); startsAt.setUTCHours(hour, 0, 0, 0)
    const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60000)
    const conflict = db.prepare(`SELECT id FROM appointments WHERE specialist_id = ? AND status = 'confirmed' AND starts_at < ? AND ends_at > ?`).get(specialistId, endsAt.toISOString(), startsAt.toISOString())
    if (!conflict && endsAt.getUTCHours() <= 20) slots.push(startsAt.toISOString())
  }
  res.json({ slots, service })
})
app.post('/api/appointments', auth, (req, res) => {
  const { specialistId, serviceId, startsAt } = req.body
  if (!Number.isInteger(Number(specialistId)) || !Number.isInteger(Number(serviceId)) || typeof startsAt !== 'string') return res.status(400).json({ message: 'Некорректные параметры записи' })
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND specialist_id = ?').get(serviceId, specialistId)
  if (!service || req.auth.role !== 'client') return res.status(400).json({ message: 'Выберите доступную услугу' })
  const starts = new Date(startsAt)
  if (Number.isNaN(starts.getTime()) || starts.getTime() < Date.now()) return res.status(400).json({ message: 'Выберите корректное время в будущем' })
  const ends = new Date(starts.getTime() + service.duration_minutes * 60000)
  const createAppointment = db.transaction(() => {
    const conflict = db.prepare("SELECT id FROM appointments WHERE specialist_id = ? AND status = 'confirmed' AND starts_at < ? AND ends_at > ?").get(specialistId, ends.toISOString(), starts.toISOString())
    if (conflict) return null
    return db.prepare('INSERT INTO appointments (client_id, specialist_id, service_id, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)').run(req.auth.id, specialistId, serviceId, starts.toISOString(), ends.toISOString()).lastInsertRowid
  })
  const appointmentId = createAppointment()
  if (!appointmentId) return res.status(409).json({ message: 'Это время уже занято' })
  res.status(201).json({ appointment: db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId) })
})
app.patch('/api/appointments/:id/cancel', auth, (req, res) => {
  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ? AND (client_id = ? OR specialist_id = ?)').get(req.params.id, req.auth.id, req.auth.id)
  if (!appointment) return res.status(404).json({ message: 'Запись не найдена' })
  db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appointment.id)
  res.json({ ok: true })
})
app.post('/api/services', auth, (req, res) => {
  if (req.auth.role !== 'specialist') return res.status(403).json({ message: 'Только специалисты могут создавать услуги' })
  const { name, description = '', durationMinutes = 60, price = 0, category = 'Другое' } = req.body
  if (typeof name !== 'string' || !name.trim() || name.length > 120 || !Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 15 || Number(durationMinutes) > 480 || !Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 100000000) return res.status(400).json({ message: 'Проверьте название, длительность и стоимость услуги' })
  const result = db.prepare('INSERT INTO services (specialist_id, name, description, duration_minutes, price, category) VALUES (?, ?, ?, ?, ?, ?)').run(req.auth.id, name, description, Number(durationMinutes), Number(price), category)
  res.status(201).json({ service: db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid) })
})

app.listen(port, () => console.log(`Client Flow API: http://localhost:${port}`))
