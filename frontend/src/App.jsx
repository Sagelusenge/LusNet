import { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  BarChart3,
  BellRing,
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
  Pencil,
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
  Timer,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  Wrench,
  Wifi,
  X,
  AlertCircle,
  ArrowRight,
  Globe2,
  Zap
} from 'lucide-react';
import { api, getCurrentUser, setToken } from './api';

const adminNav = [
  { id: 'admin-dashboard', label: 'Dashboard', icon: Home },
  { id: 'quotes', label: 'Devis', icon: ClipboardList },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'contracts', label: 'Contrats', icon: FileText },
  { id: 'countdowns', label: 'Echeances', icon: Timer },
  { id: 'plans', label: 'Bouquets', icon: Gauge },
  { id: 'invoices', label: 'Factures', icon: Receipt },
  { id: 'payments', label: 'Paiements', icon: BadgeDollarSign },
  { id: 'budget', label: 'Budget', icon: Building2 },
  { id: 'equipment', label: 'Materiel', icon: Router },
  { id: 'reports', label: 'Rapports', icon: BarChart3 },
  { id: 'support', label: 'Support', icon: Ticket },
  { id: 'feedback', label: 'Appreciations', icon: MessageSquare },
  { id: 'notifications', label: 'Notifications', icon: Send },
  { id: 'users', label: 'Utilisateurs', icon: UserPlus }
];

const clientNav = [
  { id: 'client-space', label: 'Mon espace', icon: Home },
  { id: 'client-contracts', label: 'Mes contrats', icon: FileText },
  { id: 'client-invoices', label: 'Mes factures', icon: Receipt },
  { id: 'client-complaints', label: 'Reclamations', icon: Ticket }
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

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function todayDisplayDate() {
  return new Date().toLocaleDateString('fr-FR');
}

function currentDateTimeInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function dateText(value) {
  return value || '..... / ..... / 202...';
}

function isOtherPlanName(name) {
  return name === 'Autre';
}

function clampDueDay(value) {
  const dueDay = Number(value);
  if (!Number.isFinite(dueDay)) return '';
  return String(Math.min(31, Math.max(1, Math.trunc(dueDay))));
}

function bandwidthText(item) {
  return isOtherPlanName(item?.plan_name || item?.name) ? 'Selon accord' : `${item?.bandwidth_mbps || 0} Mbps`;
}

function invoiceTypeLabel(value) {
  const labels = {
    facture: 'Facture',
    proforma: 'Proforma',
    avoir: 'Avoir'
  };
  return labels[value] || text(value);
}

function invoiceStatusLabel(value) {
  const labels = {
    brouillon: 'Brouillon',
    non_reglee: 'Non reglee',
    emise: 'Emise',
    partielle: 'Partielle',
    payee: 'Reglee',
    en_retard: 'En retard',
    annulee: 'Annulee'
  };
  return labels[value] || text(value);
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
      .compact-doc{max-width:680px}
      .doc-header{display:flex;justify-content:space-between;gap:18px;border-bottom:3px solid #08765d;padding-bottom:12px;margin-bottom:14px}
      .compact-header{padding-bottom:8px;margin-bottom:8px}
      .brand-title{font-size:24px;font-weight:800;color:#044a3c;letter-spacing:0}
      .compact-doc .brand-title{font-size:20px}
      .brand-sub{color:#555;margin-top:3px}
      .doc-title{text-align:right}
      .doc-title h1{font-size:18px;margin:0 0 6px;text-transform:uppercase}
      .badge{display:inline-block;padding:5px 9px;border-radius:999px;background:#fff3d1;color:#5c3d00;font-weight:700}
      .report-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 16px}
      .report-meta div{border:1px solid #d7e2de;border-radius:7px;padding:9px 10px;background:#f6faf8}
      .report-meta span{display:block;color:#687770;font-size:9px;text-transform:uppercase;letter-spacing:.06em}
      .report-meta strong{display:block;margin-top:3px;color:#14211d;font-size:12px}
      .box{border:1px solid #cfd8d4;border-radius:8px;padding:10px 12px;margin:10px 0;background:#fbfdfc}
      .compact-box,.compact-doc .box{padding:8px 10px;margin:7px 0}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .compact-grid{gap:8px}
      .field-line{display:flex;gap:6px;margin:4px 0}.field-line strong{min-width:130px;color:#044a3c}
      .compact-doc .field-line strong{min-width:78px}
      h2{font-size:13px;color:#044a3c;margin:14px 0 6px;text-transform:uppercase}
      .compact-doc h2{font-size:12px;margin:6px 0 4px}
      p{margin:6px 0}
      table{width:100%;border-collapse:collapse;margin:8px 0 12px}
      .compact-doc table{margin:4px 0}
      thead{display:table-header-group}
      th{background:#08765d;color:#fff;text-transform:uppercase;font-size:10px;letter-spacing:.035em}
      th,td{border:1px solid #bfcac5;padding:6px;text-align:left;vertical-align:top}
      tbody tr:nth-child(even){background:#f4f8f7}
      tbody tr:last-child td{font-weight:700}
      .compact-doc th,.compact-doc td{padding:4px 6px}
      .selected{background:#e8f7f2;font-weight:700}
      .signature{display:grid;grid-template-columns:1fr 1fr;gap:38px;margin-top:24px}
      .compact-signature{gap:24px;margin-top:12px}
      .signature-box{min-height:150px;border-top:1px solid #111;padding-top:8px}
      .compact-signature .signature-box{min-height:76px}
      .operator-signature{position:relative;min-height:150px;overflow:hidden}
      .operator-signature>*:not(.stamp){position:relative;z-index:2}
      .signature-line{height:28px;border-bottom:1px solid #111;margin:8px 0 4px;width:74%}
      .stamp{position:absolute;left:58px;top:34px;z-index:1;width:106px;height:106px;border:3px solid rgba(0,0,0,.22);border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;color:rgba(0,0,0,.28);font-weight:800;text-transform:uppercase;transform:rotate(-10deg);opacity:.58}
      .stamp:before{content:"";position:absolute;inset:8px;border:1.5px solid rgba(0,0,0,.22);border-radius:50%}
      .stamp-inner{position:relative;z-index:1;display:grid;gap:1px;font-size:8.5px;line-height:1.08}
      .stamp-inner strong{font-size:11.5px;letter-spacing:0}
      .stamp-inner em{font-style:normal;font-size:7.5px}
      .small{font-size:11px;color:#555}
      .report-signatures{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin-top:36px}
      .report-signatures div{min-height:74px;border-top:1px solid #71817b;padding-top:7px;color:#555;font-size:10px}
      .report-signatures strong{display:block;color:#14211d;font-size:11px}
      .footer{border-top:1px solid #cfd8d4;margin-top:18px;padding-top:8px;color:#555;font-size:10px;text-align:center}
      @media print{.doc{max-width:none}.box,.report-meta{break-inside:avoid}tr{break-inside:avoid}.report-signatures{break-inside:avoid}}
    </style>`;
}

function selectedMark(name, current) {
  return name === current ? '[X]' : '[ ]';
}

function dateInputValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

function dateTimeInputValue(value) {
  return value ? String(value).replace(' ', 'T').slice(0, 16) : '';
}

function positiveAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function invoiceRemaining(item) {
  return Math.max(0, Number(item?.total_amount_usd || 0) - Number(item?.paid_amount_usd || 0));
}

function App() {
  const [active, setActive] = useState(() => {
    const section = new URLSearchParams(window.location.search).get('section');
    if (localStorage.getItem('lwasiva_token')) return section || 'admin-dashboard';
    return section === 'register' ? 'register' : 'home';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tokenState, setTokenState] = useState(localStorage.getItem('lwasiva_token') || '');
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [theme, setTheme] = useState(localStorage.getItem('lwasiva_theme') || 'light');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
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
    equipmentAssignments: [],
    tickets: [],
    quotes: [],
    users: [],
    accountRequests: [],
  notificationLogs: [],
    appMessages: [],
    adminAppMessages: [],
    publicFeedback: [],
    contactMessages: [],
    allFeedback: [],
    budgetSummary: { summary: { total_recettes_usd: 0, total_depenses_usd: 0, solde_usd: 0 }, byCategory: [] },
    budgetCategories: [],
    budgetEntries: [],
    clientSpace: { client: null, contracts: [], invoices: [], payments: [], tickets: [], equipmentStatus: [] }
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
        const [clientSpace, appMessages] = await Promise.all([
          api.clientSpace().catch(() => ({ client: null, contracts: [], invoices: [], payments: [], tickets: [], equipmentStatus: [] })),
          api.appMessages().catch(() => [])
        ]);
        setData((previous) => ({ ...previous, plans: publicPlans, clientSpace, appMessages }));
        return;
      }

      const [summary, clients, contracts, balances, equipmentStatus, invoices, unpaidInvoices, payments, kits, equipmentAssignments, tickets, quotes, users, accountRequests, notificationLogs, appMessages, adminAppMessages, contactMessages, allFeedback, budgetSummary, budgetCategories, budgetEntries] =
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
          api.equipmentAssignments().catch(() => []),
          api.tickets().catch(() => []),
          api.quotes().catch(() => []),
          api.users().catch(() => []),
          api.accountRequests().catch(() => []),
          api.notificationLogs().catch(() => []),
          api.appMessages().catch(() => []),
          api.adminAppMessages().catch(() => []),
          api.contactMessages().catch(() => []),
          api.allFeedback().catch(() => []),
          api.budgetSummary().catch(() => ({ summary: { total_recettes_usd: 0, total_depenses_usd: 0, solde_usd: 0 }, byCategory: [] })),
          api.budgetCategories().catch(() => []),
          api.budgetEntries().catch(() => [])
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
        equipmentAssignments,
        tickets,
        quotes,
        users,
        accountRequests,
        notificationLogs,
        appMessages,
        adminAppMessages,
        publicFeedback,
        contactMessages,
        allFeedback,
        budgetSummary,
        budgetCategories,
        budgetEntries,
        clientSpace: { client: null, contracts: [], invoices: [], payments: [], tickets: [], equipmentStatus: [] }
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [tokenState]);

  function notify(message, type = 'success') {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  }

  async function submit(handler, successMessage) {
    setBusy(true);
    try {
      await handler();
      notify(successMessage);
      await loadAll();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setBusy(false);
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
        ) : active === 'register' ? (
          <ClientRegistrationPanel submit={submit} busy={busy} setActive={setActive} />
        ) : (
          <PublicHome plans={data.plans} feedback={data.publicFeedback} submit={submit} setActive={setActive} busy={busy} />
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
            <span>{isClient ? 'Espace client' : 'Administration centrale'}</span>
          </div>
        </div>

        <span className="sidebar-section-label">Menu principal</span>
        <nav className="nav-list">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                style={{ '--nav-index': index }}
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
        <div className="sidebar-status">
          <span><i /> Systeme operationnel</span>
          <small>Goma, Nord-Kivu</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen((value) => !value)} title="Menu">
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            <span>{isClient ? 'Espace client' : 'Administration'}</span>
            <h1>{activeTitle}</h1>
          </div>
          <div className="topbar-actions">
            <div className="topbar-profile">
              <span>{String(currentUser?.fullName || 'LW').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
              <div><strong>{currentUser?.fullName || 'LWASIVA_NET'}</strong><small>{isClient ? 'Client' : 'Administrateur'}</small></div>
            </div>
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

        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
        {busy && <LoadingOverlay />}

        <section className="content">
          {!isClient && active === 'admin-dashboard' && <Dashboard data={data} currentUser={currentUser} />}
          {!isClient && active === 'quotes' && <Quotes data={data} submit={submit} />}
          {!isClient && active === 'clients' && <Clients data={data} submit={submit} />}
          {!isClient && active === 'contracts' && <Contracts data={data} submit={submit} />}
          {!isClient && active === 'countdowns' && <Countdowns data={data} />}
          {!isClient && active === 'plans' && <Plans data={data} />}
          {!isClient && active === 'invoices' && <Invoices data={data} submit={submit} />}
          {!isClient && active === 'payments' && <Payments data={data} submit={submit} />}
          {!isClient && active === 'budget' && <Budget data={data} submit={submit} />}
          {!isClient && active === 'equipment' && <Equipment data={data} submit={submit} />}
          {!isClient && active === 'reports' && <Reports data={data} />}
          {!isClient && active === 'support' && <Support data={data} submit={submit} />}
          {!isClient && active === 'feedback' && <FeedbackAdmin data={data} submit={submit} />}
          {!isClient && active === 'notifications' && <Notifications data={data} submit={submit} />}
          {!isClient && active === 'users' && <UsersAdmin data={data} submit={submit} />}
          {isClient && active === 'client-space' && <><PushNotificationPanel /><ClientSpace data={data.clientSpace} messages={data.appMessages} submit={submit} /></>}
          {isClient && active === 'client-contracts' && <ClientContracts data={data.clientSpace} />}
          {isClient && active === 'client-invoices' && <ClientInvoices data={data.clientSpace} />}
          {isClient && active === 'client-complaints' && <ClientComplaints data={data.clientSpace} submit={submit} />}
        </section>
      </main>
    </div>
  );
}

function Toast({ toast, onClose }) {
  const isError = toast.type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div className={`toast ${isError ? 'error' : 'success'}`}>
      <span className="toast-icon"><Icon size={20} /></span>
      <span>{toast.message}</span>
      {onClose && (
        <button className="toast-close" onClick={onClose} title="Fermer">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="loading-box">
        <span className="loader" />
        <strong>Traitement en cours...</strong>
      </div>
    </div>
  );
}

function PublicShell({ active, setActive, toast, theme, setTheme, children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function navigate(page) {
    setActive(page);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openSection(sectionId) {
    setActive('home');
    setMobileNavOpen(false);
    window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="public-header-inner">
          <div className="brand public-brand">
            <div className="brand-mark" aria-hidden="true">LN</div>
            <div className="public-brand-copy">
              <strong>LWASIVA_NET</strong>
              <span>Internet haut debit a Goma</span>
            </div>
          </div>
          <button className="public-menu-toggle" onClick={() => setMobileNavOpen((open) => !open)} aria-expanded={mobileNavOpen} aria-controls="public-navigation" aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav id="public-navigation" className={`public-nav ${mobileNavOpen ? 'open' : ''}`} aria-label="Navigation publique">
            <button className={`nav-pill ${active === 'home' ? 'active' : ''}`} onClick={() => navigate('home')} title="Accueil" aria-label="Accueil">
              <span>Accueil</span>
            </button>
            <button onClick={() => openSection('offres')} className="nav-pill optional-nav" title="Nos offres">
              <span>Offres</span>
            </button>
            <button onClick={() => openSection('installation')} className="nav-pill optional-nav" title="Installation et suivi">
              <span>Installation</span>
            </button>
            <button onClick={() => openSection('avis')} className="nav-pill optional-nav" title="Avis clients">
              <span>Avis clients</span>
            </button>
            <button onClick={() => openSection('contact')} className="nav-pill optional-nav" title="Nous contacter">
              <span>Contact</span>
            </button>
            <button className="public-icon-button theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Changer le theme" aria-label="Changer le theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className={`nav-pill login-nav ${active === 'login' ? 'active' : ''}`} onClick={() => navigate('login')} title="Connexion" aria-label="Connexion">
              <span>Connexion</span>
            </button>
            <button className={`nav-pill register-nav ${active === 'register' ? 'active' : ''}`} onClick={() => navigate('register')} title="Creer un compte" aria-label="Creer un compte">
              <span>Creer un compte</span>
            </button>
          </nav>
        </div>
      </header>
      {toast && <Toast toast={toast} />}
      {children}
      <footer className="public-footer">
        <div className="public-footer__main">
          <div className="public-footer__brand">
            <span className="brand-mark">LN</span>
            <div><strong>LWASIVA_NET</strong><p>Internet local, fiable et suivi pour les foyers et entreprises de Goma.</p></div>
          </div>
          <div><strong>Navigation</strong><button onClick={() => navigate('home')}>Accueil</button><button onClick={() => openSection('offres')}>Nos offres</button><button onClick={() => openSection('installation')}>Installation</button></div>
          <div><strong>Votre espace</strong><button onClick={() => navigate('login')}>Connexion</button><button onClick={() => navigate('register')}>Creer un compte</button><button onClick={() => openSection('contact')}>Contact</button></div>
          <div><strong>Nous contacter</strong><span>+243 980 208 012</span><span>sagelusenge@gmail.com</span><span>Goma, Nord-Kivu</span></div>
        </div>
        <div className="public-footer__bottom"><span>© {new Date().getFullYear()} LWASIVA_NET</span><span>Connexion locale. Impact reel.</span></div>
      </footer>
    </div>
  );
}

function PublicHome({ plans, feedback, submit, setActive, busy }) {
  const publicPlans = plans.filter((plan) => !isOtherPlanName(plan.name));
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
        <div className="hero-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="hero-content">
          <span className="hero-kicker"><Globe2 size={15} /> Le reseau local qui vous rapproche</span>
          <h1><span>Connecter Goma.</span><span>Construire</span><span>ensemble.</span></h1>
          <p>LWASIVA_NET fournit une connexion Internet sans fil fiable aux foyers et entreprises de Goma, avec une installation suivie et un support de proximite.</p>
          <div className="hero-actions">
            <a href="#devis" className="primary-link">Demander un devis <ArrowRight size={18} /></a>
            <button className="secondary-link" onClick={() => setActive('login')}>Acceder a mon espace</button>
          </div>
          <div className="hero-stats">
            <div><ShieldCheck size={17} /><span><strong>Contrat clair</strong>Suivi transparent</span></div>
            <div><Wifi size={17} /><span><strong>5 a 30 Mbps</strong>Selon votre besoin</span></div>
            <div><Wrench size={17} /><span><strong>Equipe locale</strong>Installation a Goma</span></div>
          </div>
        </div>
        <div className="hero-network">
          <div className="coverage-card">
            <header><span><i /> Reseau operationnel</span><Wifi size={20} /></header>
            <div className="coverage-card__signal" aria-hidden="true">
              <span className="coverage-orbit coverage-orbit--one" />
              <span className="coverage-orbit coverage-orbit--two" />
              <span className="coverage-router"><Router size={32} /></span>
            </div>
            <div className="coverage-card__rows">
              <div><Globe2 /><span><small>Zone desservie</small><strong>Goma, Nord-Kivu</strong></span></div>
              <div><Zap /><span><small>Debit disponible</small><strong>Jusqu'a 30 Mbps</strong></span></div>
              <div><ShieldCheck /><span><small>Accompagnement</small><strong>Installation et support</strong></span></div>
            </div>
            <footer><span>LWASIVA_NET</span><b>Connexion locale. Impact reel.</b></footer>
          </div>
        </div>
      </section>

      <section className="public-contact-strip">
        <div className="reveal-card">
          <Phone size={18} />
          <span>Contact officiel</span>
          <strong>+243 980 208 012</strong>
        </div>
        <div className="reveal-card">
          <Send size={18} />
          <span>E-mail professionnel</span>
          <strong>sagelusenge@gmail.com</strong>
        </div>
        <div className="reveal-card">
          <ShieldCheck size={18} />
          <span>Zone</span>
          <strong>Goma, Nord-Kivu</strong>
        </div>
        <div className="reveal-card">
          <Wifi size={18} />
          <span>Technologie</span>
          <strong>Liaison sans fil</strong>
        </div>
      </section>

      <section className="public-section" id="offres">
        <div className="section-heading">
          <Wifi size={22} />
          <h2>Nos offres Internet</h2>
        </div>
        <div className="plan-grid">
          {publicPlans.map((plan, index) => (
            <div className="plan reveal-card" style={{ '--delay': `${index * 90}ms` }} key={plan.id}>
              <div><Router size={22} /><strong>{plan.name}</strong></div>
              <span>{plan.recommended_usage}</span>
              <p>{bandwidthText(plan)}</p>
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

      <section className="public-section service-showcase" id="installation">
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
          <img src="/network-installation.jpg" alt="Installation reseau LWASIVA_NET" />
          <img src="/network-equipment.jpg" alt="Equipement Internet LWASIVA_NET" />
        </div>
      </section>

      <section className="public-section process-strip">
        <div className="reveal-card"><ClipboardList size={20} /><strong>1. Demande</strong><span>Le client envoie son devis depuis l'accueil.</span></div>
        <div className="reveal-card"><ShieldCheck size={20} /><strong>2. Validation</strong><span>L'administration verifie et valide la demande.</span></div>
        <div className="reveal-card"><FileText size={20} /><strong>3. Contrat</strong><span>Le contrat final est imprime depuis l'espace admin.</span></div>
        <div className="reveal-card"><Wifi size={20} /><strong>4. Activation</strong><span>Le service Internet est active pour le client.</span></div>
      </section>

      <section className="public-section testimonials-section" id="avis">
        <div className="section-heading">
          <MessageSquare size={22} />
          <h2>Appreciations clients approuvees</h2>
        </div>
        <div className="testimonial-grid">
          {feedback.length === 0 ? (
            <div className="testimonial-card"><strong>LWASIVA_NET</strong><p>Les appreciations validees par l'administration seront affichees ici.</p></div>
          ) : feedback.slice(0, 4).map((item) => (
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
            <SelectInput label="Bouquet souhaite" value={form.planId} onChange={(planId) => setForm({ ...form, planId })} options={publicPlans.map((plan) => ({ value: plan.id, label: `${plan.name} - ${money(plan.monthly_price_usd)}` }))} />
            <TextInput label="Adresse installation" value={form.address} onChange={(address) => setForm({ ...form, address })} />
            <TextInput label="Usage prevu" value={form.intendedUsage} onChange={(intendedUsage) => setForm({ ...form, intendedUsage })} />
            <TextInput label="Message" value={form.message} onChange={(message) => setForm({ ...form, message })} />
            <button className="primary-button" disabled={busy}><Plus size={17} /> {busy ? 'Envoi...' : 'Envoyer'}</button>
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
            <button className="primary-button" disabled={busy}><Send size={17} /> {busy ? 'Envoi...' : 'Envoyer'}</button>
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
            <button className="primary-button" disabled={busy}><MessageSquare size={17} /> {busy ? 'Envoi...' : 'Envoyer'}</button>
          </form>
        </div>
      </section>
    </>
  );
}

function InfoCard({ icon: Icon, title, text }) {
  return (
    <div className="info-card reveal-card">
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
      notify(error.message, 'error');
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-visual">
          <div className="brand-mark login-mark">LN</div>
          <h1><span>Votre reseau.</span><span>Votre espace.</span></h1>
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
            <span>Faites votre demande depuis l'accueil. Un administrateur devra l'approuver.</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function Dashboard({ data, currentUser }) {
  const subscriptionStats = getSubscriptionStats(data.contracts, data.invoices);
  const cards = [
    ['Clients', data.summary.total_clients, 'Tous les comptes', Users, 'blue'],
    ['Contrats actifs', data.summary.active_contracts, 'Services operationnels', ClipboardList, 'green'],
    ['Abonnements expires', subscriptionStats.expired, 'A traiter', AlertCircle, 'amber'],
    ['Abonnements a jour', subscriptionStats.upToDate, 'Paiements valides', CheckCircle2, 'purple'],
    ['Suspendus', data.summary.suspended_contracts, 'Contrats interrompus', FileText, 'red']
  ];

  return (
    <>
      <section className="dashboard-welcome">
        <div>
          <span>Vue d'ensemble</span>
          <h2>Bonjour, {currentUser?.fullName || 'Administration LWASIVA_NET'}</h2>
          <p>Voici l'activite recente de votre reseau et les elements qui demandent votre attention.</p>
        </div>
        <div className="dashboard-live"><i /><span>Donnees actualisees</span></div>
      </section>
      <div className="metric-grid admin-metric-grid">
        {cards.map(([label, value, detail, Icon, tone], index) => (
          <article className={`metric admin-metric-card admin-metric-card--${tone}`} style={{ '--metric-index': index }} key={label}>
            <span className="admin-metric-icon"><Icon size={21} /></span>
            <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
          </article>
        ))}
      </div>
      <PushNotificationPanel />
      <TablePanel title="Messages de LWASIVA_NET" icon={MessageSquare} columns={['Titre', 'Message', 'Date']} rows={(data.appMessages || []).slice(0, 6).map((item) => [item.title, item.body, item.created_at])} />
      <div className="two-columns">
        <TablePanel title="Derniers devis" icon={ClipboardList} columns={['Numero', 'Client', 'Telephone', 'Statut']} rows={data.quotes.slice(0, 8).map((item) => [item.quote_number, item.full_name, item.phone, item.status])} />
        <TablePanel title="Factures a suivre" icon={Receipt} columns={['Client', 'Telephone', 'Type', 'Reste', 'Date limite']} rows={data.unpaidInvoices.slice(0, 8).map((item) => [item.client_name, item.client_phone, invoiceTypeLabel(item.invoice_type), money(item.remaining_amount_usd), item.due_date])} />
      </div>
      <div className="two-columns">
        <TablePanel title="Messages contact" icon={Phone} columns={['Nom', 'Telephone', 'Sujet', 'Statut']} rows={data.contactMessages.slice(0, 8).map((item) => [item.full_name, item.phone, item.subject, item.status])} />
        <TablePanel title="Appreciations recues" icon={MessageSquare} columns={['Nom', 'Quartier', 'Note', 'Statut']} rows={data.allFeedback.slice(0, 8).map((item) => [item.full_name, item.neighborhood || '-', `${item.rating}/5`, item.status])} />
      </div>
    </>
  );
}

function ClientRegistrationPanel({ submit, busy, setActive }) {
  const emptyForm = {
    fullName: '',
    clientType: 'particulier',
    phone: '',
    email: '',
    address: '',
    city: 'Goma',
    password: '',
    confirmPassword: ''
  };
  const [form, setForm] = useState(emptyForm);

  function requestAccount(event) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) return;
    const { confirmPassword, ...body } = form;
    submit(() => api.requestClientAccount(body), 'Demande envoyee. Vous recevrez un email apres la validation de l administrateur.');
    setForm(emptyForm);
  }

  return (
    <main className="login-page registration-page">
      <div className="login-card registration-card">
        <div className="login-visual">
          <div className="brand-mark login-mark">LN</div>
          <h1>Demande de compte</h1>
          <p>Votre compte restera bloque jusqu'a la verification par un administrateur LWASIVA_NET.</p>
          <div className="login-points">
            <span><ShieldCheck size={17} /> Validation obligatoire</span>
            <span><Send size={17} /> Reponse par e-mail</span>
            <span><BellRing size={17} /> Notifications PWA apres connexion</span>
          </div>
        </div>
        <div className="login-form-panel">
          <div className="login-heading">
            <UserPlus size={22} />
            <div><h2>Creer mon compte client</h2><p>Remplissez tous les champs obligatoires.</p></div>
          </div>
          <form className="form-grid two" onSubmit={requestAccount}>
            <TextInput label="Nom complet" value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} />
            <SelectInput label="Type de client" value={form.clientType} onChange={(clientType) => setForm({ ...form, clientType })} options={['particulier', 'entreprise']} />
            <TextInput label="Telephone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
            <TextInput label="E-mail" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
            <TextInput label="Adresse" value={form.address} onChange={(address) => setForm({ ...form, address })} />
            <TextInput label="Ville" value={form.city} onChange={(city) => setForm({ ...form, city })} />
            <TextInput label="Mot de passe (8 caracteres min.)" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
            <TextInput label="Confirmer le mot de passe" type="password" value={form.confirmPassword} onChange={(confirmPassword) => setForm({ ...form, confirmPassword })} />
            {form.confirmPassword && form.password !== form.confirmPassword && <p className="form-error">Les mots de passe ne correspondent pas.</p>}
            <button className="primary-button" disabled={busy || form.password !== form.confirmPassword}><UserPlus size={17} /> {busy ? 'Envoi...' : 'Envoyer la demande'}</button>
            <button className="small-button" type="button" onClick={() => setActive('login')}>J'ai deja un compte</button>
          </form>
        </div>
      </div>
    </main>
  );
}

function subscriptionCountdown(activatedAt, now) {
  if (!activatedAt) return null;

  const startedAt = new Date(`${String(activatedAt).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(startedAt.getTime())) return null;

  const durationMs = 30 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(startedAt.getTime() + durationMs);
  const remainingMs = expiresAt.getTime() - now.getTime();
  const absoluteMs = Math.abs(remainingMs);
  const days = Math.floor(absoluteMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((absoluteMs / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((absoluteMs / (60 * 1000)) % 60);
  const progress = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));

  return { startedAt, expiresAt, remainingMs, days, hours, minutes, progress };
}

function paidInvoiceEndDate(contract, invoices) {
  const paidInvoices = invoices
    .filter((invoice) => String(invoice.contract_id) === String(contract.contract_id || contract.id))
    .filter((invoice) => invoice.status === 'payee' || Number(invoice.paid_amount_usd || 0) >= Number(invoice.total_amount_usd || 0))
    .map((invoice) => new Date(`${String(invoice.period_end).slice(0, 10)}T23:59:59`))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return paidInvoices[0] || null;
}

function subscriptionCountdownForContract(contract, invoices, now) {
  const fallbackCountdown = subscriptionCountdown(contract.activated_at, now);
  const paidEnd = paidInvoiceEndDate(contract, invoices);
  const baseExpiresAt = paidEnd || fallbackCountdown?.expiresAt;
  if (!baseExpiresAt) return null;

  const startedAt = fallbackCountdown?.startedAt || new Date(`${String(contract.activated_at || baseExpiresAt).slice(0, 10)}T00:00:00`);
  const completedSuspensionMs = Math.max(0, Number(contract.completed_suspension_seconds || 0) * 1000);
  const expiresAt = new Date(baseExpiresAt.getTime() + completedSuspensionMs);
  const suspendedAt = contract.status === 'suspendu' && contract.current_suspended_at ? new Date(contract.current_suspended_at) : null;
  const isPaused = Boolean(suspendedAt && !Number.isNaN(suspendedAt.getTime()));
  const effectiveNow = isPaused ? suspendedAt : now;
  const remainingMs = expiresAt.getTime() - effectiveNow.getTime();
  const absoluteMs = Math.abs(remainingMs);
  const days = Math.floor(absoluteMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((absoluteMs / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((absoluteMs / (60 * 1000)) % 60);
  const durationMs = Math.max(1, baseExpiresAt.getTime() - startedAt.getTime());
  const progress = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));

  return { startedAt, expiresAt, remainingMs, days, hours, minutes, progress, isPaused, suspendedAt };
}

function getSubscriptionStats(contracts, invoices = [], now = new Date()) {
  const eligibleContracts = contracts.filter((item) => item.activated_at && item.status !== 'brouillon' && item.status !== 'resilie');
  const countdowns = eligibleContracts
    .map((contract) => subscriptionCountdownForContract(contract, invoices, now))
    .filter(Boolean);
  const expired = countdowns.filter((item) => item.remainingMs <= 0).length;

  return {
    expired,
    upToDate: Math.max(0, countdowns.length - expired)
  };
}

function Countdowns({ data }) {
  const [now, setNow] = useState(new Date());
  const eligibleContracts = data.contracts.filter((item) => item.activated_at && item.status !== 'brouillon' && item.status !== 'resilie');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const countdowns = eligibleContracts
    .map((contract) => ({ contract, countdown: subscriptionCountdownForContract(contract, data.invoices, now) }))
    .filter((item) => item.countdown)
    .sort((a, b) => a.countdown.remainingMs - b.countdown.remainingMs);
  const expired = countdowns.filter((item) => item.countdown.remainingMs <= 0).length;
  const urgent = countdowns.filter((item) => item.countdown.remainingMs > 0 && item.countdown.remainingMs <= 3 * 24 * 60 * 60 * 1000).length;

  return (
    <>
      <div className="metric-grid countdown-metrics">
        <div className="metric"><Timer size={20} /><span>Compteurs actifs</span><strong>{countdowns.length}</strong></div>
        <div className="metric"><AlertCircle size={20} /><span>Echeance sous 3 jours</span><strong>{urgent}</strong></div>
        <div className="metric"><X size={20} /><span>Periodes expirees</span><strong>{expired}</strong></div>
      </div>

      <div className="panel">
        <PanelHeader icon={Timer} title="Compte a rebours des abonnements" />
        <div className="countdown-list">
          {countdowns.length === 0 ? <p className="muted">Aucun contrat avec une date de mise en service.</p> : countdowns.map(({ contract, countdown }) => {
            const isExpired = countdown.remainingMs <= 0;
            const isUrgent = !isExpired && countdown.remainingMs <= 3 * 24 * 60 * 60 * 1000;
            const stateClass = countdown.isPaused ? 'paused' : isExpired ? 'expired' : isUrgent ? 'urgent' : countdown.remainingMs <= 7 * 24 * 60 * 60 * 1000 ? 'warning' : 'active';

            return (
              <div className={`countdown-item ${stateClass}`} key={contract.contract_id}>
                <div className="countdown-client">
                  <span className="countdown-icon"><Timer size={20} /></span>
                  <div>
                    <strong>{contract.client_name}</strong>
                    <span>{contract.contract_number} - {contract.plan_name}</span>
                  </div>
                </div>
                <div className="countdown-dates">
                  <span>Mise en service: {dateText(contract.activated_at)}</span>
                  <strong>{countdown.isPaused ? `Suspendu le ${countdown.suspendedAt.toLocaleDateString('fr-FR')}` : `Echeance: ${countdown.expiresAt.toLocaleDateString('fr-FR')}`}</strong>
                </div>
                <div className="countdown-value">
                  {countdown.isPaused ? (
                    <>
                      <strong>En pause</strong>
                      <span>{countdown.days} j {countdown.hours} h {countdown.minutes} min figes</span>
                    </>
                  ) : isExpired ? (
                    <>
                      <strong>Expire</strong>
                      <span>depuis {countdown.days} j {countdown.hours} h</span>
                    </>
                  ) : (
                    <>
                      <strong>{countdown.days} j {countdown.hours} h</strong>
                      <span>{countdown.minutes} min restantes</span>
                    </>
                  )}
                </div>
                <div className="countdown-progress" aria-label={`${Math.round(countdown.progress)} pourcent restant`}>
                  <span style={{ width: `${countdown.progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
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
              <button className="icon-button" title="Valider" onClick={() => submit(() => api.updateQuoteStatus(item.id, { status: 'valide', adminNotes: item.admin_notes || '' }), 'Devis valide')}><CheckCircle2 size={17} /></button>
              <button className="icon-button" title="Rejeter" onClick={() => submit(() => api.updateQuoteStatus(item.id, { status: 'rejete', adminNotes: item.admin_notes || '' }), 'Devis rejete')}><X size={17} /></button>
              <button className="small-button" onClick={() => submit(() => api.convertQuoteToClient(item.id), 'Client cree depuis le devis')}>Creer client</button>
              <button className="icon-button danger" title="Supprimer" onClick={() => submit(() => api.deleteQuote(item.id), 'Devis supprime')}><Trash2 size={17} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function printContractDocument(item) {
  const selectedPlan = item.plan_name || '.........................................';
  const isOtherPlan = selectedPlan === 'Autre';
  const selectedBandwidth = isOtherPlan ? 'Selon accord familial' : text(item.bandwidth_mbps ? `${item.bandwidth_mbps} Mbps` : '');
  const selectedPrice = money(item.monthly_price_usd);
  const equipmentTotal = Number(item.equipment_total_price_usd || 100);
  const equipmentInitial = Number(item.equipment_initial_payment_usd || 20);
  const equipmentMonthly = item.equipment_monthly_payment_usd;
  const equipmentPaidInFull = Boolean(item.equipment_paid_in_full);
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
            <div class="field-line"><strong>Mise en service</strong><span>${dateText(item.activated_at)}</span></div>
          </section>

          <h2>Article 1 : Objet du Contrat</h2>
          <p>Le present contrat definit les conditions techniques, juridiques et financieres dans lesquelles LWASIVA_NET fournit au Client un acces Internet haut debit par liaison sans fil, ainsi que les equipements necessaires a la reception du signal.</p>

          <h2>Article 2 : Offre choisie</h2>
          <table>
            <thead><tr><th>Choix</th><th>Bouquet</th><th>Debit</th><th>Usage recommande</th><th>Prix mensuel</th></tr></thead>
            <tbody>
              <tr class="${selectedPlan === 'Basic Home' ? 'selected' : ''}"><td>${selectedMark('Basic Home', selectedPlan)}</td><td>Basic Home</td><td>Jusqu'a 5 Mbps</td><td>Navigation, reseaux sociaux, video SD</td><td>15 USD</td></tr>
              ${isOtherPlan ? `<tr class="selected"><td>[X]</td><td>Autre</td><td>Selon accord</td><td>Tarif familial ou offre speciale</td><td>${selectedPrice}</td></tr>` : ''}
              <tr class="${selectedPlan === 'Stream Plus' ? 'selected' : ''}"><td>${selectedMark('Stream Plus', selectedPlan)}</td><td>Stream Plus</td><td>Jusqu'a 10 Mbps</td><td>Streaming HD, teletravail</td><td>20 USD</td></tr>
              <tr class="${selectedPlan === 'Pro Ultra' ? 'selected' : ''}"><td>${selectedMark('Pro Ultra', selectedPlan)}</td><td>Pro Ultra</td><td>Jusqu'a 30 Mbps</td><td>Streaming 4K, gaming, multi-utilisateurs</td><td>50 USD</td></tr>
            </tbody>
          </table>
          <p>Le Client souscrit au bouquet <strong>${selectedPlan}</strong>, avec un debit de <strong>${selectedBandwidth}</strong> et un tarif mensuel de <strong>${selectedPrice}</strong>.</p>
          <p>LWASIVA_NET configure le service pour une connexion stable, une faible latence, le streaming video, les appels video et les telechargements rapides, dans la limite du bouquet choisi.</p>

          <h2>Article 3 : Equipements et paiement par tranches</h2>
          <p>L'installation du kit de connexion est indispensable : antenne receptrice/CPE, routeur Wi-Fi, cablage et accessoires. La valeur totale du kit est fixee a <strong>${money(equipmentTotal)}</strong>.</p>
          <table>
            <tbody>
              <tr><td>Tranche 1 a l'installation</td><td><strong>${money(equipmentInitial)}</strong></td></tr>
              <tr><td>Tranche mensuelle</td><td>${equipmentPaidInFull ? 'Kit paye en totalite' : `${equipmentMonthly ? money(equipmentMonthly) : '................ USD'}, a payer avec l'abonnement`}</td></tr>
            </tbody>
          </table>
          <p><strong>Reserve de propriete :</strong> le materiel demeure la propriete de LWASIVA_NET jusqu'au paiement complet. En cas de non-paiement, LWASIVA_NET peut suspendre la connexion et recuperer le materiel.</p>

          <h2>Article 4 : Interdiction de revente</h2>
          <p>La connexion est personnelle et limitee au Client, a son foyer ou a son entreprise locale. Il est interdit de revendre la bande passante, de vendre des tickets Wi-Fi, de distribuer le service vers d'autres parcelles ou de sous-louer l'acces Internet.</p>
          <p>Tout abus peut entrainer la resiliation immediate, la coupure du signal, la confiscation du materiel non paye et des poursuites judiciaires.</p>
<br><br><br>
          <h2>Article 5 : Paiement</h2>
          <p>L'abonnement mensuel est payable d'avance. Le Client doit payer deux (2) jours avant le <strong>jour du mois choisi pour payer : ${text(item.billing_due_day)}</strong>. Les paiements peuvent etre faits en especes ou via Mobile Money.<br>En cas de retard de paiement de l’abonnement après un délai de 15 jours, le fournisseur se réserve le droit de rompre le contrat et de récupérer le matériel. </p>

          <h2>Article 6 : Service et support</h2>
          <p>LWASIVA_NET fournit le service 24h/24 et 7j/7, sauf force majeure ou maintenance programmee. Une equipe technique intervient en cas de panne signalee.</p>

          <h2>Article 7 : Duree et resiliation</h2>
          <p>Le contrat est conclu pour une duree indeterminee. La date officielle de mise en service est le <strong>${dateText(item.activated_at)}</strong>. Une periode d'essai de sept (7) jours est accordee a compter de cette date. Apres cette periode, la resiliation se fait avec un preavis de quinze (15) jours. Si le materiel n'est pas totalement paye, le solde devient immediatement exigible.</p>

          <h2>Article 8 : Litiges</h2>
          <p>En cas de litige, les parties cherchent d'abord une solution amiable. A defaut, les tribunaux competents de la ville de Goma sont seuls habilites a trancher.</p>

          <section class="signature">
            <div class="signature-box operator-signature">
              <strong>Pour l'Operateur</strong>
              <p>Nom : KITSA LUSENGE LWASIVA Sage</p>
              <p>Tel : +243 980 208 012</p>
              <p>Email : sagelusenge@gmail.com</p>
              <div class="signature-line"></div>
              <p class="small">Signature manuscrite</p>
              <div class="stamp">
                <div class="stamp-inner">
                  <strong>LWASIVA</strong>
                  <span>NET</span>
                  <em>Goma - RDC</em>
                  <em>Votre FAI</em>
                </div>
              </div>
            </div>
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
  const [requestClients, setRequestClients] = useState({});
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
      <div className="panel table-panel">
        <PanelHeader icon={ShieldCheck} title={`Demandes de comptes (${data.accountRequests.filter((item) => item.status === 'en_attente').length} en attente)`} />
        <div className="quote-list">
          {data.accountRequests.length === 0 ? <p className="muted">Aucune demande de compte</p> : data.accountRequests.map((item) => (
            <div className="quote-item" key={item.id}>
              <div>
                <strong>{item.full_name} - {item.client_type}</strong>
                <span>{item.email} - {item.phone} - {item.address}, {item.city}</span>
                <span>Statut : {item.status}{item.reviewed_by_name ? ` par ${item.reviewed_by_name}` : ''}{item.admin_notes ? ` - ${item.admin_notes}` : ''}</span>
                {item.client_name && <span>Fiche client liee : {item.client_name}{item.client_code ? ` (${item.client_code})` : ''}</span>}
              </div>
              {item.status === 'en_attente' && (
                <div className="quote-actions">
                  <SelectInput
                    label="Affecter a la fiche client"
                    value={requestClients[item.id] || ''}
                    onChange={(clientId) => setRequestClients((previous) => ({ ...previous, [item.id]: clientId }))}
                    options={data.clients.map((client) => ({
                      value: client.id,
                      label: `${client.full_name} - ${client.client_code}${client.phone ? ` - ${client.phone}` : ''}`
                    }))}
                  />
                  <button className="primary-button" onClick={() => {
                    const adminNotes = window.prompt('Note interne facultative pour cette approbation :', '') || '';
                    submit(
                      () => api.approveAccountRequest(item.id, { clientId: requestClients[item.id], adminNotes }),
                      'Compte client approuve, lie et active'
                    );
                  }} disabled={!requestClients[item.id]}><CheckCircle2 size={17} /> Affecter et accepter</button>
                  <button className="small-button danger" onClick={() => {
                    const adminNotes = window.prompt('Motif du rejet (il sera envoye au client) :', '') || '';
                    submit(() => api.rejectAccountRequest(item.id, { adminNotes }), 'Demande rejetee');
                  }}><X size={17} /> Rejeter</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
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
                <button className="icon-button" title="Modifier" onClick={() => editUser(item)}><Pencil size={17} /></button>
                <button className="small-button" onClick={() => submit(() => api.updateUser(item.id, { isActive: !item.is_active }), item.is_active ? 'Utilisateur bloque' : 'Utilisateur active')}>{item.is_active ? 'Bloquer' : 'Activer'}</button>
                <button className="icon-button danger" title="Supprimer" onClick={() => submit(() => api.deleteUser(item.id), 'Utilisateur supprime')}><Trash2 size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function PushNotificationPanel() {
  const [state, setState] = useState('loading');
  const [message, setMessage] = useState('');
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        if (mounted) setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        if (mounted) setState('blocked');
        return;
      }

      try {
        const status = await api.webPushStatus();
        if (mounted) setState(status.enabled ? 'active' : 'inactive');
      } catch (error) {
        if (mounted) {
          setState('inactive');
          setMessage(error.message);
        }
      }
    }

    loadStatus();
    return () => { mounted = false; };
  }, []);

  async function enablePush() {
    setPushBusy(true);
    setMessage('');
    try {
      if (!window.isSecureContext) throw new Error('Les notifications exigent une connexion HTTPS');
      const key = await api.webPushPublicKey();
      if (!key.configured || !key.publicKey) throw new Error('Web Push n est pas configure sur le serveur');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'inactive');
        throw new Error('Permission de notification non accordee');
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key.publicKey)
        });
      }

      await api.subscribeWebPush({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent
      });
      setState('active');
      setMessage('Notifications activees sur cet appareil.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    setMessage('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.unsubscribeWebPush({ endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
      setState('inactive');
      setMessage('Notifications desactivees sur cet appareil.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPushBusy(false);
    }
  }

  async function testPush() {
    setPushBusy(true);
    setMessage('');
    try {
      await api.testWebPush();
      setMessage('Notification test envoyee.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPushBusy(false);
    }
  }

  const labels = {
    loading: 'Verification...',
    active: 'Activees',
    inactive: 'Desactivees',
    blocked: 'Bloquees par le navigateur',
    unsupported: 'Non prises en charge'
  };

  return (
    <div className="panel push-panel">
      <PanelHeader icon={BellRing} title="Notifications telephone / navigateur" />
      <div className="push-panel-content">
        <div className={`push-status ${state}`}>
          <span className="push-status-dot" />
          <div>
            <span>Etat sur cet appareil</span>
            <strong>{labels[state]}</strong>
          </div>
        </div>
        <div className="push-actions">
          {state !== 'active' && state !== 'unsupported' && (
            <button className="primary-button" disabled={pushBusy || state === 'loading'} onClick={enablePush}>
              <BellRing size={17} /> Activer
            </button>
          )}
          {state === 'active' && (
            <>
              <button className="primary-button" disabled={pushBusy} onClick={testPush}><Send size={17} /> Tester</button>
              <button className="small-button" disabled={pushBusy} onClick={disablePush}><X size={17} /> Desactiver</button>
            </>
          )}
        </div>
      </div>
      {message && <p className="push-message">{message}</p>}
    </div>
  );
}

function Notifications({ data, submit }) {
  const [form, setForm] = useState({ title: '', body: '', targetRole: 'all' });
  return (
    <>
      <PushNotificationPanel />
      <div className="panel">
        <PanelHeader icon={Timer} title="Alertes push des echeances" />
        <div className="action-row">
          <p className="muted">Alertes automatiques J-5, J-3, J-1 et le jour de l echeance.</p>
          <button className="primary-button" onClick={() => submit(() => api.runDeadlinePushAlerts(), 'Alertes push verifiees')}>
            <BellRing size={17} />
            Verifier maintenant
          </button>
        </div>
      </div>
      <div className="panel">
        <PanelHeader icon={MessageSquare} title="Message dans l'application" />
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); submit(() => api.sendAppMessage(form), 'Message envoye aux utilisateurs'); }}>
          <TextInput label="Titre" value={form.title} onChange={(title) => setForm({ ...form, title })} />
          <TextInput label="Message" value={form.body} onChange={(body) => setForm({ ...form, body })} />
          <SelectInput label="Recepteurs" value={form.targetRole} onChange={(targetRole) => setForm({ ...form, targetRole })} options={[
            { value: 'all', label: 'Tout le monde' },
            { value: 'client', label: 'Clients' },
            { value: 'manager', label: 'Managers' },
            { value: 'technician', label: 'Techniciens' },
            { value: 'cashier', label: 'Caisse' },
            { value: 'admin', label: 'Admins' }
          ]} />
          <button className="primary-button"><Send size={17} /> Envoyer dans l app</button>
        </form>
      </div>
      <TablePanel
        title="Messages envoyes dans l app"
        icon={MessageSquare}
        columns={['Titre', 'Pour', 'Destinataires', 'Lus']}
        rows={data.adminAppMessages.map((item) => [item.title, item.target_role, item.recipients_count, item.read_count])}
      />
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

function FeedbackAdmin({ data, submit }) {
  const publicCount = data.allFeedback.filter((item) => item.is_public && item.status === 'approuve').length;
  return (
    <div className="panel table-panel">
      <PanelHeader icon={MessageSquare} title={`Appreciations publiques (${publicCount}/4)`} />
      <div className="quote-list">
        {data.allFeedback.length === 0 ? <p className="muted">Aucune appreciation recue</p> : data.allFeedback.map((item) => (
          <div className="quote-item" key={item.id}>
            <div>
              <strong>{item.full_name} - {item.rating}/5</strong>
              <span>{item.neighborhood || 'Goma'} - {item.comment} - {item.status}{item.is_public ? ' - visible sur le site' : ''}</span>
            </div>
            <div className="quote-actions">
              <button className="icon-button" title="Approuver" onClick={() => submit(() => api.updateFeedback(item.id, { status: 'approuve', isPublic: true }), 'Appreciation approuvee')}><CheckCircle2 size={17} /></button>
              <button className="icon-button" title="Retirer" onClick={() => submit(() => api.updateFeedback(item.id, { isPublic: false }), 'Appreciation retiree')}><X size={17} /></button>
              <button className="icon-button danger" title="Rejeter" onClick={() => submit(() => api.updateFeedback(item.id, { status: 'rejete', isPublic: false }), 'Appreciation rejetee')}><Trash2 size={17} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientSpace({ data, messages = [], submit }) {
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', email: '', address: '' });
  const unpaid = data.invoices.filter((item) => item.status !== 'payee' && item.status !== 'annulee');
  const unpaidTotal = unpaid.reduce((sum, item) => sum + invoiceRemaining(item), 0);
  const activeContract = data.contracts.find((item) => item.status === 'actif') || data.contracts[0];
  const countdown = activeContract ? subscriptionCountdownForContract(activeContract, data.invoices, new Date()) : null;
  const isExpired = countdown && countdown.remainingMs <= 0;
  const nextInvoice = [...unpaid].sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
  const activeEquipment = (data.equipmentStatus || []).find((item) => String(item.contract_id) === String(activeContract?.id)) || (data.equipmentStatus || [])[0];
  const equipmentRemaining = Number(activeEquipment?.equipment_remaining_usd || 0);
  const openTickets = (data.tickets || []).filter((item) => item.status !== 'resolu' && item.status !== 'ferme');
  const latestMessage = messages[0];

  useEffect(() => {
    setProfileForm({
      fullName: data.client?.full_name || '',
      phone: data.client?.phone || '',
      email: data.client?.email || '',
      address: data.client?.address || ''
    });
  }, [data.client]);

  return (
    <>
      <div className="metric-grid">
        <div className="metric"><Users size={20} /><span>Client</span><strong>{data.client?.full_name || '-'}</strong></div>
        <div className="metric"><Wifi size={20} /><span>Bouquet</span><strong>{activeContract?.plan_name || '-'}</strong></div>
        <div className="metric"><Timer size={20} /><span>Echeance</span><strong>{countdown ? (countdown.isPaused ? 'En pause' : countdown.expiresAt.toLocaleDateString('fr-FR')) : '-'}</strong></div>
        <div className="metric"><Receipt size={20} /><span>Factures a payer</span><strong>{unpaid.length}</strong></div>
        <div className="metric"><BadgeDollarSign size={20} /><span>Reste a payer</span><strong>{money(unpaidTotal)}</strong></div>
        <div className="metric"><Boxes size={20} /><span>Kit internet</span><strong>{equipmentRemaining > 0 ? money(equipmentRemaining) : 'En ordre'}</strong></div>
        <div className="metric"><Ticket size={20} /><span>Reclamations ouvertes</span><strong>{openTickets.length}</strong></div>
        <div className="metric"><MessageSquare size={20} /><span>Messages recus</span><strong>{messages.length}</strong></div>
      </div>
      <PushNotificationPanel />
      <div className="two-columns">
        <div className="panel client-summary-panel">
          <PanelHeader icon={ShieldCheck} title="Etat du service" />
          <div className="client-status-list">
            <div><span>Contrat actif</span><strong>{activeContract?.contract_number || '-'}</strong></div>
            <div><span>Adresse</span><strong>{activeContract?.installation_address || data.client?.address || '-'}</strong></div>
            <div><span>Statut</span><strong>{activeContract?.status || 'Aucun contrat'}</strong></div>
            <div><span>Debit</span><strong>{activeContract ? bandwidthText(activeContract) : '-'}</strong></div>
            <div><span>Echeance abonnement</span><strong>{countdown ? (countdown.isPaused ? 'Compteur suspendu' : countdown.expiresAt.toLocaleDateString('fr-FR')) : '-'}</strong></div>
            <div><span>Temps restant</span><strong>{countdown ? (countdown.isPaused ? `${countdown.days} j ${countdown.hours} h figes` : isExpired ? `Expire depuis ${countdown.days} j` : `${countdown.days} j ${countdown.hours} h`) : '-'}</strong></div>
          </div>
        </div>
        <div className="panel client-summary-panel">
          <PanelHeader icon={Boxes} title="Kit internet" />
          {activeEquipment ? (
            <div className="client-status-list">
              <div><span>Kit</span><strong>{activeEquipment.equipment_kit || 'Materiel contrat'}</strong></div>
              <div><span>Total kit</span><strong>{money(activeEquipment.equipment_total_usd)}</strong></div>
              <div><span>Deja paye</span><strong>{money(activeEquipment.equipment_paid_usd)}</strong></div>
              <div><span>Reste kit</span><strong>{equipmentRemaining > 0 ? money(equipmentRemaining) : 'En ordre'}</strong></div>
            </div>
          ) : (
            <p className="muted">Aucun kit rattache au contrat pour le moment.</p>
          )}
        </div>
      </div>
      <div className="two-columns">
        <div className="panel client-summary-panel">
          <PanelHeader icon={Receipt} title="Prochaine facture" />
          {nextInvoice ? (
            <div className="client-status-list">
              <div><span>Numero</span><strong>{nextInvoice.invoice_number}</strong></div>
              <div><span>Type</span><strong>{invoiceTypeLabel(nextInvoice.invoice_type)}</strong></div>
              <div><span>Reste a payer</span><strong>{money(invoiceRemaining(nextInvoice))}</strong></div>
              <div><span>Date limite</span><strong>{dateText(nextInvoice.due_date)}</strong></div>
            </div>
          ) : (
            <p className="muted">Aucune facture a payer.</p>
          )}
        </div>
        <div className="panel client-summary-panel">
          <PanelHeader icon={MessageSquare} title="Dernier message" />
          {latestMessage ? (
            <div className="client-message-card">
              <strong>{latestMessage.title}</strong>
              <p>{latestMessage.body}</p>
              <span>{latestMessage.created_at}</span>
            </div>
          ) : (
            <p className="muted">Aucun message pour le moment.</p>
          )}
        </div>
      </div>
      <div className="two-columns">
        <TablePanel title="Mes contrats" icon={FileText} columns={['Numero', 'Bouquet', 'Debit', 'Statut']} rows={data.contracts.map((item) => [item.contract_number, item.plan_name, bandwidthText(item), item.status])} />
        <TablePanel title="Mes factures a payer" icon={Receipt} columns={['Numero', 'Type', 'Reste', 'Statut', 'Date limite']} rows={unpaid.map((item) => [item.invoice_number, invoiceTypeLabel(item.invoice_type), money(invoiceRemaining(item)), invoiceStatusLabel(item.status), item.due_date])} />
      </div>
      <QuickForm title="Mon profil" icon={Users} onSubmit={() => submit(() => api.updateClientProfile(profileForm), 'Profil mis a jour')}>
        <TextInput label="Nom complet" value={profileForm.fullName} onChange={(fullName) => setProfileForm({ ...profileForm, fullName })} />
        <TextInput label="Telephone" value={profileForm.phone} onChange={(phone) => setProfileForm({ ...profileForm, phone })} />
        <TextInput label="Email" value={profileForm.email} onChange={(email) => setProfileForm({ ...profileForm, email })} />
        <TextInput label="Adresse" value={profileForm.address} onChange={(address) => setProfileForm({ ...profileForm, address })} />
      </QuickForm>
      <ClientComplaintForm data={data} submit={submit} />
      <TablePanel title="Mes reclamations recentes" icon={Ticket} columns={['Titre', 'Contrat', 'Priorite', 'Statut']} rows={(data.tickets || []).slice(0, 5).map((item) => [item.title, item.contract_number || '-', item.priority, item.status])} />
      <TablePanel title="Mes derniers paiements" icon={BadgeDollarSign} columns={['Reference', 'Montant', 'Methode', 'Date']} rows={data.payments.map((item) => [item.payment_reference, money(item.amount_usd), item.method, item.paid_at])} />
    </>
  );
}

function ClientContracts({ data }) {
  return <TablePanel title="Mes contrats" icon={FileText} columns={['Numero', 'Bouquet', 'Debit', 'Statut', 'Adresse']} rows={data.contracts.map((item) => [item.contract_number, item.plan_name, bandwidthText(item), item.status, item.installation_address])} />;
}

function ClientInvoices({ data }) {
  return <TablePanel title="Mes factures" icon={Receipt} columns={['Numero', 'Type', 'Periode', 'Total', 'Reste', 'Statut', 'Date limite']} rows={data.invoices.map((item) => [item.invoice_number, invoiceTypeLabel(item.invoice_type), `${item.period_start} - ${item.period_end}`, money(item.total_amount_usd), money(invoiceRemaining(item)), invoiceStatusLabel(item.status), item.due_date])} />;
}

function ClientComplaintForm({ data, submit }) {
  const emptyForm = { contractId: '', title: '', priority: 'normale', description: '' };
  const [form, setForm] = useState(emptyForm);

  function saveComplaint() {
    const body = {
      clientId: data.client?.id,
      contractId: form.contractId || undefined,
      title: form.title,
      priority: form.priority,
      description: form.description
    };
    submit(() => api.openTicket(body), 'Reclamation envoyee au support');
    setForm(emptyForm);
  }

  return (
    <QuickForm title="Nouvelle reclamation" icon={Ticket} onSubmit={saveComplaint}>
      <SelectInput label="Contrat concerne" value={form.contractId} onChange={(contractId) => setForm({ ...form, contractId })} options={data.contracts.map((contract) => ({ value: contract.id, label: `${contract.contract_number} - ${contract.plan_name}` }))} />
      <TextInput label="Sujet" value={form.title} onChange={(title) => setForm({ ...form, title })} />
      <SelectInput label="Priorite" value={form.priority} onChange={(priority) => setForm({ ...form, priority })} options={[
        { value: 'basse', label: 'Basse' },
        { value: 'normale', label: 'Normale' },
        { value: 'haute', label: 'Haute' },
        { value: 'urgente', label: 'Urgente' }
      ]} />
      <TextAreaInput label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
    </QuickForm>
  );
}

function ClientComplaints({ data, submit }) {
  return (
    <>
      <ClientComplaintForm data={data} submit={submit} />
      <div className="panel table-panel">
        <PanelHeader icon={Ticket} title="Suivi de mes reclamations" />
        <div className="quote-list">
          {(data.tickets || []).length === 0 ? <p className="muted">Aucune reclamation envoyee.</p> : (data.tickets || []).map((item) => (
            <div className="quote-item" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.contract_number || 'Sans contrat'} - Priorite {item.priority} - Statut {item.status}</span>
              </div>
              <span className="status-chip">{item.opened_at || '-'}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
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
                <button className="icon-button" title="Modifier" onClick={() => editClient(item)}><Pencil size={17} /></button>
                <button className="icon-button danger" title="Supprimer" onClick={() => submit(() => api.deleteClient(item.id), 'Client supprime')}><Trash2 size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Contracts({ data, submit }) {
  const emptyForm = { id: '', clientId: '', planId: '', installationAddress: '', status: 'essai', activatedAt: todayInputDate(), billingDueDay: 5, otherPriceUsd: 10, equipmentTotalPriceUsd: 100, equipmentInitialPaymentUsd: 20, equipmentMonthlyPaymentUsd: '', equipmentPaidInFull: false };
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(form.id);
  const selectedPlan = data.plans.find((plan) => String(plan.id) === String(form.planId));
  const isOtherPlan = selectedPlan?.name === 'Autre';

  function editContract(item) {
    setForm({
      id: item.contract_id,
      clientId: item.client_id,
      planId: item.plan_id,
      installationAddress: item.installation_address,
      status: item.status,
      activatedAt: item.activated_at || todayInputDate(),
      billingDueDay: item.billing_due_day || 5,
      otherPriceUsd: isOtherPlanName(item.plan_name) ? item.monthly_price_usd : 10,
      equipmentTotalPriceUsd: item.equipment_total_price_usd || 100,
      equipmentInitialPaymentUsd: item.equipment_initial_payment_usd || 20,
      equipmentMonthlyPaymentUsd: item.equipment_monthly_payment_usd || '',
      equipmentPaidInFull: Boolean(item.equipment_paid_in_full)
    });
  }

  return (
    <>
      <QuickForm title={isEditing ? 'Modifier contrat' : 'Nouveau contrat'} icon={FileText} onSubmit={() => submit(() => isEditing ? api.updateContract(form.id, form) : api.createContract(form), isEditing ? 'Contrat modifie' : 'Contrat cree')}>
        <SelectInput label="Client" value={form.clientId} onChange={(clientId) => setForm({ ...form, clientId })} options={data.clients.map((client) => ({ value: client.id, label: client.full_name }))} />
        <SelectInput label="Bouquet" value={form.planId} onChange={(planId) => setForm({ ...form, planId })} options={data.plans.map((plan) => ({ value: plan.id, label: `${plan.name} - ${money(plan.monthly_price_usd)}` }))} />
        <SelectInput label="Statut" value={form.status} onChange={(status) => setForm({ ...form, status })} options={['brouillon', 'essai', 'actif', 'suspendu']} />
        {isOtherPlan && <TextInput label="Prix autre (USD)" type="number" value={form.otherPriceUsd} onChange={(otherPriceUsd) => setForm({ ...form, otherPriceUsd })} />}
        <TextInput label="Date de mise en service" type="date" value={form.activatedAt} onChange={(activatedAt) => setForm({ ...form, activatedAt })} />
        <TextInput label="Jour du mois pour payer" type="number" value={form.billingDueDay} onChange={(billingDueDay) => setForm({ ...form, billingDueDay: clampDueDay(billingDueDay) })} />
        <TextInput label="Prix total du materiel (USD)" type="number" value={form.equipmentTotalPriceUsd} onChange={(equipmentTotalPriceUsd) => setForm({ ...form, equipmentTotalPriceUsd, equipmentInitialPaymentUsd: form.equipmentPaidInFull ? equipmentTotalPriceUsd : form.equipmentInitialPaymentUsd })} />
        <SelectInput label="Paiement du kit" value={form.equipmentPaidInFull ? 'total' : 'tranches'} onChange={(value) => setForm({ ...form, equipmentPaidInFull: value === 'total', equipmentInitialPaymentUsd: value === 'total' ? form.equipmentTotalPriceUsd : form.equipmentInitialPaymentUsd })} options={[
          { value: 'tranches', label: 'Paiement par tranches' },
          { value: 'total', label: 'Kit paye totalement' }
        ]} />
        <TextInput label="Tranche initiale kit (USD)" type="number" value={form.equipmentInitialPaymentUsd} onChange={(equipmentInitialPaymentUsd) => setForm({ ...form, equipmentInitialPaymentUsd })} />
        {!form.equipmentPaidInFull && <TextInput label="Tranche mensuelle kit (USD)" type="number" value={form.equipmentMonthlyPaymentUsd} onChange={(equipmentMonthlyPaymentUsd) => setForm({ ...form, equipmentMonthlyPaymentUsd })} />}
        <TextInput label="Adresse installation" value={form.installationAddress} onChange={(installationAddress) => setForm({ ...form, installationAddress })} />
        {isEditing && <button className="small-button" type="button" onClick={() => setForm({ ...emptyForm, activatedAt: todayInputDate() })}>Annuler</button>}
      </QuickForm>
      <div className="panel table-panel">
        <PanelHeader icon={ClipboardList} title="Contrats en cours" />
        <div className="quote-list">
          {data.contracts.length === 0 ? <p className="muted">Aucun contrat</p> : data.contracts.map((item) => (
            <div className="quote-item" key={item.contract_id}>
              <div>
                <strong>{item.contract_number} - {item.client_name}</strong>
                <span>{item.plan_name} - {item.status} - {bandwidthText(item)} - Mise en service: {dateText(item.activated_at)}</span>
              </div>
              <div className="quote-actions">
                <button className="icon-button" title="Imprimer contrat" onClick={() => printContractDocument(item)}><Printer size={17} /></button>
                <button className="icon-button" title="Modifier" onClick={() => editContract(item)}><Pencil size={17} /></button>
                <button className="icon-button" title={item.status === 'suspendu' ? 'Reactiver et reprendre le compteur' : 'Activer'} onClick={() => submit(() => item.status === 'suspendu' ? api.restoreContract(item.contract_id) : api.updateContract(item.contract_id, { status: 'actif' }), item.status === 'suspendu' ? 'Contrat reactive, echeance reprise' : 'Contrat active')}><CheckCircle2 size={17} /></button>
                {item.status !== 'suspendu' && <button className="icon-button" title="Suspendre et figer le compteur" onClick={() => submit(() => api.suspendContract(item.contract_id), 'Contrat suspendu, echeance figee')}><X size={17} /></button>}
                <button className="icon-button danger" title="Supprimer" onClick={() => submit(() => api.deleteContract(item.contract_id), 'Contrat supprime')}><Trash2 size={17} /></button>
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
          <p>{bandwidthText(plan)}</p>
          <b>{money(plan.monthly_price_usd)} / mois</b>
        </div>
      ))}
    </div>
  );
}

function Invoices({ data, submit }) {
  const emptyForm = { id: '', contractId: '', invoiceType: 'facture', status: 'non_reglee', periodStart: '', periodEnd: '', dueDate: '', installationAmountUsd: '', subscriptionAmountUsd: '', equipmentInstallmentAmountUsd: '', penaltyAmountUsd: '', discountAmountUsd: '' };
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(form.id);

  function setContract(contractId) {
    const contract = data.contracts.find((item) => String(item.contract_id) === String(contractId));
    const hasExistingInvoice = data.invoices.some((item) => String(item.contract_id) === String(contractId));
    setForm({
      ...form,
      contractId,
      subscriptionAmountUsd: contract?.monthly_price_usd || '',
      installationAmountUsd: !hasExistingInvoice ? contract?.equipment_initial_payment_usd || '' : ''
    });
  }

  function editInvoice(item) {
    setForm({
      id: item.id,
      contractId: item.contract_id,
      invoiceType: item.invoice_type || 'facture',
      status: item.status || 'non_reglee',
      periodStart: dateInputValue(item.period_start),
      periodEnd: dateInputValue(item.period_end),
      dueDate: dateInputValue(item.due_date),
      installationAmountUsd: item.installation_amount_usd || '',
      subscriptionAmountUsd: item.subscription_amount_usd || '',
      equipmentInstallmentAmountUsd: item.equipment_installment_amount_usd || '',
      penaltyAmountUsd: item.penalty_amount_usd || '',
      discountAmountUsd: item.discount_amount_usd || ''
    });
  }

  function saveInvoice() {
    const body = {
      ...form,
      contractId: form.contractId,
      installationAmountUsd: form.installationAmountUsd || 0,
      subscriptionAmountUsd: form.subscriptionAmountUsd || undefined,
      equipmentInstallmentAmountUsd: form.equipmentInstallmentAmountUsd || 0,
      penaltyAmountUsd: form.penaltyAmountUsd || 0,
      discountAmountUsd: form.discountAmountUsd || 0
    };

    const action = isEditing ? () => api.updateInvoice(form.id, body) : () => api.createInvoice(body);
    submit(action, isEditing ? 'Facture modifiee' : 'Facture creee');
    setForm(emptyForm);
  }

  function printInvoice(item) {
    const rows = [
      ['Installation', item.installation_amount_usd],
      ['Abonnement Internet', item.subscription_amount_usd],
      ['Paiement acompte materiel', item.equipment_installment_amount_usd],
      ['Penalite', item.penalty_amount_usd],
      ['Remise', positiveAmount(item.discount_amount_usd) ? -Number(item.discount_amount_usd) : 0]
    ].filter(([, amount]) => positiveAmount(Math.abs(Number(amount || 0))) > 0);
    const paidAmount = Number(item.paid_amount_usd || 0);
    const remainingAmount = Number(item.total_amount_usd || 0) - paidAmount;
    const html = `
      <html>
        <head><title>${text(item.invoice_number)}</title>${documentStyles()}</head>
        <body>
          <main class="doc compact-doc">
            <header class="doc-header compact-header">
              <div>
                <div class="brand-title">LWASIVA_NET</div>
                <div class="brand-sub">Contact officiel : +243 980 208 012</div>
              </div>
              <div class="doc-title">
                <h1>${invoiceTypeLabel(item.invoice_type)}</h1>
                <span class="badge">${text(item.invoice_number)}</span>
              </div>
            </header>
            <section class="grid compact-grid">
              <div class="box">
                <h2>Client</h2>
                <div class="field-line"><strong>Nom</strong><span>${text(item.client_name)}</span></div>
                <div class="field-line"><strong>Telephone</strong><span>${text(item.client_phone)}</span></div>
                <div class="field-line"><strong>Contrat</strong><span>${text(item.contract_number)}</span></div>
              </div>
              <div class="box">
                <h2>Periode</h2>
                <div class="field-line"><strong>Du</strong><span>${dateText(item.period_start)}</span></div>
                <div class="field-line"><strong>Au</strong><span>${dateText(item.period_end)}</span></div>
                <div class="field-line"><strong>Echeance</strong><span>${dateText(item.due_date)}</span></div>
                <div class="field-line"><strong>Statut</strong><span>${invoiceStatusLabel(item.status)}</span></div>
              </div>
            </section>
            <section class="box compact-box">
              <h2>Details</h2>
              <table>
                <tbody>
                  ${rows.map(([label, amount]) => `<tr><td>${text(label)}</td><td><strong>${money(amount)}</strong></td></tr>`).join('')}
                  <tr><td>Total</td><td><strong>${money(item.total_amount_usd)}</strong></td></tr>
                  ${paidAmount > 0 ? `<tr><td>Deja paye</td><td><strong>${money(paidAmount)}</strong></td></tr>` : ''}
                  ${paidAmount > 0 ? `<tr><td>Reste</td><td><strong>${money(remainingAmount)}</strong></td></tr>` : ''}
                </tbody>
              </table>
            </section>
            <section class="signature compact-signature">
              <div class="signature-box"><strong>LWASIVA_NET</strong><p>Nom : KITSA LUSENGE LWASIVA Sage</p></div>
              <div class="signature-box"><strong>Client</strong><p>Nom : ${text(item.client_name)}</p></div>
            </section>
          </main>
        </body>
      </html>`;
    printHtml(item.invoice_number, html);
  }

  return (
    <>
      <QuickForm title={isEditing ? 'Modifier facture' : 'Facture mensuelle'} icon={Receipt} onSubmit={saveInvoice}>
        <SelectInput label="Contrat" value={form.contractId} onChange={setContract} options={data.contracts.map((contract) => ({ value: contract.contract_id, label: `${contract.contract_number} - ${contract.client_name}` }))} />
        <SelectInput label="Type" value={form.invoiceType} onChange={(invoiceType) => setForm({ ...form, invoiceType })} options={[
          { value: 'facture', label: 'Facture' },
          { value: 'proforma', label: 'Proforma' },
          { value: 'avoir', label: 'Avoir' }
        ]} />
        <SelectInput label="Statut" value={form.status} onChange={(status) => setForm({ ...form, status })} options={[
          { value: 'brouillon', label: 'Brouillon' },
          { value: 'non_reglee', label: 'Non reglee' },
          { value: 'partielle', label: 'Partielle' },
          { value: 'payee', label: 'Payee' }
        ]} />
        <TextInput label="Debut" type="date" value={form.periodStart} onChange={(periodStart) => setForm({ ...form, periodStart })} />
        <TextInput label="Fin" type="date" value={form.periodEnd} onChange={(periodEnd) => setForm({ ...form, periodEnd })} />
        <TextInput label="Date limite de paiement" type="date" value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} />
        <TextInput label="Installation / equipement initial" type="number" value={form.installationAmountUsd} onChange={(installationAmountUsd) => setForm({ ...form, installationAmountUsd })} />
        <TextInput label="Abonnement USD" type="number" value={form.subscriptionAmountUsd} onChange={(subscriptionAmountUsd) => setForm({ ...form, subscriptionAmountUsd })} />
        <TextInput label="Paiement materiel USD" type="number" value={form.equipmentInstallmentAmountUsd} onChange={(equipmentInstallmentAmountUsd) => setForm({ ...form, equipmentInstallmentAmountUsd })} />
        <TextInput label="Penalite USD" type="number" value={form.penaltyAmountUsd} onChange={(penaltyAmountUsd) => setForm({ ...form, penaltyAmountUsd })} />
        <TextInput label="Remise USD" type="number" value={form.discountAmountUsd} onChange={(discountAmountUsd) => setForm({ ...form, discountAmountUsd })} />
        {isEditing && <button type="button" className="secondary-button" onClick={() => setForm(emptyForm)}><X size={17} /> Annuler</button>}
      </QuickForm>
      <div className="panel table-panel">
        <PanelHeader icon={Receipt} title="Factures" />
        <div className="quote-list">
          {data.invoices.length === 0 ? <p className="muted">Aucune facture</p> : data.invoices.map((item) => (
            <div className="quote-item" key={item.id}>
              <div>
                <strong>{item.invoice_number} - {item.client_name}</strong>
                <span>{invoiceTypeLabel(item.invoice_type)} - {invoiceStatusLabel(item.status)} - Total {money(item.total_amount_usd)} - Reste {money(Number(item.total_amount_usd || 0) - Number(item.paid_amount_usd || 0))}</span>
              </div>
              <div className="quote-actions">
                <button className="icon-button" title="Imprimer facture" onClick={() => printInvoice(item)}><Printer size={17} /></button>
                <button className="icon-button" title="Modifier" onClick={() => editInvoice(item)}><Pencil size={17} /></button>
                <button className="icon-button danger" title="Supprimer" onClick={() => submit(() => api.deleteInvoice(item.id), 'Facture supprimee')}><Trash2 size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Payments({ data, submit }) {
  const emptyForm = { id: '', invoiceId: '', amountUsd: '', method: 'especes', transactionNumber: '', paidAt: currentDateTimeInput(), notes: '', isEquipmentPayment: false };
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(form.id);

  function editPayment(item) {
    setForm({
      id: item.id,
      invoiceId: item.invoice_id || '',
      amountUsd: item.amount_usd || '',
      method: item.method || 'especes',
      transactionNumber: item.transaction_number || '',
      paidAt: dateTimeInputValue(item.paid_at),
      notes: item.notes || '',
      isEquipmentPayment: Boolean(item.is_equipment_payment)
    });
  }

  function savePayment() {
    const body = {
      invoiceId: form.invoiceId,
      amountUsd: form.amountUsd,
      method: form.method,
      transactionNumber: form.transactionNumber,
      paidAt: form.paidAt || undefined,
      notes: form.notes || undefined,
      isEquipmentPayment: form.isEquipmentPayment
    };
    const action = isEditing ? () => api.updatePayment(form.id, body) : () => api.registerPayment(body);
    submit(action, isEditing ? 'Paiement modifie' : 'Paiement enregistre');
    setForm(emptyForm);
  }

  function printPaymentStatement(item) {
    const invoice = data.invoices.find((value) => String(value.id) === String(item.invoice_id)) || {};
    const invoiceNumber = item.invoice_number || invoice.invoice_number;
    const invoiceType = item.invoice_type || invoice.invoice_type;
    const periodStart = item.period_start || invoice.period_start;
    const periodEnd = item.period_end || invoice.period_end;
    const dueDate = item.due_date || invoice.due_date;
    const invoiceStatus = item.invoice_status || invoice.status;
    const contractNumber = item.contract_number || invoice.contract_number;
    const html = `
      <html>
        <head><title>${item.payment_reference}</title>${documentStyles()}</head>
        <body>
          <main class="doc">
            <header class="doc-header">
              <div>
                <div class="brand-title">LWASIVA_NET</div>
                <div class="brand-sub">Etat de paiement de facture</div>
                <div class="brand-sub">Contact officiel : +243 980 208 012</div>
              </div>
              <div class="doc-title">
                <h1>Recu de paiement</h1>
                <span class="badge">${text(item.payment_reference)}</span>
              </div>
            </header>

            <section class="grid">
              <div class="box">
                <h2>Client</h2>
                <div class="field-line"><strong>Nom</strong><span>${text(item.client_name)}</span></div>
                <div class="field-line"><strong>Telephone</strong><span>${text(item.client_phone)}</span></div>
                <div class="field-line"><strong>Contrat</strong><span>${text(contractNumber)}</span></div>
              </div>
              <div class="box">
                <h2>Facture</h2>
                <div class="field-line"><strong>Numero</strong><span>${text(invoiceNumber)}</span></div>
                <div class="field-line"><strong>Type</strong><span>${invoiceTypeLabel(invoiceType)}</span></div>
                <div class="field-line"><strong>Periode</strong><span>${text(periodStart)} - ${text(periodEnd)}</span></div>
                <div class="field-line"><strong>Date limite</strong><span>${dateText(dueDate)}</span></div>
                <div class="field-line"><strong>Statut</strong><span>${invoiceStatusLabel(invoiceStatus)}</span></div>
              </div>
            </section>

            <section class="box">
              <h2>Paiement recu</h2>
              <table>
                <tbody>
                  <tr><td>Montant paye</td><td><strong>${money(item.amount_usd)}</strong></td></tr>
                  <tr><td>Methode</td><td>${text(item.method)}</td></tr>
                  <tr><td>Transaction</td><td>${item.transaction_number || '-'}</td></tr>
                  <tr><td>Date paiement</td><td>${todayDisplayDate()}</td></tr>
                </tbody>
              </table>
              <p class="small">Ce document confirme uniquement le paiement reference ci-dessus. Le solde exact depend des paiements deja enregistres sur la facture.</p>
            </section>

            <section class="signature">
              <div class="signature-box"><strong>Pour LWASIVA_NET</strong><p>Nom : KITSA LUSENGE LWASIVA Sage</p><p>Date : ${todayDisplayDate()}</p></div>
              <div class="signature-box"><strong>Client</strong><p>Nom : ${text(item.client_name)}</p><p>Signature : ................................</p></div>
            </section>
            <footer class="footer">LWASIVA_NET - Etat de paiement imprime par l'administration</footer>
          </main>
        </body>
      </html>`;
    printHtml(item.payment_reference, html);
  }

  return (
    <>
      <QuickForm title={isEditing ? 'Modifier paiement' : 'Nouveau paiement'} icon={BadgeDollarSign} onSubmit={savePayment}>
        <SelectInput label="Facture" value={form.invoiceId} onChange={(invoiceId) => setForm({ ...form, invoiceId })} options={data.invoices.map((invoice) => ({ value: invoice.id, label: `${invoice.invoice_number} - ${money(invoice.total_amount_usd)}` }))} />
        <TextInput label="Montant USD" type="number" value={form.amountUsd} onChange={(amountUsd) => setForm({ ...form, amountUsd })} />
        <SelectInput label="Methode" value={form.method} onChange={(method) => setForm({ ...form, method })} options={['especes', 'airtel_money', 'mpesa', 'orange_money', 'banque', 'autre']} />
        <TextInput label="Transaction" value={form.transactionNumber} onChange={(transactionNumber) => setForm({ ...form, transactionNumber })} />
        <TextInput label="Date paiement" type="datetime-local" value={form.paidAt} onChange={(paidAt) => setForm({ ...form, paidAt })} />
        <TextInput label="Note" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
        <label className="field checkbox-field">
          <span>Paiement materiel</span>
          <input type="checkbox" checked={form.isEquipmentPayment} onChange={(event) => setForm({ ...form, isEquipmentPayment: event.target.checked })} />
        </label>
        {isEditing && <button type="button" className="secondary-button" onClick={() => setForm(emptyForm)}><X size={17} /> Annuler</button>}
      </QuickForm>
      <div className="panel table-panel">
        <PanelHeader icon={BadgeDollarSign} title="Paiements" />
        <div className="quote-list">
          {data.payments.length === 0 ? <p className="muted">Aucun paiement</p> : data.payments.map((item) => (
            <div className="quote-item" key={item.id}>
              <div>
                <strong>{item.payment_reference} - {item.client_name}</strong>
                <span>{item.invoice_number || '-'} - {invoiceTypeLabel(item.invoice_type)} - {money(item.amount_usd)} - {item.method} - {item.paid_at}</span>
              </div>
              <div className="quote-actions">
                <button className="icon-button" title="Imprimer l'etat de paiement" onClick={() => printPaymentStatement(item)}><Printer size={17} /></button>
                <button className="icon-button" title="Modifier" onClick={() => editPayment(item)}><Pencil size={17} /></button>
                <button className="icon-button danger" title="Supprimer" onClick={() => submit(() => api.deletePayment(item.id), 'Paiement supprime')}><Trash2 size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Budget({ data, submit }) {
  const emptyForm = {
    id: '',
    entryType: 'depense',
    categoryId: '',
    title: '',
    amountUsd: '',
    entryDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'especes',
    reference: '',
    notes: ''
  };
  const [form, setForm] = useState(emptyForm);
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'depense', description: '' });
  const isEditing = Boolean(form.id);
  const summary = data.budgetSummary?.summary || {};
  const categories = data.budgetCategories.filter((item) => item.type === form.entryType);

  function edit(item) {
    setForm({
      id: item.id,
      entryType: item.entry_type,
      categoryId: item.category_id,
      title: item.title,
      amountUsd: item.amount_usd,
      entryDate: item.entry_date,
      paymentMethod: item.payment_method,
      reference: item.reference || '',
      notes: item.notes || ''
    });
  }

  return (
    <>
      <div className="metric-grid">
        <div className="metric"><BadgeDollarSign size={20} /><span>Recettes</span><strong>{money(summary.total_recettes_usd)}</strong></div>
        <div className="metric"><Trash2 size={20} /><span>Depenses</span><strong>{money(summary.total_depenses_usd)}</strong></div>
        <div className="metric"><Building2 size={20} /><span>Solde</span><strong>{money(summary.solde_usd)}</strong></div>
      </div>

      <QuickForm title={isEditing ? 'Modifier une ligne budget' : 'Nouvelle ligne budget'} icon={BadgeDollarSign} onSubmit={() => submit(() => isEditing ? api.updateBudgetEntry(form.id, form) : api.createBudgetEntry(form), isEditing ? 'Ligne budget modifiee' : 'Ligne budget ajoutee')}>
        <SelectInput label="Type" value={form.entryType} onChange={(entryType) => setForm({ ...form, entryType, categoryId: '' })} options={[
          { value: 'recette', label: 'Recette / argent entre' },
          { value: 'depense', label: 'Depense / argent sorti' }
        ]} />
        <SelectInput label="Categorie" value={form.categoryId} onChange={(categoryId) => setForm({ ...form, categoryId })} options={categories.map((category) => ({ value: category.id, label: category.name }))} />
        <TextInput label="Libelle simple" value={form.title} onChange={(title) => setForm({ ...form, title })} />
        <TextInput label="Montant USD" type="number" value={form.amountUsd} onChange={(amountUsd) => setForm({ ...form, amountUsd })} />
        <TextInput label="Date" type="date" value={form.entryDate} onChange={(entryDate) => setForm({ ...form, entryDate })} />
        <SelectInput label="Methode" value={form.paymentMethod} onChange={(paymentMethod) => setForm({ ...form, paymentMethod })} options={['especes', 'airtel_money', 'mpesa', 'orange_money', 'banque', 'autre']} />
        <TextInput label="Reference" value={form.reference} onChange={(reference) => setForm({ ...form, reference })} />
        <TextInput label="Note" value={form.notes} onChange={(notes) => setForm({ ...form, notes })} />
        {isEditing && <button className="small-button" type="button" onClick={() => setForm(emptyForm)}>Annuler</button>}
      </QuickForm>

      <QuickForm title="Nouvelle categorie budget" icon={Plus} onSubmit={() => submit(() => api.createBudgetCategory(categoryForm), 'Categorie budget ajoutee')}>
        <TextInput label="Nom categorie" value={categoryForm.name} onChange={(name) => setCategoryForm({ ...categoryForm, name })} />
        <SelectInput label="Type" value={categoryForm.type} onChange={(type) => setCategoryForm({ ...categoryForm, type })} options={[
          { value: 'recette', label: 'Recette' },
          { value: 'depense', label: 'Depense' }
        ]} />
        <TextInput label="Description" value={categoryForm.description} onChange={(description) => setCategoryForm({ ...categoryForm, description })} />
      </QuickForm>

      <div className="panel table-panel">
        <PanelHeader icon={BadgeDollarSign} title="Recettes et depenses" />
        <div className="quote-list">
          {data.budgetEntries.length === 0 ? <p className="muted">Aucune ligne budget</p> : data.budgetEntries.map((item) => (
            <div className="quote-item" key={item.id}>
              <div>
                <strong>{item.entry_type === 'recette' ? 'Recette' : 'Depense'} - {item.title}</strong>
                <span>{item.category_name} - {money(item.amount_usd)} - {item.entry_date}</span>
              </div>
              <div className="quote-actions">
                <button className="icon-button" title="Modifier" onClick={() => edit(item)}><Pencil size={17} /></button>
                <button className="icon-button danger" title="Supprimer" onClick={() => submit(() => api.deleteBudgetEntry(item.id), 'Ligne budget supprimee')}><Trash2 size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TablePanel title="Totaux par categorie" icon={Building2} columns={['Type', 'Categorie', 'Total']} rows={(data.budgetSummary?.byCategory || []).map((item) => [item.entry_type, item.category_name, money(item.total_usd)])} />
    </>
  );
}

function Equipment({ data, submit }) {
  const emptyAssignment = {
    id: '',
    contractId: '',
    equipmentKitId: '',
    equipmentName: '',
    cpeSerialNumber: '',
    routerSerialNumber: '',
    ipAddress: '',
    macAddress: '',
    installedAt: todayInputDate(),
    ownershipStatus: 'propriete_operateur',
    conditionStatus: 'bon',
    notes: ''
  };
  const [assignment, setAssignment] = useState(emptyAssignment);
  const [kitForm, setKitForm] = useState({ name: '', description: '', totalPriceUsd: 100, stockQuantity: 0 });
  const [installment, setInstallment] = useState({ contractId: '', installmentNumber: 1, amountUsd: 20, dueDate: '' });
  const isEditing = Boolean(assignment.id);
  const totalStock = data.kits.reduce((sum, kit) => sum + Number(kit.stock_quantity || 0), 0);
  const assignedStock = data.kits.reduce((sum, kit) => sum + Number(kit.assigned_count || 0), 0);
  const equipmentStatusByContract = new Map(data.equipmentStatus.map((item) => [String(item.contract_id), item]));
  const contractsWithKitBalance = data.contracts.filter((contract) => {
    const status = equipmentStatusByContract.get(String(contract.contract_id));
    const remaining = status ? Number(status.equipment_remaining_usd || 0) : Number(contract.equipment_total_price_usd || 100);
    return remaining > 0;
  });

  function editAssignment(item) {
    setAssignment({
      id: item.id,
      contractId: item.contract_id || '',
      equipmentKitId: item.equipment_kit_id || '',
      equipmentName: item.equipment_name || item.kit_name || '',
      cpeSerialNumber: item.cpe_serial_number || '',
      routerSerialNumber: item.router_serial_number || '',
      ipAddress: item.ip_address || '',
      macAddress: item.mac_address || '',
      installedAt: dateInputValue(item.installed_at) || todayInputDate(),
      ownershipStatus: item.ownership_status || 'propriete_operateur',
      conditionStatus: item.condition_status || 'bon',
      notes: item.notes || ''
    });
  }

  function saveAssignment() {
    const body = {
      contractId: assignment.contractId,
      equipmentKitId: assignment.equipmentKitId,
      equipmentName: assignment.equipmentName,
      cpeSerialNumber: assignment.cpeSerialNumber || undefined,
      routerSerialNumber: assignment.routerSerialNumber || undefined,
      ipAddress: assignment.ipAddress,
      macAddress: assignment.macAddress || undefined,
      installedAt: assignment.installedAt || undefined,
      ownershipStatus: assignment.ownershipStatus,
      conditionStatus: assignment.conditionStatus,
      notes: assignment.notes || undefined
    };
    const action = isEditing
      ? () => api.updateEquipmentAssignment(assignment.id, body)
      : () => api.assignEquipment(body);
    submit(action, isEditing ? 'Affectation materiel modifiee' : 'Equipement affecte au client');
    setAssignment(emptyAssignment);
  }

  return (
    <>
      <div className="metric-grid equipment-metrics">
        <div className="metric"><Router size={20} /><span>Equipements affectes</span><strong>{data.equipmentAssignments.length}</strong></div>
        <div className="metric"><Wifi size={20} /><span>Adresses IP renseignees</span><strong>{data.equipmentAssignments.filter((item) => item.ip_address).length}</strong></div>
        <div className="metric"><Boxes size={20} /><span>Materiel achete</span><strong>{totalStock}</strong></div>
        <div className="metric"><CheckCircle2 size={20} /><span>Stock disponible</span><strong>{Math.max(totalStock - assignedStock, 0)}</strong></div>
      </div>

      <QuickForm title="Categorie / stock materiel" icon={Boxes} onSubmit={() => submit(() => api.createKit(kitForm), 'Categorie materiel ajoutee')}>
        <TextInput label="Categorie" value={kitForm.name} onChange={(name) => setKitForm({ ...kitForm, name })} />
        <TextInput label="Quantite achetee" type="number" value={kitForm.stockQuantity} onChange={(stockQuantity) => setKitForm({ ...kitForm, stockQuantity })} />
        <TextInput label="Prix unitaire USD" type="number" value={kitForm.totalPriceUsd} onChange={(totalPriceUsd) => setKitForm({ ...kitForm, totalPriceUsd })} />
        <TextInput label="Description" value={kitForm.description} onChange={(description) => setKitForm({ ...kitForm, description })} />
      </QuickForm>

      <TablePanel title="Stock par categorie" icon={Boxes} columns={['Categorie', 'Achete', 'Affecte', 'Disponible']} rows={data.kits.map((item) => [item.name, item.stock_quantity || 0, item.assigned_count || 0, item.available_count || 0])} />

      <QuickForm title={isEditing ? 'Modifier l equipement client' : 'Enregistrer un equipement client'} icon={Router} onSubmit={saveAssignment}>
        <SelectInput label="Client / contrat" value={assignment.contractId} onChange={(contractId) => setAssignment({ ...assignment, contractId })} options={data.contracts.map((contract) => ({ value: contract.contract_id, label: `${contract.client_name} - ${contract.contract_number}` }))} />
        <SelectInput label="Kit" value={assignment.equipmentKitId} onChange={(equipmentKitId) => setAssignment({ ...assignment, equipmentKitId })} options={data.kits.map((kit) => ({ value: kit.id, label: kit.name }))} />
        <TextInput label="Nom / modele equipement" value={assignment.equipmentName} onChange={(equipmentName) => setAssignment({ ...assignment, equipmentName })} />
        <TextInput label="Adresse IP" value={assignment.ipAddress} onChange={(ipAddress) => setAssignment({ ...assignment, ipAddress })} />
        <TextInput label="Adresse MAC" value={assignment.macAddress} onChange={(macAddress) => setAssignment({ ...assignment, macAddress })} />
        <TextInput label="Serie CPE" value={assignment.cpeSerialNumber} onChange={(cpeSerialNumber) => setAssignment({ ...assignment, cpeSerialNumber })} />
        <TextInput label="Serie routeur" value={assignment.routerSerialNumber} onChange={(routerSerialNumber) => setAssignment({ ...assignment, routerSerialNumber })} />
        <TextInput label="Date installation" type="date" value={assignment.installedAt} onChange={(installedAt) => setAssignment({ ...assignment, installedAt })} />
        <SelectInput label="Propriete" value={assignment.ownershipStatus} onChange={(ownershipStatus) => setAssignment({ ...assignment, ownershipStatus })} options={[
          { value: 'propriete_operateur', label: 'Propriete LWASIVA_NET' },
          { value: 'propriete_client', label: 'Propriete client' }
        ]} />
        <SelectInput label="Etat" value={assignment.conditionStatus} onChange={(conditionStatus) => setAssignment({ ...assignment, conditionStatus })} options={[
          { value: 'neuf', label: 'Neuf' },
          { value: 'bon', label: 'Bon' },
          { value: 'a_reparer', label: 'A reparer' },
          { value: 'remplace', label: 'Remplace' },
          { value: 'recupere', label: 'Recupere' }
        ]} />
        <TextAreaInput label="Notes techniques" value={assignment.notes} onChange={(notes) => setAssignment({ ...assignment, notes })} />
        {isEditing && <button type="button" className="small-button" onClick={() => setAssignment(emptyAssignment)}><X size={17} /> Annuler</button>}
      </QuickForm>

      <div className="panel table-panel">
        <PanelHeader icon={Router} title="Registre equipements et adresses IP" />
        <div className="quote-list">
          {data.equipmentAssignments.length === 0 ? <p className="muted">Aucun equipement affecte.</p> : data.equipmentAssignments.map((item) => (
            <div className="quote-item equipment-record" key={item.id}>
              <div className="equipment-record-main">
                <strong>{item.client_name} - {item.equipment_name || item.kit_name}</strong>
                <span>{item.contract_number} - {item.plan_name} - Installe le {dateText(item.installed_at)}</span>
                <div className="network-identifiers">
                  <span><b>IP</b>{item.ip_address || '-'}</span>
                  <span><b>MAC</b>{item.mac_address || '-'}</span>
                  <span><b>CPE</b>{item.cpe_serial_number || '-'}</span>
                  <span><b>Routeur</b>{item.router_serial_number || '-'}</span>
                </div>
              </div>
              <div className="quote-actions">
                <span className={`equipment-state ${item.condition_status}`}>{item.condition_status}</span>
                <button className="icon-button" title="Modifier" onClick={() => editAssignment(item)}><Pencil size={17} /></button>
                <button className="icon-button danger" title="Supprimer" onClick={() => submit(() => api.deleteEquipmentAssignment(item.id), 'Affectation materiel supprimee')}><Trash2 size={17} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {contractsWithKitBalance.length > 0 ? (
        <QuickForm title="Paiement du kit internet" icon={Boxes} onSubmit={() => submit(() => api.createInstallment(installment), 'Paiement du kit cree')}>
          <SelectInput
            label="Contrat"
            value={installment.contractId}
            onChange={(contractId) => {
              const status = equipmentStatusByContract.get(String(contractId));
              setInstallment({
                ...installment,
                contractId,
                amountUsd: status ? Number(status.equipment_remaining_usd || installment.amountUsd) : installment.amountUsd
              });
            }}
            options={contractsWithKitBalance.map((contract) => {
              const status = equipmentStatusByContract.get(String(contract.contract_id));
              return {
                value: contract.contract_id,
                label: `${contract.contract_number} - ${contract.client_name} - reste ${money(status?.equipment_remaining_usd || contract.equipment_total_price_usd || 100)}`
              };
            })}
          />
          <TextInput label="Numero du paiement" type="number" value={installment.installmentNumber} onChange={(installmentNumber) => setInstallment({ ...installment, installmentNumber })} />
          <TextInput label="Montant USD" type="number" value={installment.amountUsd} onChange={(amountUsd) => setInstallment({ ...installment, amountUsd })} />
          <TextInput label="Date limite de paiement" type="date" value={installment.dueDate} onChange={(dueDate) => setInstallment({ ...installment, dueDate })} />
        </QuickForm>
      ) : (
        <div className="panel">
          <PanelHeader icon={CheckCircle2} title="Paiement du kit internet" />
          <p className="muted">Tous les kits enregistres sont en ordre. Aucun champ de paiement materiel a afficher.</p>
        </div>
      )}
      <TablePanel title="Etat materiel" icon={Router} columns={['Contrat', 'Client', 'Kit', 'Paye', 'Reste']} rows={data.equipmentStatus.map((item) => [item.contract_number, item.client_name, item.equipment_kit || '-', money(item.equipment_paid_usd), money(item.equipment_remaining_usd)])} />
    </>
  );
}

function Reports({ data }) {
  const now = new Date();
  const [selectedPaymentClientId, setSelectedPaymentClientId] = useState('all');
  const [activeReportId, setActiveReportId] = useState('client-payments');
  const formatReportDate = (value, includeTime = false) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return includeTime ? date.toLocaleString('fr-FR') : date.toLocaleDateString('fr-FR');
  };
  const equipmentPaid = data.equipmentStatus.filter((item) => Number(item.equipment_remaining_usd || 0) <= 0 && Number(item.equipment_paid_usd || 0) > 0);
  const equipmentPending = data.equipmentStatus.filter((item) => Number(item.equipment_remaining_usd || 0) > 0);
  const unpaid = data.unpaidInvoices || [];
  const budgetSummary = data.budgetSummary?.summary || {};
  const deadlineRows = data.contracts
    .map((contract) => ({ contract, countdown: subscriptionCountdownForContract(contract, data.invoices, now) }))
    .filter((item) => item.countdown)
    .sort((a, b) => a.countdown.remainingMs - b.countdown.remainingMs);
  const paymentClients = data.clients
    .filter((client) => data.payments.some((payment) => String(payment.client_id) === String(client.id)))
    .sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'fr'));
  const selectedPaymentClient = paymentClients.find((client) => String(client.id) === String(selectedPaymentClientId));
  const selectedClientPayments = data.payments.filter((payment) => selectedPaymentClientId === 'all' || String(payment.client_id) === String(selectedPaymentClientId));
  const selectedClientPaymentTotal = selectedClientPayments.reduce((total, payment) => total + Number(payment.amount_usd || 0), 0);
  const clientPaymentRows = selectedClientPayments.map((payment) => [
    formatReportDate(payment.paid_at, true),
    payment.payment_reference,
    payment.contract_number,
    payment.invoice_number || '-',
    invoiceTypeLabel(payment.invoice_type),
    payment.method,
    payment.transaction_number || '-',
    money(payment.amount_usd)
  ]);
  if (clientPaymentRows.length > 0) clientPaymentRows.push(['', '', '', '', '', '', 'TOTAL PAYE', money(selectedClientPaymentTotal)]);

  const reports = [
    {
      title: 'Rapport echeances abonnements',
      icon: Timer,
      columns: ['Client', 'Contrat', 'Bouquet', 'Echeance', 'Etat'],
      rows: deadlineRows.map(({ contract, countdown }) => [
        contract.client_name,
        contract.contract_number,
        contract.plan_name,
        countdown.expiresAt.toLocaleDateString('fr-FR'),
        countdown.isPaused ? `En pause a ${countdown.days} j ${countdown.hours} h` : countdown.remainingMs <= 0 ? `Expire depuis ${countdown.days} j` : `${countdown.days} j ${countdown.hours} h restantes`
      ])
    },
    {
      title: 'Clients en ordre avec le kit',
      icon: CheckCircle2,
      columns: ['Client', 'Contrat', 'Kit', 'Paye', 'Reste'],
      rows: equipmentPaid.map((item) => [item.client_name, item.contract_number, item.equipment_kit || '-', money(item.equipment_paid_usd), money(item.equipment_remaining_usd)])
    },
    {
      title: 'Clients avec reste kit',
      icon: Boxes,
      columns: ['Client', 'Contrat', 'Kit', 'Paye', 'Reste'],
      rows: equipmentPending.map((item) => [item.client_name, item.contract_number, item.equipment_kit || '-', money(item.equipment_paid_usd), money(item.equipment_remaining_usd)])
    },
    {
      title: 'Rapport budget',
      icon: Building2,
      columns: ['Type', 'Categorie', 'Total'],
      rows: [
        ['Resume', 'Recettes', money(budgetSummary.total_recettes_usd)],
        ['Resume', 'Depenses', money(budgetSummary.total_depenses_usd)],
        ['Resume', 'Solde', money(budgetSummary.solde_usd)],
        ...(data.budgetSummary?.byCategory || []).map((item) => [item.entry_type, item.category_name, money(item.total_usd)])
      ]
    },
    {
      title: 'Liste clients',
      icon: Users,
      columns: ['Code', 'Nom', 'Telephone', 'Type', 'Adresse'],
      rows: data.clients.map((item) => [item.client_code, item.full_name, item.phone, item.client_type, item.address])
    },
    {
      title: 'Factures et abonnements a regulariser',
      icon: Receipt,
      columns: ['Client', 'Telephone', 'Facture', 'Type', 'Reste', 'Date limite'],
      rows: unpaid.map((item) => [item.client_name, item.client_phone, item.invoice_number, invoiceTypeLabel(item.invoice_type), money(item.remaining_amount_usd), item.due_date])
    },
    {
      title: 'Historique general des paiements',
      icon: BadgeDollarSign,
      columns: ['Date', 'Client', 'Telephone', 'Reference', 'Contrat', 'Facture', 'Methode', 'Montant'],
      rows: data.payments.map((item) => [formatReportDate(item.paid_at, true), item.client_name, item.client_phone, item.payment_reference, item.contract_number, item.invoice_number || '-', item.method, money(item.amount_usd)])
    },
    {
      title: 'Contrats et abonnements',
      icon: FileText,
      columns: ['Contrat', 'Client', 'Bouquet', 'Debut', 'Fin', 'Statut'],
      rows: data.contracts.map((item) => [item.contract_number, item.client_name, item.plan_name || '-', formatReportDate(item.start_date), formatReportDate(item.end_date), item.status])
    },
    {
      title: 'Factures entierement payees',
      icon: CheckCircle2,
      columns: ['Facture', 'Client', 'Type', 'Montant', 'Echeance', 'Statut'],
      rows: data.invoices.filter((item) => item.status === 'payee').map((item) => [item.invoice_number, item.client_name, invoiceTypeLabel(item.invoice_type), money(item.total_amount_usd), formatReportDate(item.due_date), item.status])
    },
    {
      title: 'Suivi des tickets support',
      icon: Ticket,
      columns: ['Client', 'Contrat', 'Titre', 'Priorite', 'Statut', 'Ouverture'],
      rows: data.tickets.map((item) => [item.client_name, item.contract_number || '-', item.title, item.priority, item.status, formatReportDate(item.created_at, true)])
    },
    {
      title: 'Demandes de devis',
      icon: ClipboardList,
      columns: ['Numero', 'Client', 'Telephone', 'Bouquet', 'Statut', 'Date'],
      rows: data.quotes.map((item) => [item.quote_number, item.full_name, item.phone, item.plan_name || '-', item.status, formatReportDate(item.created_at, true)])
    },
    {
      title: 'Mouvements detailles du budget',
      icon: Building2,
      columns: ['Date', 'Type', 'Categorie', 'Libelle', 'Reference', 'Methode', 'Montant'],
      rows: (data.budgetEntries || []).map((item) => [formatReportDate(item.entry_date), item.entry_type, item.category_name || '-', item.title, item.reference || '-', item.payment_method || '-', money(item.amount_usd)])
    }
  ];

  const reportDescriptions = {
    'Rapport echeances abonnements': 'Anticiper les expirations et les renouvellements.',
    'Clients en ordre avec le kit': 'Identifier les kits totalement regles.',
    'Clients avec reste kit': 'Suivre les soldes materiel encore ouverts.',
    'Rapport budget': 'Lire les recettes, depenses et le solde global.',
    'Liste clients': 'Exporter le registre administratif des clients.',
    'Factures et abonnements a regulariser': 'Prioriser les factures avec un montant restant.',
    'Historique general des paiements': 'Consulter toutes les transactions enregistrees.',
    'Contrats et abonnements': 'Verifier les contrats, bouquets et statuts.',
    'Factures entierement payees': 'Retrouver les factures deja soldees.',
    'Suivi des tickets support': 'Analyser les demandes et leur niveau de priorite.',
    'Demandes de devis': 'Suivre les prospects et demandes commerciales.',
    'Mouvements detailles du budget': 'Auditer chaque mouvement financier.'
  };
  const reportCatalog = [
    {
      id: 'client-payments',
      title: 'Paiements par client',
      description: 'Releve individuel avec dates, references et total paye.',
      icon: BadgeDollarSign,
      rows: clientPaymentRows
    },
    ...reports.map((report, index) => ({
      ...report,
      id: `report-${index}`,
      description: reportDescriptions[report.title] || 'Rapport administratif imprimable.'
    }))
  ];
  const activeReport = reportCatalog.find((report) => report.id === activeReportId) || reportCatalog[0];

  return (
    <>
      <section className="reports-hero">
        <div>
          <span className="reports-eyebrow"><BarChart3 size={14} /> Centre d'analyse</span>
          <h2>Rapports administratifs</h2>
          <p>Analysez l'activite de LWASIVA_NET, selectionnez un rapport puis imprimez un document pret a signer.</p>
        </div>
        <div className="reports-hero-status">
          <span><i /> Donnees actualisees</span>
          <strong>{reportCatalog.length} rapports</strong>
          <small>{now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</small>
        </div>
      </section>

      <div className="metric-grid reports-metric-grid">
        {[
          [Users, 'Clients', data.clients.length],
          [Timer, 'Abonnements expires', deadlineRows.filter((item) => item.countdown.remainingMs <= 0).length],
          [CheckCircle2, 'Kits en ordre', equipmentPaid.length],
          [Boxes, 'Kits avec reste', equipmentPending.length],
          [Receipt, 'Factures a suivre', unpaid.length],
          [Building2, 'Solde budget', money(budgetSummary.solde_usd)]
        ].map(([Icon, label, value], index) => (
          <div className="metric reports-metric" style={{ '--report-index': index }} key={label}><Icon size={20} /><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>

      <section className="panel report-library">
        <div className="report-library-heading">
          <div><PanelHeader icon={BarChart3} title="Bibliotheque de rapports" /><p className="muted">Choisissez le document que vous souhaitez consulter ou imprimer.</p></div>
          <span>{activeReport.rows.length} ligne(s) dans la selection</span>
        </div>
        <div className="report-catalog-grid">
          {reportCatalog.map((report, index) => {
            const Icon = report.icon || BarChart3;
            return (
              <button
                type="button"
                className={`report-catalog-card ${activeReportId === report.id ? 'active' : ''}`}
                style={{ '--report-card-index': index }}
                onClick={() => setActiveReportId(report.id)}
                key={report.id}
              >
                <span className="report-catalog-icon"><Icon size={19} /></span>
                <span><strong>{report.title}</strong><small>{report.description}</small></span>
                <b>{report.rows.length}</b>
              </button>
            );
          })}
        </div>
      </section>

      {activeReportId === 'client-payments' && (
        <div className="panel report-client-filter">
          <div>
            <PanelHeader icon={BadgeDollarSign} title="Releve des paiements par client" />
            <p className="muted">Selectionnez un client pour obtenir son historique complet, les dates, factures, references et le total paye.</p>
          </div>
          <SelectInput
            label="Client"
            value={selectedPaymentClientId}
            onChange={setSelectedPaymentClientId}
            options={[{ value: 'all', label: 'Tous les clients' }, ...paymentClients.map((client) => ({ value: client.id, label: `${client.full_name} - ${client.phone || 'sans telephone'}` }))]}
          />
          <div className="report-client-summary"><span>Transactions<strong>{selectedClientPayments.length}</strong></span><span>Total paye<strong>{money(selectedClientPaymentTotal)}</strong></span></div>
        </div>
      )}

      <ReportPanel
        key={`${activeReportId}-${selectedPaymentClientId}`}
        title={activeReportId === 'client-payments' ? `Releve paiements - ${selectedPaymentClient?.full_name || 'Tous les clients'}` : activeReport.title}
        icon={activeReport.icon}
        columns={activeReportId === 'client-payments' ? ['Date', 'Reference', 'Contrat', 'Facture', 'Type', 'Methode', 'Transaction', 'Montant'] : activeReport.columns}
        rows={activeReport.rows}
      />
    </>
  );
}

function escapeReportCell(value) {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function printReport(title, columns, rows) {
  const head = columns.map((column) => `<th>${escapeReportCell(column)}</th>`).join('');
  const body = rows.length === 0
    ? `<tr><td colspan="${columns.length}">Aucune donnee</td></tr>`
    : rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeReportCell(cell)}</td>`).join('')}</tr>`).join('');
  const html = `
    <html>
      <head><title>${escapeReportCell(title)}</title>${documentStyles()}</head>
      <body>
        <main class="doc">
          <header class="doc-header">
            <div>
              <div class="brand-title">LWASIVA_NET</div>
              <div class="brand-sub">Rapport administratif</div>
              <div class="brand-sub">Imprime le ${todayDisplayDate()}</div>
            </div>
            <div class="doc-title">
              <h1>${escapeReportCell(title)}</h1>
              <span class="badge">${rows.length} ligne(s)</span>
            </div>
          </header>
          <section class="report-meta">
            <div><span>Document</span><strong>Rapport administratif</strong></div>
            <div><span>Date d'edition</span><strong>${todayDisplayDate()}</strong></div>
            <div><span>Statut</span><strong>Donnees verifiees</strong></div>
          </section>
          <table>
            <thead><tr>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
          <section class="report-signatures">
            <div><strong>Etabli par</strong>Nom, date et signature</div>
            <div><strong>Verifie et approuve par</strong>Nom, date et signature</div>
          </section>
          <footer class="footer">LWASIVA_NET - Rapport imprime par l'administration</footer>
        </main>
      </body>
    </html>`;
  printHtml(title, html);
}

function ReportPanel({ title, icon, columns, rows }) {
  const Icon = icon || BarChart3;

  return (
    <div className="panel table-panel report-panel">
      <div className="report-panel-header">
        <PanelHeader icon={Icon} title={title} />
        <button className="small-button" type="button" onClick={() => printReport(title, columns, rows)}>
          <Printer size={17} />
          Imprimer
        </button>
      </div>
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

function TextAreaInput({ label, value, onChange }) {
  return (
    <label className="field field-wide">
      <span>{label}</span>
      <textarea value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
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
