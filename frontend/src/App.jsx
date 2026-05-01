import { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  Home,
  Moon,
  LogIn,
  LogOut,
  Menu,
  Phone,
  Plus,
  Printer,
  Receipt,
  RefreshCcw,
  Send,
  MapPin,
  MessageSquare,
  Router,
  ShieldCheck,
  Sun,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  Wrench,
  Wifi
} from 'lucide-react';
import { api, getCurrentUser, setToken } from './api';

const adminNav = [
  { id: 'admin-dashboard', label: 'Dashboard', icon: Home },
  { id: 'quotes', label: 'Devis', icon: ClipboardList },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'contracts', label: 'Contrats', icon: FileText },
  { id: 'plans', label: 'Bouquets', icon: Gauge },
  { id: 'invoices', label: 'Factures', icon: Receipt },
  { id: 'payments', label: 'Paiements', icon: BadgeDollarSign },
  { id: 'equipment', label: 'Materiel', icon: Router },
  { id: 'support', label: 'Support', icon: Ticket },
  { id: 'notifications', label: 'Notifications', icon: Send },
  { id: 'users', label: 'Utilisateurs', icon: UserPlus }
];

const clientNav = [
  { id: 'client-space', label: 'Mon espace', icon: Home },
  { id: 'client-contracts', label: 'Mes contrats', icon: FileText },
  { id: 'client-invoices', label: 'Mes factures', icon: Receipt }
];

const emptySummary = {
  total_clients: 0,
  active_contracts: 0,
  suspended_contracts: 0,
  unpaid_invoices: 0,
  payments_today_usd: 0,
  open_tickets: 0
};

function money(value) {
  return `${Number(value || 0).toFixed(2)} USD`;
}

function text(value) {
  return value || '.........................................';
}

function printHtml(title, html) {
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function documentStyles() {
  return `
    <style>
      @page{size:A4;margin:14mm}
      *{box-sizing:border-box}
      body{font-family:Arial,sans-serif;color:#111;line-height:1.45;font-size:12.5px;margin:0}
      .doc{max-width:820px;margin:0 auto}
      .doc-header{display:flex;justify-content:space-between;gap:18px;border-bottom:3px solid #08765d;padding-bottom:12px;margin-bottom:14px}
      .brand-title{font-size:24px;font-weight:800;color:#044a3c;letter-spacing:0}
      .brand-sub{color:#555;margin-top:3px}
      .doc-title{text-align:right}
      .doc-title h1{font-size:18px;margin:0 0 6px;text-transform:uppercase}
      .badge{display:inline-block;padding:5px 9px;border-radius:999px;background:#fff3d1;color:#5c3d00;font-weight:700}
      .box{border:1px solid #cfd8d4;border-radius:8px;padding:10px 12px;margin:10px 0;background:#fbfdfc}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .field-line{display:flex;gap:6px;margin:4px 0}.field-line strong{min-width:130px;color:#044a3c}
      h2{font-size:13px;color:#044a3c;margin:14px 0 6px;text-transform:uppercase}
      p{margin:6px 0}
      table{width:100%;border-collapse:collapse;margin:8px 0 12px}
      th{background:#08765d;color:#fff}
      th,td{border:1px solid #bfcac5;padding:6px;text-align:left;vertical-align:top}
      .selected{background:#e8f7f2;font-weight:700}
      .signature{display:grid;grid-template-columns:1fr 1fr;gap:38px;margin-top:24px}
      .signature-box{min-height:112px;border-top:1px solid #111;padding-top:8px}
      .small{font-size:11px;color:#555}
      .footer{border-top:1px solid #cfd8d4;margin-top:18px;padding-top:8px;color:#555;font-size:11px;text-align:center}
      @media print{.doc{max-width:none}.box{break-inside:avoid}table{break-inside:avoid}}
    </style>`;
}

function selectedMark(name, current) {
  return name === current ? '[X]' : '[ ]';
}

function App() {
  const [active, setActive] = useState(localStorage.getItem('lwasiva_token') ? 'admin-dashboard' : 'home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tokenState, setTokenState] = useState(localStorage.getItem('lwasiva_token') || '');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [theme, setTheme] = useState(localStorage.getItem('lwasiva_theme') || 'light');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    summary: emptySummary,
    plans: [],
    clients: [],
    contracts: [],
    balances: [],
    equipmentStatus: [],
    invoices: [],
    unpaidInvoices: [],
    payments: [],
    kits: [],
    tickets: [],
    quotes: [],
    users: [],
  notificationLogs: [],
    publicFeedback: [],
    contactMessages: [],
    allFeedback: [],
    clientSpace: { client: null, contracts: [], invoices: [], payments: [] }
  });

  const isLoggedIn = Boolean(tokenState);
  const isClient = currentUser?.role === 'client';
  const navItems = isClient ? clientNav : adminNav;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('lwasiva_theme', theme);
  }, [theme]);

  async function loadAll() {
    setLoading(true);
    try {
      const [publicPlans, publicFeedback] = await Promise.all([
        api.plans().catch(() => []),
        api.publicFeedback().catch(() => [])
      ]);
      if (!isLoggedIn) {
        setData((previous) => ({ ...previous, plans: publicPlans, publicFeedback }));
        return;
      }

      if (isClient) {
        const clientSpace = await api.clientSpace().catch(() => ({ client: null, contracts: [], invoices: [], payments: [] }));
        setData((previous) => ({ ...previous, plans: publicPlans, clientSpace }));
        return;
      }

      const [summary, clients, contracts, balances, equipmentStatus, invoices, unpaidInvoices, payments, kits, tickets, quotes, users, notificationLogs, contactMessages, allFeedback] =
        await Promise.all([
          api.summary().catch(() => emptySummary),
          api.clients().catch(() => []),
          api.contracts().catch(() => []),
          api.balances().catch(() => []),
          api.equipmentStatus().catch(() => []),
          api.invoices().catch(() => []),
          api.unpaidInvoices().catch(() => []),
          api.payments().catch(() => []),
          api.kits().catch(() => []),
          api.tickets().catch(() => []),
          api.quotes().catch(() => []),
          api.users().catch(() => []),
          api.notificationLogs().catch(() => []),
          api.contactMessages().catch(() => []),
          api.allFeedback().catch(() => [])
        ]);

      setData({
        summary,
        plans: publicPlans,
        clients,
        contracts,
        balances,
        equipmentStatus,
        invoices,
        unpaidInvoices,
        payments,
        kits,
        tickets,
        quotes,
        users,
        notificationLogs,
        publicFeedback,
        contactMessages,
        allFeedback,
        clientSpace: { client: null, contracts: [], invoices: [], payments: [] }
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [tokenState]);

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  }

  async function submit(handler, successMessage) {
    try {
      await handler();
      notify(successMessage);
      await loadAll();
    } catch (error) {
      notify(error.message);
    }
  }

  function logout() {
    setToken('');
    setTokenState('');
    setCurrentUser(null);
    setActive('home');
    notify('Session fermee');
  }

  function onLoggedIn(token) {
    setToken(token);
    setTokenState(token);
    const user = getCurrentUser();
    setCurrentUser(user);
    setActive(user?.role === 'client' ? 'client-space' : 'admin-dashboard');
    notify('Connexion reussie');
  }

  const activeTitle = useMemo(() => {
    if (!isLoggedIn) return active === 'login' ? 'Connexion' : 'Accueil';
    return navItems.find((item) => item.id === active)?.label || 'Dashboard';
  }, [active, isLoggedIn, navItems]);

  if (!isLoggedIn) {
    return (
      <PublicShell active={active} setActive={setActive} toast={toast} theme={theme} setTheme={setTheme}>
        {active === 'login' ? (
          <LoginPanel onLoggedIn={onLoggedIn} notify={notify} />
        ) : (
          <PublicHome plans={data.plans} feedback={data.publicFeedback} submit={submit} setActive={setActive} />
        )}
      </PublicShell>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">LN</div>
          <div>
            <strong>LWASIVA_NET</strong>
            <span>{isClient ? 'Espace client' : 'Administration'}</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={active === item.id ? 'active' : ''}
                onClick={() => {
                  setActive(item.id);
                  setSidebarOpen(false);
                }}
                title={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen((value) => !value)} title="Menu">
            <Menu size={20} />
          </button>
          <div>
            <h1>{activeTitle}</h1>
            <p>{currentUser?.fullName || 'Gestion des abonnements Internet'}</p>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Changer le theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="icon-button" onClick={loadAll} title="Actualiser">
              <RefreshCcw size={18} className={loading ? 'spin' : ''} />
            </button>
            <button className="text-button" onClick={logout}>
              <LogOut size={17} />
              Session
            </button>
          </div>
        </header>

        {toast && <div className="toast">{toast}</div>}

        <section className="content">
          {!isClient && active === 'admin-dashboard' && <Dashboard data={data} />}
          {!isClient && active === 'quotes' && <Quotes data={data} submit={submit} />}
          {!isClient && active === 'clients' && <Clients data={data} submit={submit} />}
          {!isClient && active === 'contracts' && <Contracts data={data} submit={submit} />}
          {!isClient && active === 'plans' && <Plans data={data} />}
          {!isClient && active === 'invoices' && <Invoices data={data} submit={submit} />}
          {!isClient && active === 'payments' && <Payments data={data} submit={submit} />}
          {!isClient && active === 'equipment' && <Equipment data={data} submit={submit} />}
          {!isClient && active === 'support' && <Support data={data} submit={submit} />}
          {!isClient && active === 'notifications' && <Notifications data={data} submit={submit} />}
          {!isClient && active === 'users' && <UsersAdmin data={data} submit={submit} />}
          {isClient && active === 'client-space' && <ClientSpace data={data.clientSpace} />}
          {isClient && active === 'client-contracts' && <ClientContracts data={data.clientSpace} />}
          {isClient && active === 'client-invoices' && <ClientInvoices data={data.clientSpace} />}
        </section>
      </main>
    </div>
  );
}

function PublicShell({ active, setActive, toast, theme, setTheme, children }) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="brand public-brand">
          <div className="brand-mark">LN</div>
          <div>
            <strong>LWASIVA_NET</strong>
            <span>Internet haut debit a Goma</span>
          </div>
        </div>
        <nav>
          <button className="public-icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Changer le theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className={active === 'home' ? 'active' : ''} onClick={() => setActive('home')}>
            <Home size={17} />
            Accueil
          </button>
          <button className={active === 'login' ? 'active' : ''} onClick={() => setActive('login')}>
            <LogIn size={17} />
            Connexion
          </button>
        </nav>
      </header>
      {toast && <div className="toast">{toast}</div>}
      {children}
    </div>
  );
}

function PublicHome({ plans, feedback, submit, setActive }) {
  const [form, setForm] = useState({
    fullName: '',
    clientType: 'particulier',
    phone: '',
    email: '',
    address: '',
    planId: '',
    intendedUsage: '',
    message: ''
  });
  const [contactForm, setContactForm] = useState({ fullName: '', phone: '', email: '', subject: '', message: '' });
  const [feedbackForm, setFeedbackForm] = useState({ fullName: '', neighborhood: '', rating: 5, comment: '' });

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span>Goma, Nord-Kivu, RDC</span>
          <h1>LWASIVA_NET</h1>
          <p>Connexion Internet sans fil pour foyers, entreprises locales, streaming, teletravail, appels video et usages professionnels.</p>
          <div className="hero-stats">
            <div><strong>24/7</strong><span>Service suivi</span></div>
            <div><strong>5-30</strong><span>Mbps disponibles</span></div>
            <div><strong>100$</strong><span>Kit standard</span></div>
          </div>
          <div className="hero-actions">
            <a href="#devis" className="primary-link">Demander un devis</a>
            <button className="secondary-link" onClick={() => setActive('login')}>Espace client/admin</button>
          </div>
        </div>
      </section>

      <section className="public-contact-strip">
        <div>
          <Phone size={18} />
          <span>Contact officiel</span>
          <strong>+243 980 208 012</strong>
        </div>
        <div>
          <ShieldCheck size={18} />
          <span>Zone</span>
          <strong>Goma, Nord-Kivu</strong>
        </div>
        <div>
          <Wifi size={18} />
          <span>Technologie</span>
          <strong>Liaison sans fil</strong>
        </div>
      </section>

      <section className="public-section">
        <div className="section-heading">
          <Wifi size={22} />
          <h2>Nos offres Internet</h2>
        </div>
        <div className="plan-grid">
          {plans.map((plan) => (
            <div className="plan" key={plan.id}>
              <div><Router size={22} /><strong>{plan.name}</strong></div>
              <span>{plan.recommended_usage}</span>
              <p>{plan.bandwidth_mbps} Mbps</p>
              <b>{money(plan.monthly_price_usd)} / mois</b>
            </div>
          ))}
        </div>
      </section>

      <section className="public-section info-grid">
        <InfoCard icon={Building2} title="Entreprise" text="LWASIVA_NET fournit un acces Internet haut debit par liaison sans fil dans la ville de Goma." />
        <InfoCard icon={ShieldCheck} title="Contrat clair" text="Chaque abonnement est encadre par un contrat, une periode d essai et une interdiction de revente." />
        <InfoCard icon={Boxes} title="Kit installation" text="Antenne CPE, routeur Wi-Fi, cablage et accessoires, avec paiement possible par tranches." />
        <InfoCard icon={Phone} title="Support" text="Une equipe technique suit les pannes, interventions et demandes des abonnes." />
      </section>

      <section className="public-section service-showcase">
        <div className="showcase-copy">
          <div className="section-heading">
            <Wrench size={22} />
            <h2>Installation et suivi</h2>
          </div>
          <p>Notre equipe installe le kit chez le client, verifie le signal, configure le routeur Wi-Fi et garde un suivi dans l'espace admin.</p>
          <div className="step-list">
            <div><CheckCircle2 size={18} /><span>Verification de l'adresse et du signal</span></div>
            <div><CheckCircle2 size={18} /><span>Installation antenne CPE et routeur Wi-Fi</span></div>
            <div><CheckCircle2 size={18} /><span>Activation du bouquet choisi</span></div>
            <div><CheckCircle2 size={18} /><span>Support technique en cas de panne</span></div>
          </div>
        </div>
        <div className="photo-grid">
          <img src="https://images.unsplash.com/photo-1597424216809-3ba9864a6f1d?auto=format&fit=crop&w=900&q=80" alt="Technicien reseau" />
          <img src="https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=900&q=80" alt="Equipement Internet" />
        </div>
      </section>

      <section className="public-section process-strip">
        <div><ClipboardList size={20} /><strong>1. Demande</strong><span>Le client envoie son devis depuis l'accueil.</span></div>
        <div><ShieldCheck size={20} /><strong>2. Validation</strong><span>L'administration verifie et valide la demande.</span></div>
        <div><FileText size={20} /><strong>3. Contrat</strong><span>Le contrat final est imprime depuis l'espace admin.</span></div>
        <div><Wifi size={20} /><strong>4. Activation</strong><span>Le service Internet est active pour le client.</span></div>
      </section>

      <section className="public-section testimonials-section">
        <div className="section-heading">
          <MessageSquare size={22} />
          <h2>Appreciations clients</h2>
        </div>
        <div className="testimonial-grid">
          {feedback.length === 0 ? (
            <div className="testimonial-card"><strong>LWASIVA_NET</strong><p>Les appreciations validees par l'administration seront affichees ici.</p></div>
          ) : feedback.map((item) => (
            <div className="testimonial-card" key={item.id}>
              <div className="stars">{'★'.repeat(Number(item.rating || 5))}</div>
              <p>{item.comment}</p>
              <strong>{item.full_name}</strong>
              <span>{item.neighborhood || 'Goma'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="public-section" id="devis">
        <div className="panel">
          <PanelHeader icon={ClipboardList} title="Demande de devis" />
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              submit(() => api.createQuote(form), 'Votre demande a ete envoyee a l administration');
              setForm({ fullName: '', clientType: 'particulier', phone: '', email: '', address: '', planId: '', intendedUsage: '', message: '' });
            }}
          >
            <TextInput label="Nom complet" value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} />
            <SelectInput label="Type" value={form.clientType} onChange={(clientType) => setForm({ ...form, clientType })} options={['particulier', 'entreprise']} />
            <TextInput label="Telephone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
            <TextInput label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
            <SelectInput label="Bouquet souhaite" value={form.planId} onChange={(planId) => setForm({ ...form, planId })} options={plans.map((plan) => ({ value: plan.id, label: `${plan.name} - ${money(plan.monthly_price_usd)}` }))} />
            <TextInput label="Adresse installation" value={form.address} onChange={(address) => setForm({ ...form, address })} />
            <TextInput label="Usage prevu" value={form.intendedUsage} onChange={(intendedUsage) => setForm({ ...form, intendedUsage })} />
            <TextInput label="Message" value={form.message} onChange={(message) => setForm({ ...form, message })} />
            <button className="primary-button"><Plus size={17} /> Envoyer</button>
          </form>
        </div>
      </section>

      <section className="public-section contact-feedback-grid" id="contact">
        <div className="panel">
          <PanelHeader icon={Phone} title="Contact" />
          <form
            className="form-grid two"
            onSubmit={(event) => {
              event.preventDefault();
              submit(() => api.sendContact(contactForm), 'Votre message a ete envoye');
              setContactForm({ fullName: '', phone: '', email: '', subject: '', message: '' });
            }}
          >
            <TextInput label="Nom complet" value={contactForm.fullName} onChange={(fullName) => setContactForm({ ...contactForm, fullName })} />
            <TextInput label="Telephone" value={contactForm.phone} onChange={(phone) => setContactForm({ ...contactForm, phone })} />
            <TextInput label="Email" value={contactForm.email} onChange={(email) => setContactForm({ ...contactForm, email })} />
            <TextInput label="Sujet" value={contactForm.subject} onChange={(subject) => setContactForm({ ...contactForm, subject })} />
            <TextInput label="Message" value={contactForm.message} onChange={(message) => setContactForm({ ...contactForm, message })} />
            <button className="primary-button"><Send size={17} /> Envoyer</button>
          </form>
        </div>

        <div className="panel">
          <PanelHeader icon={MessageSquare} title="Laisser une appreciation" />
          <form
            className="form-grid two"
            onSubmit={(event) => {
              event.preventDefault();
              submit(() => api.sendFeedback(feedbackForm), 'Merci pour votre appreciation');
              setFeedbackForm({ fullName: '', neighborhood: '', rating: 5, comment: '' });
            }}
          >
            <TextInput label="Nom complet" value={feedbackForm.fullName} onChange={(fullName) => setFeedbackForm({ ...feedbackForm, fullName })} />
            <TextInput label="Quartier" value={feedbackForm.neighborhood} onChange={(neighborhood) => setFeedbackForm({ ...feedbackForm, neighborhood })} />
            <SelectInput label="Note" value={feedbackForm.rating} onChange={(rating) => setFeedbackForm({ ...feedbackForm, rating })} options={[1, 2, 3, 4, 5].map((value) => ({ value, label: `${value}/5` }))} />
            <TextInput label="Commentaire" value={feedbackForm.comment} onChange={(comment) => setFeedbackForm({ ...feedbackForm, comment })} />
            <button className="primary-button"><MessageSquare size={17} /> Envoyer</button>
          </form>
        </div>
      </section>
    </>
  );
}

function InfoCard({ icon: Icon, title, text }) {
  return (
    <div className="info-card">
      <Icon size={22} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function LoginPanel({ onLoggedIn, notify }) {
  const [form, setForm] = useState({ email: '', password: '' });

  async function login(event) {
    event.preventDefault();
    try {
      const result = await api.login(form);
      onLoggedIn(result.token);
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-visual">
          <div className="brand-mark login-mark">LN</div>
          <h1>LWASIVA_NET</h1>
          <p>Espace reserve aux agents et aux clients ayant deja un compte.</p>
          <div className="login-points">
            <span><ShieldCheck size={17} /> Acces securise</span>
            <span><Users size={17} /> Admin et client</span>
            <span><Wifi size={17} /> Suivi abonnement</span>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-heading">
            <LogIn size={22} />
            <div>
              <h2>Connexion</h2>
              <p>Entrez vos identifiants pour continuer.</p>
            </div>
          </div>
          <form className="login-form" onSubmit={login}>
            <TextInput label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
            <TextInput label="Mot de passe" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
            <button className="primary-button login-submit">Se connecter</button>
          </form>
          <div className="login-help">
            <strong>Besoin d'un compte ?</strong>
            <span>L'administration cree les comptes clients apres validation du devis.</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function Dashboard({ data }) {
  const cards = [
    ['Clients', data.summary.total_clients, Users],
    ['Contrats actifs', data.summary.active_contracts, ClipboardList],
    ['Suspendus', data.summary.suspended_contracts, FileText],
    ['Devis recus', data.quotes.length, ClipboardList],
    ['Paiements du jour', money(data.summary.payments_today_usd), BadgeDollarSign],
    ['Tickets ouverts', data.summary.open_tickets, Ticket]
  ];

  return (
    <>
      <div className="metric-grid">
        {cards.map(([label, value, Icon]) => (
          <div className="metric" key={label}>
            <Icon size={20} />
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="two-columns">
        <TablePanel title="Derniers devis" icon={ClipboardList} columns={['Numero', 'Client', 'Telephone', 'Statut']} rows={data.quotes.slice(0, 8).map((item) => [item.quote_number, item.full_name, item.phone, item.status])} />
        <TablePanel title="Factures a suivre" icon={Receipt} columns={['Client', 'Telephone', 'Reste', 'Echeance']} rows={data.unpaidInvoices.slice(0, 8).map((item) => [item.client_name, item.client_phone, money(item.remaining_amount_usd), item.due_date])} />
      </div>
      <div className="two-columns">
        <TablePanel title="Messages contact" icon={Phone} columns={['Nom', 'Telephone', 'Sujet', 'Statut']} rows={data.contactMessages.slice(0, 8).map((item) => [item.full_name, item.phone, item.subject, item.status])} />
        <TablePanel title="Appreciations recues" icon={MessageSquare} columns={['Nom', 'Quartier', 'Note', 'Statut']} rows={data.allFeedback.slice(0, 8).map((item) => [item.full_name, item.neighborhood || '-', `${item.rating}/5`, item.status])} />
      </div>
    </>
  );
}

function Quotes({ data, submit }) {
  function printQuote(item) {
    const html = `
      <html>
        <head><title>${item.quote_number}</title>${documentStyles()}</head>
        <body>
          <main class="doc">
            <header class="doc-header">
              <div>
                <div class="brand-title">LWASIVA_NET</div>
                <div class="brand-sub">Internet haut debit sans fil - Goma, Nord-Kivu, RDC</div>
                <div class="brand-sub">Contact officiel : +243 980 208 012</div>
              </div>
              <div class="doc-title">
                <h1>Devis Internet</h1>
                <span class="badge">${item.quote_number}</span>
              </div>
            </header>
            <section class="grid">
              <div class="box">
                <h2>Client</h2>
                <div class="field-line"><strong>Nom</strong><span>${text(item.full_name)}</span></div>
                <div class="field-line"><strong>Type</strong><span>${text(item.client_type)}</span></div>
                <div class="field-line"><strong>Telephone</strong><span>${text(item.phone)}</span></div>
                <div class="field-line"><strong>Email</strong><span>${item.email || '-'}</span></div>
                <div class="field-line"><strong>Adresse</strong><span>${text(item.address)}</span></div>
              </div>
              <div class="box">
                <h2>Offre demandee</h2>
                <div class="field-line"><strong>Bouquet</strong><span>${item.plan_name || '-'}</span></div>
                <div class="field-line"><strong>Debit</strong><span>${item.bandwidth_mbps ? `${item.bandwidth_mbps} Mbps` : '-'}</span></div>
                <div class="field-line"><strong>Prix mensuel</strong><span>${money(item.monthly_price_usd)}</span></div>
                <div class="field-line"><strong>Usage</strong><span>${item.intended_usage || '-'}</span></div>
                <div class="field-line"><strong>Statut</strong><span>${item.status}</span></div>
              </div>
            </section>
            <section class="box">
              <h2>Details commerciaux</h2>
              <table>
                <thead><tr><th>Element</th><th>Description</th><th>Montant</th></tr></thead>
                <tbody>
                  <tr><td>Abonnement mensuel</td><td>${item.plan_name || 'Bouquet a confirmer'}</td><td>${money(item.monthly_price_usd)}</td></tr>
                  <tr><td>Kit installation standard</td><td>Antenne CPE, routeur Wi-Fi, cablage et accessoires</td><td>100.00 USD</td></tr>
                  <tr><td>Tranche initiale</td><td>A payer a l'installation</td><td>20.00 USD</td></tr>
                </tbody>
              </table>
              <p class="small">Ce devis est transmis a l'administration LWASIVA_NET. Le contrat final est imprime uniquement depuis l'espace admin.</p>
            </section>
            <section class="signature">
              <div class="signature-box"><strong>Pour LWASIVA_NET</strong><p>Nom : KITSA LUSENGE LWASIVA Sage</p><p>Date : ..... / ..... / 202...</p></div>
              <div class="signature-box"><strong>Pour le demandeur</strong><p>Nom : ${text(item.full_name)}</p><p>Date : ..... / ..... / 202...</p></div>
            </section>
            <footer class="footer">LWASIVA_NET - Devis imprime par l'administration</footer>
          </main>
        </body>
      </html>`;
    printHtml(item.quote_number, html);
  }

  return (
    <div className="panel table-panel">
      <PanelHeader icon={ClipboardList} title="Devis recus depuis l accueil" />
      <div className="quote-list">
        {data.quotes.length === 0 ? <p className="muted">Aucun devis recu</p> : data.quotes.map((item) => (
          <div className="quote-item" key={item.id}>
            <div>
              <strong>{item.quote_number} - {item.full_name}</strong>
              <span>{item.phone} - {item.address} - {item.plan_name || 'Bouquet non precise'}</span>
            </div>
            <div className="quote-actions">
              <button className="icon-button" title="Imprimer" onClick={() => printQuote(item)}><Printer size={17} /></button>
              <button className="small-button" onClick={() => submit(() => api.updateQuoteStatus(item.id, { status: 'valide', adminNotes: item.admin_notes || '' }), 'Devis valide')}>Valider</button>
              <button className="small-button" onClick={() => submit(() => api.updateQuoteStatus(item.id, { status: 'rejete', adminNotes: item.admin_notes || '' }), 'Devis rejete')}>Rejeter</button>
              <button className="small-button" onClick={() => submit(() => api.convertQuoteToClient(item.id), 'Client cree depuis le devis')}>Creer client</button>
              <button className="small-button danger" onClick={() => submit(() => api.deleteQuote(item.id), 'Devis supprime')}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function printContractDocument(item) {
  const selectedPlan = item.plan_name || '.........................................';
  const html = `
    <html>
      <head><title>${item.contract_number}</title>${documentStyles()}</head>
      <body>
        <main class="doc">
          <header class="doc-header">
            <div>
              <div class="brand-title">LWASIVA_NET</div>
              <div class="brand-sub">Fournisseur d'Acces Internet - Goma, Nord-Kivu, RDC</div>
              <div class="brand-sub">Representant : KITSA LUSENGE LWASIVA Sage - +243 980 208 012</div>
            </div>
            <div class="doc-title">
              <h1>Contrat d'Abonnement</h1>
              <span class="badge">Num : ${text(item.contract_number)}</span>
            </div>
          </header>

          <section class="box">
            <div class="field-line"><strong>Fait a</strong><span>Goma, Province du Nord-Kivu, RDC</span></div>
            <div class="field-line"><strong>Client</strong><span>${text(item.client_name)}</span></div>
            <div class="field-line"><strong>Adresse</strong><span>${text(item.installation_address || item.client_address)}</span></div>
            <div class="field-line"><strong>Telephone</strong><span>${text(item.client_phone)}</span></div>
          </section>

          <h2>Article 1 : Objet du Contrat</h2>
          <p>Le present contrat definit les conditions techniques, juridiques et financieres dans lesquelles LWASIVA_NET fournit au Client un acces Internet haut debit par liaison sans fil, ainsi que les equipements necessaires a la reception du signal.</p>

          <h2>Article 2 : Offre choisie</h2>
          <table>
            <thead><tr><th>Choix</th><th>Bouquet</th><th>Debit</th><th>Usage recommande</th><th>Prix mensuel</th></tr></thead>
            <tbody>
              <tr class="${selectedPlan === 'Basic Home' ? 'selected' : ''}"><td>${selectedMark('Basic Home', selectedPlan)}</td><td>Basic Home</td><td>Jusqu'a 5 Mbps</td><td>Navigation, reseaux sociaux, video SD</td><td>15 USD</td></tr>
              <tr class="${selectedPlan === 'Stream Plus' ? 'selected' : ''}"><td>${selectedMark('Stream Plus', selectedPlan)}</td><td>Stream Plus</td><td>Jusqu'a 10 Mbps</td><td>Streaming HD, teletravail</td><td>20 USD</td></tr>
              <tr class="${selectedPlan === 'Pro Ultra' ? 'selected' : ''}"><td>${selectedMark('Pro Ultra', selectedPlan)}</td><td>Pro Ultra</td><td>Jusqu'a 30 Mbps</td><td>Streaming 4K, gaming, multi-utilisateurs</td><td>50 USD</td></tr>
            </tbody>
          </table>
          <p>Le Client souscrit au bouquet <strong>${selectedPlan}</strong>, avec un debit de <strong>${text(item.bandwidth_mbps ? `${item.bandwidth_mbps} Mbps` : '')}</strong> et un tarif mensuel de <strong>${money(item.monthly_price_usd)}</strong>.</p>
          <p>LWASIVA_NET configure le service pour une connexion stable, une faible latence, le streaming video, les appels video et les telechargements rapides, dans la limite du bouquet choisi.</p>

          <h2>Article 3 : Equipements et paiement par tranches</h2>
          <p>L'installation du kit de connexion est indispensable : antenne receptrice/CPE, routeur Wi-Fi, cablage et accessoires. La valeur totale du kit est fixee a <strong>100 USD</strong>.</p>
          <table>
            <tbody>
              <tr><td>Tranche 1 a l'installation</td><td><strong>20 USD</strong></td></tr>
              <tr><td>Tranche mensuelle</td><td>................ USD, a payer avec l'abonnement</td></tr>
            </tbody>
          </table>
          <p><strong>Reserve de propriete :</strong> le materiel demeure la propriete de LWASIVA_NET jusqu'au paiement complet. En cas de non-paiement, LWASIVA_NET peut suspendre la connexion et recuperer le materiel.</p>

          <h2>Article 4 : Interdiction de revente</h2>
          <p>La connexion est personnelle et limitee au Client, a son foyer ou a son entreprise locale. Il est interdit de revendre la bande passante, de vendre des tickets Wi-Fi, de distribuer le service vers d'autres parcelles ou de sous-louer l'acces Internet.</p>
          <p>Tout abus peut entrainer la resiliation immediate, la coupure du signal, la confiscation du materiel non paye et des poursuites judiciaires.</p>

          <h2>Article 5 : Paiement</h2>
          <p>L'abonnement mensuel est payable d'avance. Le Client doit payer deux (2) jours avant l'echeance fixee au <strong>${text(item.billing_due_day)}</strong> de chaque mois. Les paiements peuvent etre faits en especes ou via Mobile Money.</p>

          <h2>Article 6 : Service et support</h2>
          <p>LWASIVA_NET fournit le service 24h/24 et 7j/7, sauf force majeure ou maintenance programmee. Une equipe technique intervient en cas de panne signalee.</p>

          <h2>Article 7 : Duree et resiliation</h2>
          <p>Le contrat est conclu pour une duree indeterminee. Une periode d'essai de sept (7) jours est accordee a compter de l'activation. Apres cette periode, la resiliation se fait avec un preavis de quinze (15) jours. Si le materiel n'est pas totalement paye, le solde devient immediatement exigible.</p>

          <h2>Article 8 : Litiges</h2>
          <p>En cas de litige, les parties cherchent d'abord une solution amiable. A defaut, les tribunaux competents de la ville de Goma sont seuls habilites a trancher.</p>

          <section class="signature">
            <div class="signature-box"><strong>Pour l'Operateur</strong><p>Nom : KITSA LUSENGE LWASIVA Sage</p><p>Date : ..... / ..... / 202...</p><p>Signature et cachet</p></div>
            <div class="signature-box"><strong>Pour le Client</strong><p>Nom : ${text(item.client_name)}</p><p>Date : ..... / ..... / 202...</p><p>Signature precedee de la mention "Lu et approuve"</p></div>
          </section>
          <footer class="footer">LWASIVA_NET - Contrat imprime par l'administration</footer>
        </main>
      </body>
    </html>`;

  printHtml(item.contract_number, html);
}

function UsersAdmin({ data, submit }) {
  const emptyForm = { id: '', fullName: '', email: '', phone: '', password: '', role: 'manager', clientId: '' };
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(form.id);

  function editUser(item) {
    setForm({
      id: item.id,
      fullName: item.full_name,
      email: item.email,
      phone: item.phone || '',
      password: '',
      role: item.role,
      clientId: item.client_id || ''
    });
  }

  return (
    <>
      <QuickForm title={isEditing ? 'Modifier utilisateur' : 'Creer un utilisateur'} icon={UserPlus} onSubmit={() => submit(() => isEditing ? api.updateUser(form.id, form) : api.createUser(form), isEditing ? 'Utilisateur modifie' : 'Utilisateur cree')}>
        <TextInput label="Nom complet" value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} />
        <TextInput label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <TextInput label="Telephone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
        {!isEditing && <TextInput label="Mot de passe" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />}
        <SelectInput label="Role" value={form.role} onChange={(role) => setForm({ ...form, role })} options={['admin', 'manager', 'technician', 'cashier', 'client']} />
        <SelectInput label="Client lie" value={form.clientId} onChange={(clientId) => setForm({ ...form, clientId })} options={data.clients.map((client) => ({ value: client.id, label: client.full_name }))} />
        {isEditing && <button className="small-button" type="button" onClick={() => setForm(emptyForm)}>Annuler</button>}
      </QuickForm>
      <div className="panel table-panel">
        <PanelHeader icon={Users} title="Utilisateurs" />
        <div className="quote-list">
          {data.users.length === 0 ? <p className="muted">Aucun utilisateur</p> : data.users.map((item) => (
            <div className="quote-item" key={item.id}>
              <div>
                <strong>{item.full_name} - {item.role}</strong>
                <span>{item.email} - {item.client_name || 'Aucun client lie'} - {item.is_active ? 'Actif' : 'Bloque'}</span>
              </div>
              <div className="quote-actions">
                <button className="small-button" onClick={() => editUser(item)}>Modifier</button>
                <button className="small-button" onClick={() => submit(() => api.updateUser(item.id, { isActive: !item.is_active }), item.is_active ? 'Utilisateur bloque' : 'Utilisateur active')}>{item.is_active ? 'Bloquer' : 'Activer'}</button>
                <button className="small-button danger" onClick={() => submit(() => api.deleteUser(item.id), 'Utilisateur supprime')}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Notifications({ data, submit }) {
  return (
    <>
      <div className="panel">
        <PanelHeader icon={Send} title="Rappels WhatsApp a J-5" />
        <div className="action-row">
          <p className="muted">
            Envoie aux clients un rappel WhatsApp cinq jours avant la fin de leur abonnement, a partir des factures dont la periode se termine dans 5 jours.
          </p>
          <button className="primary-button" onClick={() => submit(() => api.sendWhatsAppReminders(), 'Rappels WhatsApp traites')}>
            <Send size={17} />
            Envoyer maintenant
          </button>
        </div>
      </div>
      <TablePanel
        title="Historique WhatsApp"
        icon={Send}
        columns={['Client', 'Telephone', 'Contrat', 'Facture', 'Statut', 'Date']}
        rows={data.notificationLogs.map((item) => [
          item.client_name,
          item.phone,
          item.contract_number,
          item.invoice_number,
          item.status,
          item.sent_at || item.created_at
        ])}
      />
    </>
  );
}

function ClientSpace({ data }) {
  const unpaid = data.invoices.filter((item) => item.status !== 'payee' && item.status !== 'annulee');
  const unpaidTotal = unpaid.reduce((sum, item) => sum + Number(item.total_amount_usd || 0), 0);
  const activeContract = data.contracts.find((item) => item.status === 'actif') || data.contracts[0];

  return (
    <>
      <div className="metric-grid">
        <div className="metric"><Users size={20} /><span>Client</span><strong>{data.client?.full_name || '-'}</strong></div>
        <div className="metric"><Wifi size={20} /><span>Bouquet</span><strong>{activeContract?.plan_name || '-'}</strong></div>
        <div className="metric"><Receipt size={20} /><span>Factures a payer</span><strong>{unpaid.length}</strong></div>
        <div className="metric"><BadgeDollarSign size={20} /><span>Reste a payer</span><strong>{money(unpaidTotal)}</strong></div>
      </div>
      <div className="two-columns">
        <TablePanel title="Mes contrats" icon={FileText} columns={['Numero', 'Bouquet', 'Debit', 'Statut']} rows={data.contracts.map((item) => [item.contract_number, item.plan_name, `${item.bandwidth_mbps} Mbps`, item.status])} />
        <TablePanel title="Mes factures a payer" icon={Receipt} columns={['Numero', 'Total', 'Statut', 'Echeance']} rows={unpaid.map((item) => [item.invoice_number, money(item.total_amount_usd), item.status, item.due_date])} />
      </div>
      <TablePanel title="Mes derniers paiements" icon={BadgeDollarSign} columns={['Reference', 'Montant', 'Methode', 'Date']} rows={data.payments.map((item) => [item.payment_reference, money(item.amount_usd), item.method, item.paid_at])} />
    </>
  );
}

function ClientContracts({ data }) {
  return <TablePanel title="Mes contrats" icon={FileText} columns={['Numero', 'Bouquet', 'Debit', 'Statut', 'Adresse']} rows={data.contracts.map((item) => [item.contract_number, item.plan_name, `${item.bandwidth_mbps} Mbps`, item.status, item.installation_address])} />;
}

function ClientInvoices({ data }) {
  return <TablePanel title="Mes factures" icon={Receipt} columns={['Numero', 'Periode', 'Total', 'Statut', 'Echeance']} rows={data.invoices.map((item) => [item.invoice_number, `${item.period_start} - ${item.period_end}`, money(item.total_amount_usd), item.status, item.due_date])} />;
}

function Clients({ data, submit }) {
  const emptyForm = { id: '', fullName: '', phone: '', address: '', clientType: 'particulier', email: '' };
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(form.id);

  function editClient(item) {
    setForm({
      id: item.id,
      fullName: item.full_name,
      phone: item.phone,
      address: item.address,
      clientType: item.client_type,
      email: item.email || ''
    });
  }

  return (
    <>
      <QuickForm title={isEditing ? 'Modifier client' : 'Nouveau client'} icon={Users} onSubmit={() => submit(() => isEditing ? api.updateClient(form.id, form) : api.createClient(form), isEditing ? 'Client modifie' : 'Client enregistre')}>
        <TextInput label="Nom complet" value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} />
        <TextInput label="Telephone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
        <TextInput label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <SelectInput label="Type" value={form.clientType} onChange={(clientType) => setForm({ ...form, clientType })} options={['particulier', 'entreprise']} />
        <TextInput label="Adresse" value={form.address} onChange={(address) => setForm({ ...form, address })} />
        {isEditing && <button className="small-button" type="button" onClick={() => setForm(emptyForm)}>Annuler</button>}
      </QuickForm>
      <div className="panel table-panel">
        <PanelHeader icon={Phone} title="Clients" />
        <div className="quote-list">
          {data.clients.length === 0 ? <p className="muted">Aucun client</p> : data.clients.map((item) => (
            <div className="quote-item" key={item.id}>
              <div>
                <strong>{item.client_code} - {item.full_name}</strong>
                <span>{item.phone} - {item.address}</span>
              </div>
              <div className="quote-actions">
                <button className="small-button" onClick={() => editClient(item)}>Modifier</button>
                <button className="small-button danger" onClick={() => submit(() => api.deleteClient(item.id), 'Client supprime')}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Contracts({ data, submit }) {
  const emptyForm = { id: '', clientId: '', planId: '', installationAddress: '', status: 'essai', billingDueDay: 5 };
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(form.id);

  function editContract(item) {
    setForm({
      id: item.contract_id,
      clientId: item.client_id,
      planId: item.plan_id,
      installationAddress: item.installation_address,
      status: item.status,
      billingDueDay: item.billing_due_day || 5
    });
  }

  return (
    <>
      <QuickForm title={isEditing ? 'Modifier contrat' : 'Nouveau contrat'} icon={FileText} onSubmit={() => submit(() => isEditing ? api.updateContract(form.id, form) : api.createContract(form), isEditing ? 'Contrat modifie' : 'Contrat cree')}>
        <SelectInput label="Client" value={form.clientId} onChange={(clientId) => setForm({ ...form, clientId })} options={data.clients.map((client) => ({ value: client.id, label: client.full_name }))} />
        <SelectInput label="Bouquet" value={form.planId} onChange={(planId) => setForm({ ...form, planId })} options={data.plans.map((plan) => ({ value: plan.id, label: `${plan.name} - ${money(plan.monthly_price_usd)}` }))} />
        <SelectInput label="Statut" value={form.status} onChange={(status) => setForm({ ...form, status })} options={['brouillon', 'essai', 'actif', 'suspendu']} />
        <TextInput label="Jour echeance" type="number" value={form.billingDueDay} onChange={(billingDueDay) => setForm({ ...form, billingDueDay })} />
        <TextInput label="Adresse installation" value={form.installationAddress} onChange={(installationAddress) => setForm({ ...form, installationAddress })} />
        {isEditing && <button className="small-button" type="button" onClick={() => setForm(emptyForm)}>Annuler</button>}
      </QuickForm>
      <div className="panel table-panel">
        <PanelHeader icon={ClipboardList} title="Contrats en cours" />
        <div className="quote-list">
          {data.contracts.length === 0 ? <p className="muted">Aucun contrat</p> : data.contracts.map((item) => (
            <div className="quote-item" key={item.contract_id}>
              <div>
                <strong>{item.contract_number} - {item.client_name}</strong>
                <span>{item.plan_name} - {item.status} - {item.bandwidth_mbps} Mbps</span>
              </div>
              <div className="quote-actions">
                <button className="icon-button" title="Imprimer contrat" onClick={() => printContractDocument(item)}><Printer size={17} /></button>
                <button className="small-button" onClick={() => editContract(item)}>Modifier</button>
                <button className="small-button" onClick={() => submit(() => api.updateContract(item.contract_id, { status: 'actif' }), 'Contrat active')}>Activer</button>
                <button className="small-button" onClick={() => submit(() => api.updateContract(item.contract_id, { status: 'suspendu' }), 'Contrat suspendu')}>Suspendre</button>
                <button className="small-button danger" onClick={() => submit(() => api.deleteContract(item.contract_id), 'Contrat supprime')}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <TablePanel title="Soldes contrats" icon={BadgeDollarSign} columns={['Contrat', 'Client', 'Facture', 'Paye', 'Solde']} rows={data.balances.map((item) => [item.contract_number, item.client_name, money(item.total_invoiced_usd), money(item.total_paid_usd), money(item.balance_usd)])} />
    </>
  );
}

function Plans({ data }) {
  return (
    <div className="plan-grid">
      {data.plans.map((plan) => (
        <div className="plan" key={plan.id}>
          <div><Router size={22} /><strong>{plan.name}</strong></div>
          <span>{plan.recommended_usage}</span>
          <p>{plan.bandwidth_mbps} Mbps</p>
          <b>{money(plan.monthly_price_usd)} / mois</b>
        </div>
      ))}
    </div>
  );
}

function Invoices({ data, submit }) {
  const [form, setForm] = useState({ contractId: '', periodStart: '', periodEnd: '', dueDate: '', equipmentInstallmentAmountUsd: 0, discountAmountUsd: 0 });
  return (
    <>
      <QuickForm title="Facture mensuelle" icon={Receipt} onSubmit={() => submit(() => api.createInvoice(form), 'Facture creee')}>
        <SelectInput label="Contrat" value={form.contractId} onChange={(contractId) => setForm({ ...form, contractId })} options={data.contracts.map((contract) => ({ value: contract.contract_id, label: `${contract.contract_number} - ${contract.client_name}` }))} />
        <TextInput label="Debut" type="date" value={form.periodStart} onChange={(periodStart) => setForm({ ...form, periodStart })} />
        <TextInput label="Fin" type="date" value={form.periodEnd} onChange={(periodEnd) => setForm({ ...form, periodEnd })} />
        <TextInput label="Echeance" type="date" value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} />
        <TextInput label="Tranche materiel" type="number" value={form.equipmentInstallmentAmountUsd} onChange={(equipmentInstallmentAmountUsd) => setForm({ ...form, equipmentInstallmentAmountUsd })} />
      </QuickForm>
      <TablePanel title="Factures" icon={Receipt} columns={['Numero', 'Client', 'Total', 'Statut', 'Echeance']} rows={data.invoices.map((item) => [item.invoice_number, item.client_name, money(item.total_amount_usd), item.status, item.due_date])} />
    </>
  );
}

function Payments({ data, submit }) {
  const [form, setForm] = useState({ invoiceId: '', amountUsd: '', method: 'especes', transactionNumber: '' });
  return (
    <>
      <QuickForm title="Nouveau paiement" icon={BadgeDollarSign} onSubmit={() => submit(() => api.registerPayment(form), 'Paiement enregistre')}>
        <SelectInput label="Facture" value={form.invoiceId} onChange={(invoiceId) => setForm({ ...form, invoiceId })} options={data.invoices.map((invoice) => ({ value: invoice.id, label: `${invoice.invoice_number} - ${money(invoice.total_amount_usd)}` }))} />
        <TextInput label="Montant USD" type="number" value={form.amountUsd} onChange={(amountUsd) => setForm({ ...form, amountUsd })} />
        <SelectInput label="Methode" value={form.method} onChange={(method) => setForm({ ...form, method })} options={['especes', 'airtel_money', 'mpesa', 'orange_money', 'banque', 'autre']} />
        <TextInput label="Transaction" value={form.transactionNumber} onChange={(transactionNumber) => setForm({ ...form, transactionNumber })} />
      </QuickForm>
      <TablePanel title="Paiements" icon={BadgeDollarSign} columns={['Reference', 'Client', 'Montant', 'Methode', 'Date']} rows={data.payments.map((item) => [item.payment_reference, item.client_name, money(item.amount_usd), item.method, item.paid_at])} />
    </>
  );
}

function Equipment({ data, submit }) {
  const [form, setForm] = useState({ contractId: '', installmentNumber: 1, amountUsd: 20, dueDate: '' });
  return (
    <>
      <QuickForm title="Nouvelle tranche materiel" icon={Boxes} onSubmit={() => submit(() => api.createInstallment(form), 'Tranche materiel creee')}>
        <SelectInput label="Contrat" value={form.contractId} onChange={(contractId) => setForm({ ...form, contractId })} options={data.contracts.map((contract) => ({ value: contract.contract_id, label: `${contract.contract_number} - ${contract.client_name}` }))} />
        <TextInput label="Numero tranche" type="number" value={form.installmentNumber} onChange={(installmentNumber) => setForm({ ...form, installmentNumber })} />
        <TextInput label="Montant USD" type="number" value={form.amountUsd} onChange={(amountUsd) => setForm({ ...form, amountUsd })} />
        <TextInput label="Echeance" type="date" value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} />
      </QuickForm>
      <TablePanel title="Etat materiel" icon={Router} columns={['Contrat', 'Client', 'Kit', 'Paye', 'Reste']} rows={data.equipmentStatus.map((item) => [item.contract_number, item.client_name, item.equipment_kit || '-', money(item.equipment_paid_usd), money(item.equipment_remaining_usd)])} />
    </>
  );
}

function Support({ data, submit }) {
  const [form, setForm] = useState({ clientId: '', contractId: '', title: '', description: '', priority: 'normale' });
  return (
    <>
      <QuickForm title="Nouveau ticket" icon={Ticket} onSubmit={() => submit(() => api.openTicket(form), 'Ticket ouvert')}>
        <SelectInput label="Client" value={form.clientId} onChange={(clientId) => setForm({ ...form, clientId })} options={data.clients.map((client) => ({ value: client.id, label: client.full_name }))} />
        <SelectInput label="Contrat" value={form.contractId} onChange={(contractId) => setForm({ ...form, contractId })} options={data.contracts.map((contract) => ({ value: contract.contract_id, label: contract.contract_number }))} />
        <TextInput label="Titre" value={form.title} onChange={(title) => setForm({ ...form, title })} />
        <SelectInput label="Priorite" value={form.priority} onChange={(priority) => setForm({ ...form, priority })} options={['basse', 'normale', 'haute', 'urgente']} />
        <TextInput label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
      </QuickForm>
      <TablePanel title="Tickets support" icon={Ticket} columns={['Client', 'Titre', 'Priorite', 'Statut']} rows={data.tickets.map((item) => [item.client_name, item.title, item.priority, item.status])} />
    </>
  );
}

function PanelHeader({ icon: Icon, title }) {
  return (
    <div className="panel-header">
      <Icon size={19} />
      <h2>{title}</h2>
    </div>
  );
}

function QuickForm({ title, icon, children, onSubmit }) {
  return (
    <div className="panel">
      <PanelHeader icon={icon} title={title} />
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        {children}
        <button className="primary-button"><Plus size={17} /> Enregistrer</button>
      </form>
    </div>
  );
}

function TextInput({ label, value, onChange, type = 'text' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }) {
  const normalized = options.map((option) => (typeof option === 'string' ? { value: option, label: option } : option));
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selectionner</option>
        {normalized.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function TablePanel({ title, icon, columns, rows }) {
  const Icon = icon || FileText;
  return (
    <div className="panel table-panel">
      <PanelHeader icon={Icon} title={title} />
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="empty-cell">Aucune donnee</td></tr>
            ) : rows.map((row, index) => (
              <tr key={`${title}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell || '-'}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
