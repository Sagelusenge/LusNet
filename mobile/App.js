import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { api, getToken, parseUser, setToken } from './src/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

const palettes = {
  light: {
    bg: '#eef4f2',
    surface: '#ffffff',
    soft: '#f4f8f7',
    ink: '#14211d',
    muted: '#687770',
    line: '#d8e5e0',
    brand: '#08765d',
    brandDark: '#044a3c',
    accent: '#d69d24',
    danger: '#a53b3b',
    nav: '#ffffff'
  },
  dark: {
    bg: '#071512',
    surface: '#10231f',
    soft: '#162e29',
    ink: '#f2fbf8',
    muted: '#a8bbb4',
    line: '#28443d',
    brand: '#19a780',
    brandDark: '#06362d',
    accent: '#e0ad39',
    danger: '#ff8c8c',
    nav: '#0d1f1b'
  }
};

function money(value) {
  return `${Number(value || 0).toFixed(2)} USD`;
}

function text(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

async function printDocument(title, html) {
  try {
    await Print.printAsync({ html });
  } catch (error) {
    const file = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { dialogTitle: title });
    } else {
      Alert.alert(title, 'PDF cree, mais le partage n est pas disponible sur cet appareil.');
    }
  }
}

function documentStyles() {
  return `
    <style>
      body { font-family: Arial, sans-serif; color: #17211d; margin: 0; background: #f5f8f7; }
      .doc { width: 92%; margin: 24px auto; background: white; padding: 28px; border: 1px solid #d9e5e0; }
      .head { display: flex; justify-content: space-between; gap: 20px; border-bottom: 3px solid #08765d; padding-bottom: 14px; margin-bottom: 18px; }
      .brand { font-size: 25px; font-weight: 900; color: #08765d; }
      .sub { color: #65756f; font-size: 12px; line-height: 1.6; }
      h1 { margin: 0; font-size: 22px; text-align: right; }
      h2 { color: #08765d; font-size: 16px; margin-top: 18px; }
      p { line-height: 1.55; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th, td { border: 1px solid #d9e5e0; padding: 8px; font-size: 12px; text-align: left; }
      th { background: #eef4f2; }
      .box { border: 1px solid #d9e5e0; padding: 12px; margin: 12px 0; }
      .row { display: flex; justify-content: space-between; gap: 16px; padding: 5px 0; border-bottom: 1px dashed #d9e5e0; }
      .selected { background: #e3f4ef; font-weight: 700; }
      .sign { display: flex; gap: 18px; margin-top: 28px; }
      .sign div { flex: 1; min-height: 110px; border: 1px solid #d9e5e0; padding: 12px; }
      .footer { margin-top: 18px; color: #65756f; font-size: 11px; text-align: center; }
    </style>
  `;
}

function selectedMark(name, selected) {
  return name === selected ? '[X]' : '[ ]';
}

async function registerPushNotifications(notify) {
  if (!Device.isDevice) return;
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return;

  const token = await Notifications.getExpoPushTokenAsync();
  await api.registerPushToken({
    expoPushToken: token.data,
    deviceName: Device.deviceName || 'Telephone',
    platform: Device.osName || 'mobile'
  }).catch((error) => notify?.('Notifications', error.message, 'error'));
}

function quoteHtml(item) {
  return `
    <html><head>${documentStyles()}</head><body><main class="doc">
      <header class="head"><div><div class="brand">LWASIVA_NET</div><div class="sub">Fournisseur d Acces Internet - Goma, Nord-Kivu, RDC<br/>KITSA LUSENGE LWASIVA Sage - +243 980 208 012</div></div><div><h1>Devis Internet</h1><div class="sub">Num : ${text(item.quote_number)}</div></div></header>
      <section class="box">
        <div class="row"><strong>Client</strong><span>${text(item.full_name)}</span></div>
        <div class="row"><strong>Telephone</strong><span>${text(item.phone)}</span></div>
        <div class="row"><strong>Adresse</strong><span>${text(item.address)}</span></div>
        <div class="row"><strong>Bouquet demande</strong><span>${text(item.plan_name || 'Non precise')}</span></div>
        <div class="row"><strong>Statut</strong><span>${text(item.status)}</span></div>
      </section>
      <h2>Details</h2>
      <p>Usage prevu : ${text(item.intended_usage || item.message || 'Non precise')}</p>
      <table><thead><tr><th>Bouquet</th><th>Debit</th><th>Prix mensuel</th></tr></thead><tbody><tr><td>${text(item.plan_name || '-')}</td><td>${text(item.bandwidth_mbps ? `${item.bandwidth_mbps} Mbps` : '-')}</td><td>${money(item.monthly_price_usd)}</td></tr></tbody></table>
      <p>Ce devis est transmis a l administration. Le contrat final est imprime uniquement apres validation.</p>
      <section class="sign"><div><strong>Pour LWASIVA_NET</strong><p>Date : ..... / ..... / 202...</p></div><div><strong>Pour le demandeur</strong><p>${text(item.full_name)}</p><p>Date : ..... / ..... / 202...</p></div></section>
      <footer class="footer">LWASIVA_NET - Devis</footer>
    </main></body></html>`;
}

function contractHtml(item, client = {}) {
  const selectedPlan = item.plan_name || '.........................................';
  const clientName = item.client_name || client.full_name || '';
  const clientPhone = item.client_phone || client.phone || '';
  const clientAddress = item.installation_address || item.client_address || client.address || '';
  return `
    <html><head>${documentStyles()}</head><body><main class="doc">
      <header class="head"><div><div class="brand">LWASIVA_NET</div><div class="sub">Fournisseur d Acces Internet - Goma, Nord-Kivu, RDC<br/>Representant : KITSA LUSENGE LWASIVA Sage - +243 980 208 012</div></div><div><h1>Contrat d Abonnement</h1><div class="sub">Num : ${text(item.contract_number)}</div></div></header>
      <section class="box"><div class="row"><strong>Fait a</strong><span>Goma, Province du Nord-Kivu, RDC</span></div><div class="row"><strong>Client</strong><span>${text(clientName)}</span></div><div class="row"><strong>Adresse</strong><span>${text(clientAddress)}</span></div><div class="row"><strong>Telephone</strong><span>${text(clientPhone)}</span></div></section>
      <h2>Article 1 : Objet du Contrat</h2><p>Le present contrat definit les conditions techniques, juridiques et financieres dans lesquelles LWASIVA_NET fournit au Client un acces Internet haut debit par liaison sans fil, ainsi que les equipements necessaires a la reception du signal.</p>
      <h2>Article 2 : Offre choisie</h2>
      <table><thead><tr><th>Choix</th><th>Bouquet</th><th>Debit</th><th>Usage recommande</th><th>Prix mensuel</th></tr></thead><tbody>
        <tr class="${selectedPlan === 'Basic Home' ? 'selected' : ''}"><td>${selectedMark('Basic Home', selectedPlan)}</td><td>Basic Home</td><td>Jusqu a 5 Mbps</td><td>Navigation, reseaux sociaux, video SD</td><td>15 USD</td></tr>
        <tr class="${selectedPlan === 'Stream Plus' ? 'selected' : ''}"><td>${selectedMark('Stream Plus', selectedPlan)}</td><td>Stream Plus</td><td>Jusqu a 10 Mbps</td><td>Streaming HD, teletravail</td><td>20 USD</td></tr>
        <tr class="${selectedPlan === 'Pro Ultra' ? 'selected' : ''}"><td>${selectedMark('Pro Ultra', selectedPlan)}</td><td>Pro Ultra</td><td>Jusqu a 30 Mbps</td><td>Streaming 4K, gaming, multi-utilisateurs</td><td>50 USD</td></tr>
      </tbody></table>
      <p>Le Client souscrit au bouquet <strong>${text(selectedPlan)}</strong>, tarif mensuel <strong>${money(item.monthly_price_usd)}</strong>.</p>
      <h2>Article 3 : Equipements</h2><p>Kit de connexion : antenne CPE, routeur Wi-Fi, cablage et accessoires. Valeur totale : <strong>100 USD</strong>. Tranche 1 : <strong>20 USD</strong>.</p>
      <h2>Article 4 : Interdiction de revente</h2><p>La connexion est personnelle. La revente, le partage payant, les tickets Wi-Fi et la sous-location sont interdits.</p>
      <h2>Article 5 : Paiement</h2><p>L abonnement mensuel est payable d avance, deux jours avant l echeance fixee au <strong>${text(item.billing_due_day || '')}</strong> de chaque mois.</p>
      <h2>Article 6 : Service et support</h2><p>LWASIVA_NET fournit le service 24h/24 et 7j/7, sauf force majeure ou maintenance programmee.</p>
      <h2>Article 7 : Duree et resiliation</h2><p>Une periode d essai de sept jours est accordee. La resiliation apres essai se fait avec preavis de quinze jours.</p>
      <h2>Article 8 : Litiges</h2><p>Les parties recherchent une solution amiable. A defaut, les tribunaux competents de Goma tranchent.</p>
      <section class="sign"><div><strong>Pour l Operateur</strong><p>KITSA LUSENGE LWASIVA Sage</p><p>Signature et cachet</p></div><div><strong>Pour le Client</strong><p>${text(clientName)}</p><p>Lu et approuve</p></div></section>
      <footer class="footer">LWASIVA_NET - Contrat d abonnement</footer>
    </main></body></html>`;
}

function invoiceHtml(item, client = {}) {
  return `
    <html><head>${documentStyles()}</head><body><main class="doc">
      <header class="head"><div><div class="brand">LWASIVA_NET</div><div class="sub">Facturation Internet - Goma, RDC<br/>+243 980 208 012</div></div><div><h1>Facture</h1><div class="sub">Num : ${text(item.invoice_number)}</div></div></header>
      <section class="box">
        <div class="row"><strong>Client</strong><span>${text(item.client_name || client.full_name || '')}</span></div>
        <div class="row"><strong>Contrat</strong><span>${text(item.contract_number || item.contract_id || '')}</span></div>
        <div class="row"><strong>Periode</strong><span>${text(item.period_start || '')} - ${text(item.period_end || '')}</span></div>
        <div class="row"><strong>Echeance</strong><span>${text(item.due_date || '')}</span></div>
        <div class="row"><strong>Statut</strong><span>${text(item.status || '')}</span></div>
      </section>
      <table><thead><tr><th>Description</th><th>Montant</th></tr></thead><tbody>
        <tr><td>Abonnement Internet</td><td>${money(item.subscription_amount_usd || item.total_amount_usd)}</td></tr>
        <tr><td>Tranche materiel</td><td>${money(item.equipment_installment_amount_usd)}</td></tr>
        <tr><td>Remise</td><td>${money(item.discount_amount_usd)}</td></tr>
        <tr><th>Total</th><th>${money(item.total_amount_usd)}</th></tr>
      </tbody></table>
      <p>Merci de regler cette facture selon les moyens communiques par LWASIVA_NET.</p>
      <footer class="footer">LWASIVA_NET - Facture</footer>
    </main></body></html>`;
}

const initialData = {
  plans: [],
  feedback: [],
  summary: null,
  clients: [],
  contracts: [],
  quotes: [],
  invoices: [],
  unpaidInvoices: [],
  payments: [],
  tickets: [],
  users: [],
  balances: [],
  equipmentStatus: [],
  kits: [],
  notificationLogs: [],
  appMessages: [],
  adminAppMessages: [],
  contactMessages: [],
  allFeedback: [],
  clientSpace: { client: null, contracts: [], invoices: [], payments: [] }
};

export default function App() {
  const [screen, setScreen] = useState('home');
  const [theme, setTheme] = useState('light');
  const [token, setTokenState] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(initialData);
  const colors = palettes[theme];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isClient = user?.role === 'client';

  function toggleTheme() {
    setTheme((value) => (value === 'light' ? 'dark' : 'light'));
  }

  function notify(title, message, type = 'success') {
    setNotice({ title, message, type });
    setTimeout(() => setNotice(null), 3600);
  }

  async function bootstrap() {
    const saved = await getToken();
    if (!saved) return;
    const parsed = parseUser(saved);
    setTokenState(saved);
    setUser(parsed);
    setScreen(parsed?.role === 'client' ? 'clientDashboard' : 'adminDashboard');
  }

  async function load() {
    setLoading(true);
    try {
      const [plans, feedback] = await Promise.all([
        api.plans().catch(() => []),
        api.publicFeedback().catch(() => [])
      ]);

      if (!token) {
        setData((old) => ({ ...old, plans, feedback }));
        return;
      }

      if (isClient) {
        const [clientSpace, appMessages] = await Promise.all([
          api.clientSpace().catch(() => ({ client: null, contracts: [], invoices: [], payments: [] })),
          api.appMessages().catch(() => [])
        ]);
        setData((old) => ({ ...old, plans, feedback, clientSpace, appMessages }));
        return;
      }

      const [
        summary, clients, contracts, quotes, invoices, unpaidInvoices, payments, tickets, users,
        balances, equipmentStatus, kits, notificationLogs, appMessages, adminAppMessages, contactMessages, allFeedback
      ] = await Promise.all([
        api.summary().catch(() => null),
        api.clients().catch(() => []),
        api.contracts().catch(() => []),
        api.quotes().catch(() => []),
        api.invoices().catch(() => []),
        api.unpaidInvoices().catch(() => []),
        api.payments().catch(() => []),
        api.tickets().catch(() => []),
        api.users().catch(() => []),
        api.balances().catch(() => []),
        api.equipmentStatus().catch(() => []),
        api.kits().catch(() => []),
        api.notificationLogs().catch(() => []),
        api.appMessages().catch(() => []),
        api.adminAppMessages().catch(() => []),
        api.contactMessages().catch(() => []),
        api.allFeedback().catch(() => [])
      ]);

      setData((old) => ({
        ...old, plans, feedback, summary, clients, contracts, quotes, invoices, unpaidInvoices, payments, tickets,
        users, balances, equipmentStatus, kits, notificationLogs, appMessages, adminAppMessages, contactMessages, allFeedback
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    load();
  }, [token]);

  async function onLogin(email, password) {
    try {
      const result = await api.login({ email, password });
      await setToken(result.token);
      const parsed = parseUser(result.token);
      setTokenState(result.token);
      setUser(parsed);
      setScreen(parsed?.role === 'client' ? 'clientDashboard' : 'adminDashboard');
      await registerPushNotifications(notify);
      notify('Connexion reussie', 'Bienvenue dans votre espace');
    } catch (error) {
      notify('Connexion impossible', error.message, 'error');
    }
  }

  async function logout() {
    await setToken('');
    setTokenState('');
    setUser(null);
    setScreen('home');
  }

  const common = { colors, styles, screen, setScreen, theme, toggleTheme, loading, load, notify, busy, setBusy };

  let content;
  if (screen === 'login') {
    content = <LoginScreen {...common} onLogin={onLogin} />;
  } else if (screen.startsWith('admin')) {
    content = <AdminScreen {...common} data={data} logout={logout} />;
  } else if (screen.startsWith('client')) {
    content = <ClientScreen {...common} data={{ ...data.clientSpace, appMessages: data.appMessages }} logout={logout} />;
  } else {
    content = <HomeScreen {...common} data={data} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      {content}
      {notice && <Notice styles={styles} colors={colors} notice={notice} onClose={() => setNotice(null)} />}
    </SafeAreaProvider>
  );
}

function HomeScreen({ data, screen, setScreen, styles, colors, theme, toggleTheme, load, notify, busy, setBusy }) {
  const [quote, setQuote] = useState({ fullName: '', phone: '', address: '', planId: '', intendedUsage: '' });
  const [contact, setContact] = useState({ fullName: '', phone: '', subject: '', message: '' });
  const [feedbackForm, setFeedbackForm] = useState({ fullName: '', neighborhood: '', rating: '5', comment: '' });

  async function submitQuote() {
    setBusy(true);
    try {
      await api.createQuote(quote);
      setQuote({ fullName: '', phone: '', address: '', planId: '', intendedUsage: '' });
      notify('Devis envoye', 'Votre demande a ete envoyee a l administration');
    } catch (error) {
      notify('Devis non envoye', error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitContact() {
    setBusy(true);
    try {
      await api.sendContact(contact);
      setContact({ fullName: '', phone: '', subject: '', message: '' });
      notify('Message envoye', 'Votre message a ete transmis a LWASIVA_NET');
    } catch (error) {
      notify('Message non envoye', error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback() {
    setBusy(true);
    try {
      await api.sendFeedback(feedbackForm);
      setFeedbackForm({ fullName: '', neighborhood: '', rating: '5', comment: '' });
      notify('Merci', 'Votre appreciation sera visible apres validation');
    } catch (error) {
      notify('Avis non envoye', error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brand} />}>
        {screen === 'home' && (
          <>
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80' }}
              style={styles.hero}
              imageStyle={styles.heroImage}
            >
              <View style={styles.heroOverlay}>
                <View style={styles.topRow}>
                  <Brand colors={colors} styles={styles} />
                  <HeaderActions styles={styles} colors={colors} theme={theme} toggleTheme={toggleTheme} onLogin={() => setScreen('login')} />
                </View>
                <Text style={styles.kicker}>Goma, Nord-Kivu</Text>
                <Text style={styles.heroTitle}>Internet haut debit sans fil</Text>
                <Text style={styles.heroText}>Installation CPE, routeur Wi-Fi, suivi client, devis et support technique pour maisons et entreprises.</Text>
              </View>
            </ImageBackground>
            <View style={styles.container}>
              <View style={styles.statsRow}>
                <MiniStat styles={styles} colors={colors} label="Service" value="24/7" icon="time-outline" />
                <MiniStat styles={styles} colors={colors} label="Debit" value="5-30 Mbps" icon="wifi-outline" />
                <MiniStat styles={styles} colors={colors} label="Kit" value="100 USD" icon="cube-outline" />
              </View>
              <SectionTitle styles={styles} colors={colors} icon="speedometer-outline" title="Bouquets" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal}>
                {data.plans.map((plan) => (
                  <View style={styles.planCard} key={plan.id}>
                    <Ionicons name="router-outline" size={24} color={colors.brand} />
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planSpeed}>{plan.bandwidth_mbps} Mbps</Text>
                    <Text style={styles.muted}>{plan.recommended_usage}</Text>
                    <Text style={styles.price}>{money(plan.monthly_price_usd)} / mois</Text>
                  </View>
                ))}
              </ScrollView>
              <InfoGrid styles={styles} colors={colors} />
            </View>
          </>
        )}

        {screen === 'quote' && (
          <View style={styles.container}>
            <ScreenTop styles={styles} colors={colors} title="Demande de devis" subtitle="La demande arrive dans l espace admin pour validation et impression." />
            <Card styles={styles}>
              <Field styles={styles} colors={colors} label="Nom complet" value={quote.fullName} onChangeText={(fullName) => setQuote({ ...quote, fullName })} />
              <Field styles={styles} colors={colors} label="Telephone" value={quote.phone} onChangeText={(phone) => setQuote({ ...quote, phone })} keyboardType="phone-pad" />
              <Field styles={styles} colors={colors} label="Adresse" value={quote.address} onChangeText={(address) => setQuote({ ...quote, address })} />
              <SelectChips styles={styles} colors={colors} label="Bouquet souhaite" value={quote.planId} options={data.plans.map((plan) => ({ value: String(plan.id), label: `${plan.name} - ${money(plan.monthly_price_usd)}` }))} onChange={(planId) => setQuote({ ...quote, planId })} />
              <Field styles={styles} colors={colors} label="Usage prevu" value={quote.intendedUsage} onChangeText={(intendedUsage) => setQuote({ ...quote, intendedUsage })} />
              <LoadingButton styles={styles} label="Envoyer le devis" icon="send-outline" loading={busy} onPress={submitQuote} />
            </Card>
          </View>
        )}

        {screen === 'feedback' && (
          <View style={styles.container}>
            <ScreenTop styles={styles} colors={colors} title="Appreciations" subtitle="Quelques retours clients visibles sur l accueil." />
            {data.feedback.length === 0 ? <Empty styles={styles} text="Aucune appreciation pour le moment" /> : data.feedback.map((item) => (
              <Card styles={styles} key={item.id}>
                <Text style={styles.stars}>{'*'.repeat(Number(item.rating || 5))}</Text>
                <Text style={styles.cardText}>{item.comment}</Text>
                <Text style={styles.cardStrong}>{item.full_name} - {item.neighborhood || 'Goma'}</Text>
              </Card>
            ))}
            <Card styles={styles}>
              <SectionTitle styles={styles} colors={colors} icon="create-outline" title="Laisser une appreciation" />
              <Field styles={styles} colors={colors} label="Nom complet" value={feedbackForm.fullName} onChangeText={(fullName) => setFeedbackForm({ ...feedbackForm, fullName })} />
              <Field styles={styles} colors={colors} label="Quartier" value={feedbackForm.neighborhood} onChangeText={(neighborhood) => setFeedbackForm({ ...feedbackForm, neighborhood })} />
              <SelectChips styles={styles} colors={colors} label="Note" value={feedbackForm.rating} options={['1', '2', '3', '4', '5'].map((value) => ({ value, label: `${value}/5` }))} onChange={(rating) => setFeedbackForm({ ...feedbackForm, rating })} />
              <Field styles={styles} colors={colors} label="Commentaire" value={feedbackForm.comment} onChangeText={(comment) => setFeedbackForm({ ...feedbackForm, comment })} multiline />
              <LoadingButton styles={styles} label="Envoyer l appreciation" icon="send-outline" loading={busy} onPress={submitFeedback} />
            </Card>
          </View>
        )}

        {screen === 'contact' && (
          <View style={styles.container}>
            <ScreenTop styles={styles} colors={colors} title="Contact" subtitle="Ecris a LWASIVA_NET pour une intervention, une question ou une installation." />
            <Card styles={styles}>
              <Field styles={styles} colors={colors} label="Nom complet" value={contact.fullName} onChangeText={(fullName) => setContact({ ...contact, fullName })} />
              <Field styles={styles} colors={colors} label="Telephone" value={contact.phone} onChangeText={(phone) => setContact({ ...contact, phone })} keyboardType="phone-pad" />
              <Field styles={styles} colors={colors} label="Sujet" value={contact.subject} onChangeText={(subject) => setContact({ ...contact, subject })} />
              <Field styles={styles} colors={colors} label="Message" value={contact.message} onChangeText={(message) => setContact({ ...contact, message })} multiline />
              <LoadingButton styles={styles} label="Envoyer le message" icon="mail-outline" loading={busy} onPress={submitContact} />
            </Card>
          </View>
        )}
      </ScrollView>
      <BottomNav
        styles={styles}
        colors={colors}
        active={screen}
        items={[
          ['home', 'Accueil', 'home-outline'],
          ['quote', 'Devis', 'clipboard-outline'],
          ['feedback', 'Avis', 'chatbubble-ellipses-outline'],
          ['contact', 'Contact', 'call-outline']
        ]}
        onPress={setScreen}
      />
    </SafeAreaView>
  );
}

function LoginScreen({ styles, colors, theme, toggleTheme, setScreen, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.loginContent}>
        <View style={styles.loginTop}>
          <Pressable style={styles.backButton} onPress={() => setScreen('home')}>
            <Ionicons name="arrow-back" size={18} color={colors.brand} />
            <Text style={styles.backText}>Accueil</Text>
          </Pressable>
          <IconButton styles={styles} colors={colors} icon={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} onPress={toggleTheme} />
        </View>
        <View style={styles.loginBox}>
          <Brand colors={colors} styles={styles} dark />
          <Text style={styles.loginTitle}>Connexion</Text>
          <Text style={styles.muted}>Espace admin et client</Text>
          <Field styles={styles} colors={colors} label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <Field styles={styles} colors={colors} label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
          <Pressable style={styles.primaryButton} onPress={() => onLogin(email, password)}>
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Se connecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AdminScreen({ data, screen, setScreen, styles, colors, theme, toggleTheme, loading, load, logout, notify, setBusy }) {
  const summary = data.summary || {};
  const active = screen || 'adminDashboard';
  async function submit(action, message) {
    setBusy(true);
    try {
      await action();
      notify('Operation reussie', message);
      await load();
    } catch (error) {
      notify('Operation impossible', error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader styles={styles} colors={colors} title="Administration" logout={logout} theme={theme} toggleTheme={toggleTheme} />
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />} contentContainerStyle={styles.container}>
        {active === 'adminDashboard' && (
          <>
            <View style={styles.statsRow}>
              <MiniStat styles={styles} colors={colors} label="Clients" value={summary.total_clients || 0} icon="people-outline" />
              <MiniStat styles={styles} colors={colors} label="Contrats" value={summary.active_contracts || 0} icon="document-text-outline" />
              <MiniStat styles={styles} colors={colors} label="Tickets" value={summary.open_tickets || 0} icon="construct-outline" />
            </View>
            <QuotesAdmin styles={styles} colors={colors} data={data} submit={submit} />
          </>
        )}
        {active === 'adminClients' && <ClientsAdmin styles={styles} colors={colors} data={data} submit={submit} />}
        {active === 'adminContracts' && <ContractsAdmin styles={styles} colors={colors} data={data} submit={submit} />}
        {active === 'adminMoney' && (
          <>
            <InvoicesAdmin styles={styles} colors={colors} data={data} submit={submit} />
            <PaymentsAdmin styles={styles} colors={colors} data={data} submit={submit} />
          </>
        )}
        {active === 'adminMore' && <MoreAdmin styles={styles} colors={colors} data={data} submit={submit} />}
      </ScrollView>
      <BottomNav
        styles={styles}
        colors={colors}
        active={active}
        items={[
          ['adminDashboard', 'Tableau', 'grid-outline'],
          ['adminClients', 'Clients', 'people-outline'],
          ['adminContracts', 'Contrats', 'document-text-outline'],
          ['adminMoney', 'Argent', 'cash-outline'],
          ['adminMore', 'Plus', 'menu-outline']
        ]}
        onPress={setScreen}
      />
    </SafeAreaView>
  );
}

function QuotesAdmin({ styles, colors, data, submit }) {
  return (
    <Card styles={styles}>
      <SectionTitle styles={styles} colors={colors} icon="clipboard-outline" title="Devis recus" />
      {data.quotes.length === 0 ? <Empty styles={styles} text="Aucun devis recu" /> : data.quotes.map((item) => (
        <Record key={item.id} styles={styles} title={`${item.quote_number} - ${item.full_name}`} text={`${item.phone} - ${item.address} - ${item.plan_name || 'Bouquet non precise'} - ${item.status}`}>
          <Action styles={styles} colors={colors} label="Imprimer" icon="print-outline" onPress={() => printDocument(item.quote_number, quoteHtml(item))} />
          <Action styles={styles} colors={colors} label="Valider" icon="checkmark-outline" onPress={() => submit(() => api.updateQuoteStatus(item.id, { status: 'valide', adminNotes: item.admin_notes || '' }), 'Devis valide')} />
          <Action styles={styles} colors={colors} label="Rejeter" icon="close-outline" onPress={() => submit(() => api.updateQuoteStatus(item.id, { status: 'rejete', adminNotes: item.admin_notes || '' }), 'Devis rejete')} />
          <Action styles={styles} colors={colors} label="Creer client" icon="person-add-outline" onPress={() => submit(() => api.convertQuoteToClient(item.id), 'Client cree depuis le devis')} />
          <Action styles={styles} colors={colors} danger label="Supprimer" icon="trash-outline" onPress={() => confirmDelete(() => submit(() => api.deleteQuote(item.id), 'Devis supprime'))} />
        </Record>
      ))}
    </Card>
  );
}

function ClientsAdmin({ styles, colors, data, submit }) {
  const empty = { id: '', fullName: '', phone: '', email: '', address: '', clientType: 'particulier' };
  const [form, setForm] = useState(empty);
  const editing = Boolean(form.id);

  function edit(item) {
    setForm({ id: item.id, fullName: item.full_name, phone: item.phone, email: item.email || '', address: item.address, clientType: item.client_type || 'particulier' });
  }

  return (
    <>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="person-add-outline" title={editing ? 'Modifier client' : 'Nouveau client'} />
        <Field styles={styles} colors={colors} label="Nom complet" value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} />
        <Field styles={styles} colors={colors} label="Telephone" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} keyboardType="phone-pad" />
        <Field styles={styles} colors={colors} label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} autoCapitalize="none" />
        <SelectChips styles={styles} colors={colors} label="Type" value={form.clientType} options={['particulier', 'entreprise']} onChange={(clientType) => setForm({ ...form, clientType })} />
        <Field styles={styles} colors={colors} label="Adresse" value={form.address} onChangeText={(address) => setForm({ ...form, address })} />
        <SaveRow styles={styles} colors={colors} editing={editing} onCancel={() => setForm(empty)} onSave={() => submit(() => editing ? api.updateClient(form.id, form) : api.createClient(form), editing ? 'Client modifie' : 'Client cree').then(() => setForm(empty))} />
      </Card>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="people-outline" title="Clients" />
        {data.clients.map((item) => (
          <Record key={item.id} styles={styles} title={`${item.client_code} - ${item.full_name}`} text={`${item.phone} - ${item.address}`}>
            <Action styles={styles} colors={colors} label="Modifier" icon="create-outline" onPress={() => edit(item)} />
            <Action styles={styles} colors={colors} danger label="Supprimer" icon="trash-outline" onPress={() => confirmDelete(() => submit(() => api.deleteClient(item.id), 'Client supprime'))} />
          </Record>
        ))}
      </Card>
    </>
  );
}

function ContractsAdmin({ styles, colors, data, submit }) {
  const empty = { id: '', clientId: '', planId: '', installationAddress: '', status: 'essai', billingDueDay: '5' };
  const [form, setForm] = useState(empty);
  const editing = Boolean(form.id);

  function edit(item) {
    setForm({
      id: item.contract_id,
      clientId: String(item.client_id || ''),
      planId: String(item.plan_id || ''),
      installationAddress: item.installation_address || '',
      status: item.status || 'essai',
      billingDueDay: String(item.billing_due_day || 5)
    });
  }

  return (
    <>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="document-text-outline" title={editing ? 'Modifier contrat' : 'Nouveau contrat'} />
        <SelectChips styles={styles} colors={colors} label="Client" value={form.clientId} options={data.clients.map((x) => ({ value: String(x.id), label: x.full_name }))} onChange={(clientId) => setForm({ ...form, clientId })} />
        <SelectChips styles={styles} colors={colors} label="Bouquet" value={form.planId} options={data.plans.map((x) => ({ value: String(x.id), label: `${x.name} - ${money(x.monthly_price_usd)}` }))} onChange={(planId) => setForm({ ...form, planId })} />
        <SelectChips styles={styles} colors={colors} label="Statut" value={form.status} options={['brouillon', 'essai', 'actif', 'suspendu']} onChange={(status) => setForm({ ...form, status })} />
        <Field styles={styles} colors={colors} label="Jour du mois pour payer" value={form.billingDueDay} onChangeText={(billingDueDay) => setForm({ ...form, billingDueDay })} keyboardType="numeric" />
        <Field styles={styles} colors={colors} label="Adresse installation" value={form.installationAddress} onChangeText={(installationAddress) => setForm({ ...form, installationAddress })} />
        <SaveRow styles={styles} colors={colors} editing={editing} onCancel={() => setForm(empty)} onSave={() => submit(() => editing ? api.updateContract(form.id, form) : api.createContract(form), editing ? 'Contrat modifie' : 'Contrat cree').then(() => setForm(empty))} />
      </Card>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="document-text-outline" title="Contrats" />
        {data.contracts.map((item) => (
          <Record key={item.contract_id} styles={styles} title={`${item.contract_number} - ${item.client_name}`} text={`${item.plan_name} - ${item.status} - ${item.bandwidth_mbps} Mbps`}>
            <Action styles={styles} colors={colors} label="Imprimer" icon="print-outline" onPress={() => printDocument(item.contract_number, contractHtml(item))} />
            <Action styles={styles} colors={colors} label="Modifier" icon="create-outline" onPress={() => edit(item)} />
            <Action styles={styles} colors={colors} label="Activer" icon="checkmark-circle-outline" onPress={() => submit(() => api.updateContract(item.contract_id, { status: 'actif' }), 'Contrat active')} />
            <Action styles={styles} colors={colors} label="Suspendre" icon="pause-circle-outline" onPress={() => submit(() => api.updateContract(item.contract_id, { status: 'suspendu' }), 'Contrat suspendu')} />
            <Action styles={styles} colors={colors} danger label="Supprimer" icon="trash-outline" onPress={() => confirmDelete(() => submit(() => api.deleteContract(item.contract_id), 'Contrat supprime'))} />
          </Record>
        ))}
      </Card>
      <List styles={styles} colors={colors} title="Soldes contrats" icon="wallet-outline" items={data.balances.map((x) => `${x.contract_number} - ${x.client_name} - Solde ${money(x.balance_usd)}`)} />
    </>
  );
}

function InvoicesAdmin({ styles, colors, data, submit }) {
  const [form, setForm] = useState({ contractId: '', periodStart: '', periodEnd: '', dueDate: '', equipmentInstallmentAmountUsd: '0', discountAmountUsd: '0' });
  return (
    <>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="receipt-outline" title="Facture mensuelle" />
        <SelectChips styles={styles} colors={colors} label="Contrat" value={form.contractId} options={data.contracts.map((x) => ({ value: String(x.contract_id), label: `${x.contract_number} - ${x.client_name}` }))} onChange={(contractId) => setForm({ ...form, contractId })} />
        <Field styles={styles} colors={colors} label="Debut AAAA-MM-JJ" value={form.periodStart} onChangeText={(periodStart) => setForm({ ...form, periodStart })} />
        <Field styles={styles} colors={colors} label="Fin AAAA-MM-JJ" value={form.periodEnd} onChangeText={(periodEnd) => setForm({ ...form, periodEnd })} />
        <Field styles={styles} colors={colors} label="Date limite de paiement AAAA-MM-JJ" value={form.dueDate} onChangeText={(dueDate) => setForm({ ...form, dueDate })} />
        <Field styles={styles} colors={colors} label="Tranche materiel" value={form.equipmentInstallmentAmountUsd} onChangeText={(equipmentInstallmentAmountUsd) => setForm({ ...form, equipmentInstallmentAmountUsd })} keyboardType="numeric" />
        <Action styles={styles} colors={colors} primary label="Creer facture" icon="save-outline" onPress={() => submit(() => api.createInvoice(form), 'Facture creee')} />
      </Card>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="receipt-outline" title="Factures" />
        {data.invoices.length === 0 ? <Empty styles={styles} text="Aucune facture" /> : data.invoices.map((item) => (
          <Record key={item.id} styles={styles} title={`${item.invoice_number} - ${item.client_name || ''}`} text={`${money(item.total_amount_usd)} - ${item.status} - ${item.due_date || ''}`}>
            <Action styles={styles} colors={colors} label="Imprimer" icon="print-outline" onPress={() => printDocument(item.invoice_number, invoiceHtml(item))} />
          </Record>
        ))}
      </Card>
    </>
  );
}

function PaymentsAdmin({ styles, colors, data, submit }) {
  const [form, setForm] = useState({ invoiceId: '', amountUsd: '', method: 'especes', transactionNumber: '' });
  return (
    <>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="cash-outline" title="Nouveau paiement" />
        <SelectChips styles={styles} colors={colors} label="Facture" value={form.invoiceId} options={data.invoices.map((x) => ({ value: String(x.id), label: `${x.invoice_number} - ${money(x.total_amount_usd)}` }))} onChange={(invoiceId) => setForm({ ...form, invoiceId })} />
        <Field styles={styles} colors={colors} label="Montant USD" value={form.amountUsd} onChangeText={(amountUsd) => setForm({ ...form, amountUsd })} keyboardType="numeric" />
        <SelectChips styles={styles} colors={colors} label="Methode" value={form.method} options={['especes', 'airtel_money', 'mpesa', 'orange_money', 'banque', 'autre']} onChange={(method) => setForm({ ...form, method })} />
        <Field styles={styles} colors={colors} label="Transaction" value={form.transactionNumber} onChangeText={(transactionNumber) => setForm({ ...form, transactionNumber })} />
        <Action styles={styles} colors={colors} primary label="Enregistrer paiement" icon="save-outline" onPress={() => submit(() => api.registerPayment(form), 'Paiement enregistre')} />
      </Card>
      <List styles={styles} colors={colors} title="Paiements" icon="cash-outline" items={data.payments.map((x) => `${x.payment_reference} - ${x.client_name || ''} - ${money(x.amount_usd)} - ${x.method}`)} />
    </>
  );
}

function MoreAdmin({ styles, colors, data, submit }) {
  return (
    <>
      <BroadcastAdmin styles={styles} colors={colors} data={data} submit={submit} />
      <UsersAdmin styles={styles} colors={colors} data={data} submit={submit} />
      <SupportAdmin styles={styles} colors={colors} data={data} submit={submit} />
      <EquipmentAdmin styles={styles} colors={colors} data={data} submit={submit} />
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="logo-whatsapp" title="Rappels WhatsApp J-5" />
        <Action styles={styles} colors={colors} primary label="Envoyer maintenant" icon="send-outline" onPress={() => submit(() => api.sendWhatsAppReminders(), 'Rappels WhatsApp traites')} />
      </Card>
      <List styles={styles} colors={colors} title="Messages contact" icon="mail-outline" items={data.contactMessages.map((x) => `${x.full_name} - ${x.phone} - ${x.subject}`)} />
      <List styles={styles} colors={colors} title="Historique WhatsApp" icon="logo-whatsapp" items={data.notificationLogs.map((x) => `${x.client_name} - ${x.phone} - ${x.status}`)} />
    </>
  );
}

function BroadcastAdmin({ styles, colors, data, submit }) {
  const [form, setForm] = useState({ title: '', body: '', targetRole: 'all' });
  return (
    <>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="megaphone-outline" title="Message aux utilisateurs" />
        <Field styles={styles} colors={colors} label="Titre" value={form.title} onChangeText={(title) => setForm({ ...form, title })} />
        <Field styles={styles} colors={colors} label="Message" value={form.body} onChangeText={(body) => setForm({ ...form, body })} multiline />
        <SelectChips styles={styles} colors={colors} label="Recepteurs" value={form.targetRole} options={[
          { value: 'all', label: 'Tout le monde' },
          { value: 'client', label: 'Clients' },
          { value: 'manager', label: 'Managers' },
          { value: 'technician', label: 'Techniciens' },
          { value: 'cashier', label: 'Caisse' },
          { value: 'admin', label: 'Admins' }
        ]} onChange={(targetRole) => setForm({ ...form, targetRole })} />
        <Action styles={styles} colors={colors} primary label="Envoyer a l app" icon="send-outline" onPress={() => submit(() => api.sendAppMessage(form), 'Message envoye dans les espaces utilisateurs')} />
      </Card>
      <List styles={styles} colors={colors} title="Messages envoyes" icon="mail-open-outline" items={data.adminAppMessages.map((x) => `${x.title} - ${x.recipients_count || 0} utilisateur(s)`)} />
    </>
  );
}

function UsersAdmin({ styles, colors, data, submit }) {
  const empty = { id: '', fullName: '', email: '', phone: '', password: '', role: 'manager', clientId: '' };
  const [form, setForm] = useState(empty);
  const editing = Boolean(form.id);
  function edit(item) {
    setForm({ id: item.id, fullName: item.full_name, email: item.email, phone: item.phone || '', password: '', role: item.role, clientId: String(item.client_id || '') });
  }
  return (
    <>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="person-add-outline" title={editing ? 'Modifier utilisateur' : 'Creer utilisateur'} />
        <Field styles={styles} colors={colors} label="Nom complet" value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} />
        <Field styles={styles} colors={colors} label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} autoCapitalize="none" />
        <Field styles={styles} colors={colors} label="Telephone" value={form.phone} onChangeText={(phone) => setForm({ ...form, phone })} />
        {!editing && <Field styles={styles} colors={colors} label="Mot de passe" value={form.password} onChangeText={(password) => setForm({ ...form, password })} secureTextEntry />}
        <SelectChips styles={styles} colors={colors} label="Role" value={form.role} options={['admin', 'manager', 'technician', 'cashier', 'client']} onChange={(role) => setForm({ ...form, role })} />
        <SelectChips styles={styles} colors={colors} label="Client lie" value={form.clientId} options={data.clients.map((x) => ({ value: String(x.id), label: x.full_name }))} onChange={(clientId) => setForm({ ...form, clientId })} />
        <SaveRow styles={styles} colors={colors} editing={editing} onCancel={() => setForm(empty)} onSave={() => submit(() => editing ? api.updateUser(form.id, form) : api.createUser(form), editing ? 'Utilisateur modifie' : 'Utilisateur cree').then(() => setForm(empty))} />
      </Card>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="people-outline" title="Utilisateurs" />
        {data.users.map((item) => (
          <Record key={item.id} styles={styles} title={`${item.full_name} - ${item.role}`} text={`${item.email} - ${item.client_name || 'Aucun client'} - ${item.is_active ? 'Actif' : 'Bloque'}`}>
            <Action styles={styles} colors={colors} label="Modifier" icon="create-outline" onPress={() => edit(item)} />
            <Action styles={styles} colors={colors} label={item.is_active ? 'Bloquer' : 'Activer'} icon="power-outline" onPress={() => submit(() => api.updateUser(item.id, { isActive: !item.is_active }), item.is_active ? 'Utilisateur bloque' : 'Utilisateur active')} />
            <Action styles={styles} colors={colors} danger label="Supprimer" icon="trash-outline" onPress={() => confirmDelete(() => submit(() => api.deleteUser(item.id), 'Utilisateur supprime'))} />
          </Record>
        ))}
      </Card>
    </>
  );
}

function SupportAdmin({ styles, colors, data, submit }) {
  const [form, setForm] = useState({ clientId: '', contractId: '', title: '', description: '', priority: 'normale' });
  return (
    <>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="construct-outline" title="Ticket support" />
        <SelectChips styles={styles} colors={colors} label="Client" value={form.clientId} options={data.clients.map((x) => ({ value: String(x.id), label: x.full_name }))} onChange={(clientId) => setForm({ ...form, clientId })} />
        <SelectChips styles={styles} colors={colors} label="Contrat" value={form.contractId} options={data.contracts.map((x) => ({ value: String(x.contract_id), label: x.contract_number }))} onChange={(contractId) => setForm({ ...form, contractId })} />
        <Field styles={styles} colors={colors} label="Titre" value={form.title} onChangeText={(title) => setForm({ ...form, title })} />
        <SelectChips styles={styles} colors={colors} label="Priorite" value={form.priority} options={['basse', 'normale', 'haute', 'urgente']} onChange={(priority) => setForm({ ...form, priority })} />
        <Field styles={styles} colors={colors} label="Description" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline />
        <Action styles={styles} colors={colors} primary label="Ouvrir ticket" icon="save-outline" onPress={() => submit(() => api.openTicket(form), 'Ticket ouvert')} />
      </Card>
      <List styles={styles} colors={colors} title="Tickets" icon="construct-outline" items={data.tickets.map((x) => `${x.client_name} - ${x.title} - ${x.priority} - ${x.status}`)} />
    </>
  );
}

function EquipmentAdmin({ styles, colors, data, submit }) {
  const [form, setForm] = useState({ contractId: '', installmentNumber: '1', amountUsd: '20', dueDate: '' });
  return (
    <>
      <Card styles={styles}>
        <SectionTitle styles={styles} colors={colors} icon="cube-outline" title="Tranche materiel" />
        <SelectChips styles={styles} colors={colors} label="Contrat" value={form.contractId} options={data.contracts.map((x) => ({ value: String(x.contract_id), label: `${x.contract_number} - ${x.client_name}` }))} onChange={(contractId) => setForm({ ...form, contractId })} />
        <Field styles={styles} colors={colors} label="Numero tranche" value={form.installmentNumber} onChangeText={(installmentNumber) => setForm({ ...form, installmentNumber })} keyboardType="numeric" />
        <Field styles={styles} colors={colors} label="Montant USD" value={form.amountUsd} onChangeText={(amountUsd) => setForm({ ...form, amountUsd })} keyboardType="numeric" />
        <Field styles={styles} colors={colors} label="Date limite de paiement AAAA-MM-JJ" value={form.dueDate} onChangeText={(dueDate) => setForm({ ...form, dueDate })} />
        <Action styles={styles} colors={colors} primary label="Creer tranche" icon="save-outline" onPress={() => submit(() => api.createInstallment(form), 'Tranche materiel creee')} />
      </Card>
      <List styles={styles} colors={colors} title="Etat materiel" icon="cube-outline" items={data.equipmentStatus.map((x) => `${x.contract_number} - ${x.client_name} - Reste ${money(x.equipment_remaining_usd)}`)} />
    </>
  );
}

function ClientScreen({ data, screen, setScreen, styles, colors, theme, toggleTheme, loading, load, logout }) {
  const active = screen || 'clientDashboard';
  const unpaid = data.invoices.filter((item) => item.status !== 'payee' && item.status !== 'annulee');
  const total = unpaid.reduce((sum, item) => sum + Number(item.total_amount_usd || 0), 0);
  const activeContract = data.contracts[0];

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader styles={styles} colors={colors} title="Mon espace" logout={logout} theme={theme} toggleTheme={toggleTheme} />
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />} contentContainerStyle={styles.container}>
        {active === 'clientDashboard' && (
          <>
            <List styles={styles} colors={colors} title="Messages de LWASIVA_NET" icon="notifications-outline" items={(data.appMessages || []).slice(0, 6).map((x) => `${x.title} - ${x.body}`)} />
            <Card styles={styles}>
              <Text style={styles.cardStrong}>{data.client?.full_name || 'Client'}</Text>
              <Text style={styles.muted}>{data.client?.phone || ''}</Text>
            </Card>
            <View style={styles.statsRow}>
              <MiniStat styles={styles} colors={colors} label="Bouquet" value={activeContract?.plan_name || '-'} icon="wifi-outline" />
              <MiniStat styles={styles} colors={colors} label="Factures" value={unpaid.length} icon="receipt-outline" />
              <MiniStat styles={styles} colors={colors} label="Reste" value={money(total)} icon="cash-outline" />
            </View>
          </>
        )}
        {active === 'clientContracts' && (
          <Card styles={styles}>
            <SectionTitle styles={styles} colors={colors} icon="document-text-outline" title="Mes contrats" />
            {data.contracts.length === 0 ? <Empty styles={styles} text="Aucun contrat" /> : data.contracts.map((item) => (
              <Record key={item.id} styles={styles} title={`${item.contract_number} - ${item.plan_name}`} text={`${item.status} - ${item.bandwidth_mbps} Mbps - ${item.installation_address || ''}`}>
                <Action styles={styles} colors={colors} label="Voir / imprimer" icon="print-outline" onPress={() => printDocument(item.contract_number, contractHtml(item, data.client))} />
              </Record>
            ))}
          </Card>
        )}
        {active === 'clientInvoices' && (
          <Card styles={styles}>
            <SectionTitle styles={styles} colors={colors} icon="receipt-outline" title="Mes factures" />
            {data.invoices.length === 0 ? <Empty styles={styles} text="Aucune facture" /> : data.invoices.map((item) => (
              <Record key={item.id} styles={styles} title={item.invoice_number} text={`${money(item.total_amount_usd)} - ${item.status} - ${item.due_date || ''}`}>
                <Action styles={styles} colors={colors} label="Voir / imprimer" icon="print-outline" onPress={() => printDocument(item.invoice_number, invoiceHtml(item, data.client))} />
              </Record>
            ))}
          </Card>
        )}
        {active === 'clientPayments' && <List styles={styles} colors={colors} title="Mes paiements" icon="cash-outline" items={data.payments.map((x) => `${x.payment_reference} - ${money(x.amount_usd)} - ${x.method}`)} />}
      </ScrollView>
      <BottomNav
        styles={styles}
        colors={colors}
        active={active}
        items={[
          ['clientDashboard', 'Tableau', 'grid-outline'],
          ['clientContracts', 'Contrats', 'document-text-outline'],
          ['clientInvoices', 'Factures', 'receipt-outline'],
          ['clientPayments', 'Paiements', 'cash-outline']
        ]}
        onPress={setScreen}
      />
    </SafeAreaView>
  );
}

function AppHeader({ styles, colors, title, logout, theme, toggleTheme }) {
  return (
    <View style={styles.header}>
      <Brand colors={colors} styles={styles} />
      <Text style={styles.headerTitle}>{title}</Text>
      <IconButton styles={styles} colors={colors} icon={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} onPress={toggleTheme} />
      <IconButton styles={styles} colors={colors} icon="log-out-outline" onPress={logout} />
    </View>
  );
}

function HeaderActions({ styles, colors, theme, toggleTheme, onLogin }) {
  return (
    <View style={styles.headerActions}>
      <IconButton styles={styles} colors={colors} icon={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} onPress={toggleTheme} />
      <Pressable style={styles.loginPill} onPress={onLogin}>
        <Ionicons name="log-in-outline" size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function Brand({ colors, styles, dark = false }) {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>LN</Text></View>
      <View>
        <Text style={[styles.brandText, dark && { color: colors.ink }]}>LWASIVA_NET</Text>
        <Text style={[styles.brandSub, dark && { color: colors.muted }]}>Internet haut debit</Text>
      </View>
    </View>
  );
}

function BottomNav({ styles, colors, active, items, onPress }) {
  return (
    <View style={styles.bottomNav}>
      {items.map(([key, label, icon]) => {
        const selected = active === key;
        return (
          <Pressable key={key} style={[styles.navItem, selected && styles.navItemActive]} onPress={() => onPress(key)}>
            <Ionicons name={icon} size={21} color={selected ? colors.brand : colors.muted} />
            <Text style={[styles.navText, selected && styles.navTextActive]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScreenTop({ styles, colors, title, subtitle }) {
  return (
    <View style={styles.screenTop}>
      <Brand colors={colors} styles={styles} dark />
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.muted}>{subtitle}</Text>
    </View>
  );
}

function InfoGrid({ styles, colors }) {
  const items = [
    ['flash-outline', 'Streaming fluide', 'YouTube, Netflix, IPTV et appels video selon le bouquet.'],
    ['construct-outline', 'Installation', 'Antenne CPE, routeur Wi-Fi, cablage et accessoires.'],
    ['logo-whatsapp', 'Notifications', 'Rappel avant expiration et suivi client via WhatsApp.']
  ];
  return items.map(([icon, title, text]) => (
    <Card styles={styles} key={title}>
      <Ionicons name={icon} size={22} color={colors.brand} />
      <Text style={styles.cardStrong}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
    </Card>
  ));
}

function SectionTitle({ styles, colors, icon, title }) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={20} color={colors.brand} />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function MiniStat({ styles, colors, label, value, icon }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={18} color={colors.brand} />
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function Card({ styles, children }) {
  return <View style={styles.card}>{children}</View>;
}

function Field({ styles, colors, label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={[styles.input, props.multiline && styles.inputTall]} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

function List({ styles, colors, title, icon, items }) {
  return (
    <Card styles={styles}>
      <SectionTitle styles={styles} colors={colors} icon={icon} title={title} />
      {items.length === 0 ? <Empty styles={styles} text="Aucune donnee" /> : items.slice(0, 12).map((item, index) => (
        <View style={styles.listItem} key={`${title}-${index}`}>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </Card>
  );
}

function Record({ styles, title, text, children }) {
  return (
    <View style={styles.record}>
      <Text style={styles.recordTitle}>{title}</Text>
      <Text style={styles.recordText}>{text}</Text>
      <View style={styles.actionWrap}>{children}</View>
    </View>
  );
}

function Action({ styles, colors, label, icon, onPress, danger = false, primary = false }) {
  return (
    <Pressable style={[styles.actionButton, primary && styles.actionPrimary, danger && styles.actionDanger]} onPress={onPress}>
      <Ionicons name={icon} size={15} color={primary || danger ? '#fff' : colors.ink} />
      <Text style={[styles.actionText, (primary || danger) && styles.actionTextLight]}>{label}</Text>
    </Pressable>
  );
}

function LoadingButton({ styles, label, icon, loading, onPress }) {
  return (
    <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={loading ? undefined : onPress}>
      {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name={icon} size={18} color="#fff" />}
      <Text style={styles.primaryButtonText}>{loading ? 'Chargement...' : label}</Text>
    </Pressable>
  );
}

function SaveRow({ styles, colors, editing, onSave, onCancel }) {
  return (
    <View style={styles.saveRow}>
      <Action styles={styles} colors={colors} primary label="Enregistrer" icon="save-outline" onPress={onSave} />
      {editing && <Action styles={styles} colors={colors} label="Annuler" icon="close-outline" onPress={onCancel} />}
    </View>
  );
}

function SelectChips({ styles, colors, label, value, options, onChange }) {
  const normalized = options.map((item) => (typeof item === 'string' ? { value: item, label: item } : item));
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {normalized.map((item) => {
            const selected = String(value) === String(item.value);
            return (
              <Pressable key={`${label}-${item.value}`} style={[styles.chip, selected && styles.chipActive]} onPress={() => onChange(item.value)}>
                <Text style={[styles.chipText, selected && { color: colors.brand }]} numberOfLines={1}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function confirmDelete(onConfirm) {
  Alert.alert('Confirmer', 'Voulez-vous vraiment supprimer ?', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: onConfirm }
  ]);
}

function Notice({ styles, colors, notice, onClose }) {
  const isError = notice.type === 'error';
  return (
    <View style={styles.noticeWrap} pointerEvents="box-none">
      <Pressable style={[styles.notice, isError && styles.noticeError]} onPress={onClose}>
        <View style={[styles.noticeIcon, isError && styles.noticeIconError]}>
          <Ionicons name={isError ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={22} color="#fff" />
        </View>
        <View style={styles.noticeTextBox}>
          <Text style={styles.noticeTitle}>{notice.title}</Text>
          <Text style={styles.noticeMessage}>{notice.message}</Text>
        </View>
        <Ionicons name="close-outline" size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function Empty({ styles, text }) {
  return <Text style={styles.muted}>{text}</Text>;
}

function IconButton({ styles, colors, icon, onPress }) {
  return (
    <Pressable style={styles.iconButton} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.ink} />
    </Pressable>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    hero: { minHeight: 520 },
    heroImage: { opacity: 1 },
    heroOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20, backgroundColor: 'rgba(4, 33, 27, 0.58)' },
    topRow: { position: 'absolute', top: 18, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    brandMark: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    brandMarkText: { fontWeight: '900', color: '#17130a' },
    brandText: { color: '#fff', fontWeight: '900', fontSize: 15 },
    brandSub: { color: '#dcebe7', fontSize: 11 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    loginPill: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    iconButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
    kicker: { color: colors.accent, fontWeight: '800', marginBottom: 8 },
    heroTitle: { color: '#fff', fontSize: 38, fontWeight: '900', lineHeight: 42 },
    heroText: { color: '#e8f2ef', fontSize: 16, lineHeight: 24, marginTop: 10 },
    container: { padding: 16, paddingBottom: 108, gap: 14 },
    statsRow: { flexDirection: 'row', gap: 10 },
    miniStat: { flex: 1, minHeight: 110, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line },
    miniLabel: { color: colors.muted, fontSize: 12, marginTop: 7 },
    miniValue: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 6 },
    sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 },
    sectionTitleText: { color: colors.ink, fontSize: 18, fontWeight: '900' },
    horizontal: { marginHorizontal: -16, paddingHorizontal: 16 },
    planCard: { width: 235, minHeight: 220, marginRight: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.line },
    planName: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 10 },
    planSpeed: { color: colors.ink, fontSize: 31, fontWeight: '900', marginTop: 10 },
    muted: { color: colors.muted, lineHeight: 20 },
    price: { color: colors.accent, fontWeight: '900', marginTop: 12 },
    card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 10 },
    cardText: { color: colors.ink, lineHeight: 21 },
    cardStrong: { color: colors.ink, fontWeight: '900', fontSize: 16 },
    stars: { color: colors.accent, fontSize: 18, letterSpacing: 2 },
    field: { gap: 6 },
    fieldLabel: { color: colors.muted, fontWeight: '800', fontSize: 13 },
    input: { minHeight: 46, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, color: colors.ink, backgroundColor: colors.soft },
    inputTall: { minHeight: 92, textAlignVertical: 'top', paddingTop: 12 },
    primaryButton: { minHeight: 48, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 4, flexDirection: 'row', gap: 8 },
    primaryButtonText: { color: '#fff', fontWeight: '900' },
    buttonDisabled: { opacity: 0.72 },
    loginContent: { minHeight: '100%', justifyContent: 'center', padding: 18 },
    loginTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    backButton: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    backText: { color: colors.brand, fontWeight: '900' },
    loginBox: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.line, gap: 14 },
    loginTitle: { color: colors.ink, fontSize: 30, fontWeight: '900' },
    header: { minHeight: 72, backgroundColor: colors.brandDark, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitle: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '900', textAlign: 'right' },
    listItem: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
    listText: { color: colors.ink, lineHeight: 20 },
    record: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line, gap: 6 },
    recordTitle: { color: colors.ink, fontWeight: '900', fontSize: 15 },
    recordText: { color: colors.muted, lineHeight: 20 },
    actionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    actionButton: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.soft, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    actionPrimary: { backgroundColor: colors.brand, borderColor: colors.brand },
    actionDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
    actionText: { color: colors.ink, fontWeight: '900', fontSize: 12 },
    actionTextLight: { color: '#fff' },
    saveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chipRow: { flexDirection: 'row', gap: 8, paddingRight: 12 },
    chip: { minHeight: 38, maxWidth: 230, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.soft, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
    chipActive: { borderColor: colors.brand, backgroundColor: colors.surface },
    chipText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
    noticeWrap: { position: 'absolute', left: 14, right: 14, top: 48, zIndex: 50 },
    notice: { minHeight: 78, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    noticeError: { borderColor: colors.danger },
    noticeIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
    noticeIconError: { backgroundColor: colors.danger },
    noticeTextBox: { flex: 1, gap: 2 },
    noticeTitle: { color: colors.ink, fontWeight: '900', fontSize: 15 },
    noticeMessage: { color: colors.muted, lineHeight: 18, fontSize: 12 },
    bottomNav: { position: 'absolute', left: 10, right: 10, bottom: 10, minHeight: 70, borderRadius: 22, backgroundColor: colors.nav, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6 },
    navItem: { flex: 1, minHeight: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 3 },
    navItemActive: { backgroundColor: colors.soft },
    navText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
    navTextActive: { color: colors.brand },
    screenTop: { gap: 8, marginBottom: 8 },
    screenTitle: { color: colors.ink, fontSize: 30, fontWeight: '900' }
  });
}
