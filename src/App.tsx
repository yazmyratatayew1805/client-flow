import { useState } from 'react'
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, Menu, Play, Scissors, Sparkles, Star, Users, X } from 'lucide-react'
import './App.css'
import { AuthModal, Portal } from './Portal'

const categories = ['Все специалисты', 'Фитнес', 'Красота', 'Барберы']
const people = [
  { name: 'Екатерина Ким', role: 'Фитнес-тренер', tone: 'violet', initials: 'ЕК' },
  { name: 'Мария Ковалева', role: 'Стилист', tone: 'orange', initials: 'МК' },
  { name: 'Алексей Воронцов', role: 'Барбер', tone: 'green', initials: 'АВ' },
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Все специалисты')
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null)
  const [session, setSession] = useState<{ user: { id: number; name: string; email: string; role: 'client' | 'specialist'; bio: string }; token: string } | null>(() => {
    const saved = localStorage.getItem('client-flow-session')
    return saved ? JSON.parse(saved) : null
  })
  const signIn = (user: typeof session extends infer S ? S extends { user: infer U } ? U : never : never, token: string) => {
    const next = { user, token } as typeof session
    setSession(next)
    localStorage.setItem('client-flow-session', JSON.stringify(next))
    setAuthMode(null)
  }
  if (session) return <Portal user={session.user} token={session.token} onLogout={() => { localStorage.removeItem('client-flow-session'); setSession(null) }} />

  return (
    <div className="landing-page">
      <header className="site-header">
        <a className="site-logo" href="#top" aria-label="Client Flow"><span className="logo-symbol">↗</span><span>client<span>flow</span></span></a>
        <nav className={menuOpen ? 'site-nav open' : 'site-nav'}><a href="#how">Возможности</a><a href="#specialists">Для специалистов</a><a href="#stories">Истории клиентов</a><a href="#pricing">Тарифы</a></nav>
        <div className="header-actions"><button className="login-button" onClick={() => setAuthMode('login')}>Войти</button><button className="header-cta" onClick={() => setAuthMode('register')}>Начать бесплатно <ArrowRight size={15} /></button></div>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Меню">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </header>

      <main id="top">
        <section className="hero-section"><div className="hero-glow glow-one" /><div className="hero-glow glow-two" /><div className="hero-copy"><div className="hero-kicker"><span className="kicker-dot" /> ПЛАТФОРМА ДЛЯ СЕРВИСНОГО БИЗНЕСА</div><h1>Ваши клиенты.<br /><em>Ваше время.</em><br />Ваш рост.</h1><p className="hero-description">Client Flow объединяет запись, расписание и отношения с клиентами в одном красивом рабочем пространстве.</p><div className="hero-actions"><button className="hero-primary" onClick={() => setAuthMode('register')}>Попробовать бесплатно <ArrowRight size={18} /></button><button className="hero-secondary" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}><span className="play-icon"><Play size={12} fill="currentColor" /></span> Как это работает</button></div><div className="trust-row"><div className="avatar-stack"><i>АК</i><i>МК</i><i>ЕП</i><i>+2k</i></div><span>Уже выбирают 2 000+ специалистов</span></div></div><div className="hero-visual"><div className="booking-card"><div className="booking-head"><div><span className="mini-label">ЗАПИСЬ ОНЛАЙН</span><h3>Найдите своего специалиста</h3></div><span className="tiny-mark">↗</span></div><div className="booking-search"><span>⌕</span><span className="placeholder">Услуга или специалист</span><ChevronDown size={15} /></div><div className="booking-tabs"><button className="selected-tab">Все</button><button>Фитнес</button><button>Красота</button></div><div className="mini-specialists">{people.map((person) => <div className="mini-person" key={person.name}><div className={`person-image ${person.tone}`}>{person.initials}</div><div><strong>{person.name}</strong><span>{person.role}</span><div className="rating"><Star size={11} fill="currentColor" /> 4.9 <b>·</b> от 1 500 ₽</div></div><button className="round-arrow"><ArrowRight size={14} /></button></div>)}</div><div className="booking-foot"><span><Check size={14} /> Мгновенное подтверждение</span><span><Clock3 size={13} /> Без звонков</span></div></div><div className="floating-card availability"><div className="calendar-icon"><CalendarDays size={19} /></div><div><span>БЛИЖАЙШИЙ СЛОТ</span><strong>Сегодня, 18:30</strong></div><span className="available-dot" /></div><div className="floating-card clients"><div className="clients-icon"><Users size={18} /></div><div><span>НОВЫХ ЗАПИСЕЙ</span><strong>+24 за неделю</strong></div><span className="trend">↗</span></div><div className="scribble">made for<br /><b>human work</b></div></div></section>

        <section className="logo-strip"><span>Для тех, кто создает лучшие моменты</span><div><b>FORMA</b><b>bodylab</b><b>MONO</b><b>ATHLETICA</b><b>studio 17</b></div></section>

        <section className="how-section" id="how"><div className="section-intro"><div><span className="section-number">01 / ПРОСТОТА</span><h2>Меньше рутины.<br /><span>Больше любимой работы.</span></h2></div><p>Client Flow берет на себя организационные детали, чтобы вы могли сосредоточиться на том, ради чего начали свое дело.</p></div><div className="feature-grid"><article className="feature-card feature-dark"><div className="feature-icon"><CalendarDays size={20} /></div><span className="feature-number">01</span><h3>Запись, которая<br />работает сама</h3><p>Клиенты видят свободные слоты и бронируют в любое время. Вы просто открываете календарь.</p><div className="fake-calendar"><div className="fake-cal-top"><b>Июнь 2023</b><span>‹ &nbsp; ›</span></div><div className="cal-days"><span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span></div><div className="cal-dates"><i>19</i><i>20</i><i>21</i><i className="active-date">22</i><i>23</i><i>24</i><i>25</i></div></div></article><article className="feature-card feature-orange"><div className="feature-icon"><Sparkles size={20} /></div><span className="feature-number">02</span><h3>Знайте клиентов<br />по-настоящему</h3><p>История визитов, предпочтения и заметки всегда под рукой. Отношения, а не просто записи.</p><div className="quote">«Кажется, будто мы<br />знаем каждого гостя<br />всю жизнь.»<small>— Елена, Forma Studio</small></div></article><article className="feature-card feature-cream"><div className="feature-icon"><Scissors size={20} /></div><span className="feature-number">03</span><h3>Бизнес растет<br />вместе с вами</h3><p>Понимайте, что работает, управляйте командой и принимайте решения на основе данных.</p><div className="chart"><div className="chart-label"><span>Выручка</span><b>+28.4%</b></div><div className="chart-bars"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div></article></div></section>

        <section className="audience-section" id="specialists"><div className="audience-copy"><span className="section-number">02 / ДЛЯ КАЖДОГО</span><h2>Один flow для<br /><span>любого дела.</span></h2><p>От первой тренировки до любимого мастера. Client Flow подстраивается под вас, а не наоборот.</p><div className="audience-list"><button className={activeCategory === categories[0] ? 'active' : ''} onClick={() => setActiveCategory(categories[0])}>Все специалисты <ArrowRight size={16} /></button><button className={activeCategory === categories[1] ? 'active' : ''} onClick={() => setActiveCategory(categories[1])}>Тренеры и студии <ArrowRight size={16} /></button><button className={activeCategory === categories[2] ? 'active' : ''} onClick={() => setActiveCategory(categories[2])}>Салоны и мастера <ArrowRight size={16} /></button></div></div><div className="audience-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-center"><span>CF</span></div><div className="orbit-tag tag-one">FITNESS <small>24 специалиста</small></div><div className="orbit-tag tag-two">BEAUTY <small>86 специалистов</small></div><div className="orbit-tag tag-three">BARBERS <small>32 специалиста</small></div><div className="art-note">Один клиент.<br /><b>Тысячи возможностей.</b></div></div></section>

        <section className="bottom-cta" id="pricing"><div className="cta-star">✦</div><span className="section-number">ГОТОВЫ НАЧАТЬ?</span><h2>Время работать<br /><em>на себя.</em></h2><p>14 дней бесплатно. Карта не нужна.<br />Настройка займет меньше 5 минут.</p><button onClick={() => setAuthMode('register')}>Создать свое пространство <ArrowRight size={17} /></button></section>
      </main>
      <footer className="site-footer"><a className="site-logo" href="#top"><span className="logo-symbol">↗</span><span>client<span>flow</span></span></a><span>© 2023 Client Flow</span><div><a href="#how">Возможности</a><a href="#specialists">Для специалистов</a><a href="#pricing">Начать</a></div></footer>
      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} onSuccess={signIn} />}
    </div>
  )
}

export default App
