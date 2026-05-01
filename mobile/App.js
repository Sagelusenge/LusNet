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
import { api, getToken, parseUser, setToken } from './src/api';

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

const initialData = {
  plans: [],
  feedback: [],
  summary: null,
  clients: [],
  contracts: [],
  quotes: [],
  invoices: [],
  payments: [],
  tickets: [],
  users: [],
  clientSpace: { client: null, contracts: [], invoices: [], payments: [] }
};

export default function App() {
  const [screen, setScreen] = useState('home');
  const [theme, setTheme] = useState('light');
  const [token, setTokenState] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(initialData);
  const colors = palettes[theme];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isClient = user?.role === 'client';

  function toggleTheme() {
    setTheme((value) => (value === 'light' ? 'dark' : 'light'));
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
        const clientSpace = await api.clientSpace().catch(() => ({ client: null, contracts: [], invoices: [], payments: [] }));
        setData((old) => ({ ...old, plans, feedback, clientSpace }));
        return;
      }

      const [summary, clients, contracts, quotes, invoices, payments, tickets, users] = await Promise.all([
        api.summary().catch(() => null),
        api.clients().catch(() => []),
        api.contracts().catch(() => []),
        api.quotes().catch(() => []),
        api.invoices().catch(() => []),
        api.payments().catch(() => []),
        api.tickets().catch(() => []),
        api.users().catch(() => [])
      ]);

      setData((old) => ({ ...old, plans, feedback, summary, clients, contracts, quotes, invoices, payments, tickets, users }));
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
    } catch (error) {
      Alert.alert('Connexion', error.message);
    }
  }

  async function logout() {
    await setToken('');
    setTokenState('');
    setUser(null);
    setScreen('home');
  }

  const common = { colors, styles, screen, setScreen, theme, toggleTheme, loading, load };

  let content;
  if (screen === 'login') {
    content = <LoginScreen {...common} onLogin={onLogin} />;
  } else if (screen.startsWith('admin')) {
    content = <AdminScreen {...common} data={data} logout={logout} />;
  } else if (screen.startsWith('client')) {
    content = <ClientScreen {...common} data={data.clientSpace} logout={logout} />;
  } else {
    content = <HomeScreen {...common} data={data} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      {content}
    </SafeAreaProvider>
  );
}

function HomeScreen({ data, screen, setScreen, styles, colors, theme, toggleTheme, load }) {
  const [quote, setQuote] = useState({ fullName: '', phone: '', address: '', planId: '', intendedUsage: '' });
  const [contact, setContact] = useState({ fullName: '', phone: '', subject: '', message: '' });

  async function submitQuote() {
    try {
      await api.createQuote(quote);
      setQuote({ fullName: '', phone: '', address: '', planId: '', intendedUsage: '' });
      Alert.alert('Devis', 'Votre demande a ete envoyee a l admin');
    } catch (error) {
      Alert.alert('Devis', error.message);
    }
  }

  async function submitContact() {
    try {
      await api.sendContact(contact);
      setContact({ fullName: '', phone: '', subject: '', message: '' });
      Alert.alert('Contact', 'Votre message a ete envoye');
    } catch (error) {
      Alert.alert('Contact', error.message);
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
              <Field styles={styles} colors={colors} label="Usage prevu" value={quote.intendedUsage} onChangeText={(intendedUsage) => setQuote({ ...quote, intendedUsage })} />
              <Pressable style={styles.primaryButton} onPress={submitQuote}>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Envoyer le devis</Text>
              </Pressable>
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
              <Pressable style={styles.primaryButton} onPress={submitContact}>
                <Ionicons name="mail-outline" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Envoyer le message</Text>
              </Pressable>
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
  const [email, setEmail] = useState('admin@lwasiva.net');
  const [password, setPassword] = useState('Admin@2026');

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

function AdminScreen({ data, screen, setScreen, styles, colors, theme, toggleTheme, loading, load, logout }) {
  const summary = data.summary || {};
  const active = screen || 'adminDashboard';
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
            <List styles={styles} colors={colors} title="Devis recents" icon="clipboard-outline" items={data.quotes.map((x) => `${x.quote_number} - ${x.full_name} - ${x.status}`)} />
          </>
        )}
        {active === 'adminClients' && <List styles={styles} colors={colors} title="Clients" icon="people-outline" items={data.clients.map((x) => `${x.full_name} - ${x.phone} - ${x.status || 'actif'}`)} />}
        {active === 'adminContracts' && <List styles={styles} colors={colors} title="Contrats" icon="document-text-outline" items={data.contracts.map((x) => `${x.contract_number} - ${x.client_name} - ${x.plan_name}`)} />}
        {active === 'adminMoney' && (
          <>
            <List styles={styles} colors={colors} title="Factures" icon="receipt-outline" items={data.invoices.map((x) => `${x.invoice_number} - ${x.client_name || ''} - ${money(x.total_amount_usd)}`)} />
            <List styles={styles} colors={colors} title="Paiements" icon="cash-outline" items={data.payments.map((x) => `${x.client_name || ''} - ${money(x.amount_usd)} - ${x.method}`)} />
          </>
        )}
      </ScrollView>
      <BottomNav
        styles={styles}
        colors={colors}
        active={active}
        items={[
          ['adminDashboard', 'Tableau', 'grid-outline'],
          ['adminClients', 'Clients', 'people-outline'],
          ['adminContracts', 'Contrats', 'document-text-outline'],
          ['adminMoney', 'Argent', 'cash-outline']
        ]}
        onPress={setScreen}
      />
    </SafeAreaView>
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
        {active === 'clientContracts' && <List styles={styles} colors={colors} title="Mes contrats" icon="document-text-outline" items={data.contracts.map((x) => `${x.contract_number} - ${x.plan_name} - ${x.status}`)} />}
        {active === 'clientInvoices' && <List styles={styles} colors={colors} title="Mes factures" icon="receipt-outline" items={data.invoices.map((x) => `${x.invoice_number} - ${money(x.total_amount_usd)} - ${x.status}`)} />}
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
    bottomNav: { position: 'absolute', left: 10, right: 10, bottom: 10, minHeight: 70, borderRadius: 22, backgroundColor: colors.nav, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6 },
    navItem: { flex: 1, minHeight: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 3 },
    navItemActive: { backgroundColor: colors.soft },
    navText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
    navTextActive: { color: colors.brand },
    screenTop: { gap: 8, marginBottom: 8 },
    screenTitle: { color: colors.ink, fontSize: 30, fontWeight: '900' }
  });
}
