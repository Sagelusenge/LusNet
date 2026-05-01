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

const colors = {
  bg: '#eef4f2',
  surface: '#ffffff',
  soft: '#f4f8f7',
  ink: '#14211d',
  muted: '#687770',
  line: '#d8e5e0',
  brand: '#08765d',
  brandDark: '#044a3c',
  accent: '#d69d24',
  danger: '#a53b3b'
};

function money(value) {
  return `${Number(value || 0).toFixed(2)} USD`;
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [token, setTokenState] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    plans: [],
    feedback: [],
    summary: null,
    clients: [],
    contracts: [],
    quotes: [],
    invoices: [],
    payments: [],
    tickets: [],
    clientSpace: { client: null, contracts: [], invoices: [], payments: [] }
  });

  const isClient = user?.role === 'client';

  async function bootstrap() {
    const saved = await getToken();
    if (saved) {
      setTokenState(saved);
      setUser(parseUser(saved));
      setScreen(parseUser(saved)?.role === 'client' ? 'client' : 'admin');
    }
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
      setScreen(parsed?.role === 'client' ? 'client' : 'admin');
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

  const content = useMemo(() => {
    if (screen === 'login') return <LoginScreen onLogin={onLogin} onBack={() => setScreen('home')} />;
    if (screen === 'admin') return <AdminScreen data={data} loading={loading} load={load} logout={logout} />;
    if (screen === 'client') return <ClientScreen data={data.clientSpace} loading={loading} load={load} logout={logout} />;
    return <HomeScreen data={data} setScreen={setScreen} load={load} />;
  }, [screen, data, loading]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandDark} />
      {content}
    </SafeAreaProvider>
  );
}

function HomeScreen({ data, setScreen, load }) {
  const [quote, setQuote] = useState({ fullName: '', phone: '', address: '', planId: '', intendedUsage: '' });
  const [contact, setContact] = useState({ fullName: '', phone: '', subject: '', message: '' });

  async function submitQuote() {
    try {
      await api.createQuote(quote);
      setQuote({ fullName: '', phone: '', address: '', planId: '', intendedUsage: '' });
      Alert.alert('Devis', 'Votre demande a ete envoyee');
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
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=1200&q=80' }}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.topRow}>
              <Brand />
              <Pressable style={styles.lightButton} onPress={() => setScreen('login')}>
                <Ionicons name="log-in-outline" size={18} color={colors.ink} />
                <Text style={styles.lightButtonText}>Connexion</Text>
              </Pressable>
            </View>
            <Text style={styles.kicker}>Goma, Nord-Kivu</Text>
            <Text style={styles.heroTitle}>Internet haut debit sans fil</Text>
            <Text style={styles.heroText}>Bouquets maison et entreprise, installation CPE, routeur Wi-Fi, support technique et suivi client.</Text>
          </View>
        </ImageBackground>

        <View style={styles.container}>
          <View style={styles.statsRow}>
            <MiniStat label="Service" value="24/7" icon="time-outline" />
            <MiniStat label="Debit" value="5-30 Mbps" icon="wifi-outline" />
            <MiniStat label="Kit" value="100 USD" icon="cube-outline" />
          </View>

          <SectionTitle icon="speedometer-outline" title="Bouquets" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal}>
            {data.plans.map((plan) => (
              <View style={styles.planCard} key={plan.id}>
                <Ionicons name="router-outline" size={22} color={colors.brand} />
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planSpeed}>{plan.bandwidth_mbps} Mbps</Text>
                <Text style={styles.muted}>{plan.recommended_usage}</Text>
                <Text style={styles.price}>{money(plan.monthly_price_usd)} / mois</Text>
              </View>
            ))}
          </ScrollView>

          <SectionTitle icon="clipboard-outline" title="Demande de devis" />
          <Card>
            <Field label="Nom complet" value={quote.fullName} onChangeText={(fullName) => setQuote({ ...quote, fullName })} />
            <Field label="Telephone" value={quote.phone} onChangeText={(phone) => setQuote({ ...quote, phone })} keyboardType="phone-pad" />
            <Field label="Adresse" value={quote.address} onChangeText={(address) => setQuote({ ...quote, address })} />
            <Field label="Usage prevu" value={quote.intendedUsage} onChangeText={(intendedUsage) => setQuote({ ...quote, intendedUsage })} />
            <Pressable style={styles.primaryButton} onPress={submitQuote}>
              <Text style={styles.primaryButtonText}>Envoyer le devis</Text>
            </Pressable>
          </Card>

          <SectionTitle icon="chatbubbles-outline" title="Appreciations" />
          {data.feedback.map((item) => (
            <Card key={item.id}>
              <Text style={styles.stars}>{'★'.repeat(Number(item.rating || 5))}</Text>
              <Text style={styles.cardText}>{item.comment}</Text>
              <Text style={styles.cardStrong}>{item.full_name} - {item.neighborhood || 'Goma'}</Text>
            </Card>
          ))}

          <SectionTitle icon="call-outline" title="Contact" />
          <Card>
            <Field label="Nom complet" value={contact.fullName} onChangeText={(fullName) => setContact({ ...contact, fullName })} />
            <Field label="Telephone" value={contact.phone} onChangeText={(phone) => setContact({ ...contact, phone })} keyboardType="phone-pad" />
            <Field label="Sujet" value={contact.subject} onChangeText={(subject) => setContact({ ...contact, subject })} />
            <Field label="Message" value={contact.message} onChangeText={(message) => setContact({ ...contact, message })} multiline />
            <Pressable style={styles.primaryButton} onPress={submitContact}>
              <Text style={styles.primaryButtonText}>Envoyer le message</Text>
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoginScreen({ onLogin, onBack }) {
  const [email, setEmail] = useState('admin@lwasiva.net');
  const [password, setPassword] = useState('Admin@2026');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.loginContent}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.brandDark} />
          <Text style={styles.backText}>Accueil</Text>
        </Pressable>
        <View style={styles.loginBox}>
          <Brand dark />
          <Text style={styles.loginTitle}>Connexion</Text>
          <Text style={styles.muted}>Espace admin et client</Text>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
          <Pressable style={styles.primaryButton} onPress={() => onLogin(email, password)}>
            <Text style={styles.primaryButtonText}>Se connecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AdminScreen({ data, loading, load, logout }) {
  const summary = data.summary || {};
  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Administration" logout={logout} />
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={styles.container}>
        <View style={styles.statsRow}>
          <MiniStat label="Clients" value={summary.total_clients || 0} icon="people-outline" />
          <MiniStat label="Contrats" value={summary.active_contracts || 0} icon="document-text-outline" />
          <MiniStat label="Tickets" value={summary.open_tickets || 0} icon="construct-outline" />
        </View>
        <List title="Devis recents" icon="clipboard-outline" items={data.quotes.map((x) => `${x.quote_number} - ${x.full_name} - ${x.status}`)} />
        <List title="Contrats" icon="document-text-outline" items={data.contracts.map((x) => `${x.contract_number} - ${x.client_name} - ${x.plan_name}`)} />
        <List title="Factures" icon="receipt-outline" items={data.invoices.map((x) => `${x.invoice_number} - ${x.client_name || ''} - ${money(x.total_amount_usd)}`)} />
        <List title="Paiements" icon="cash-outline" items={data.payments.map((x) => `${x.client_name || ''} - ${money(x.amount_usd)} - ${x.method}`)} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ClientScreen({ data, loading, load, logout }) {
  const unpaid = data.invoices.filter((item) => item.status !== 'payee' && item.status !== 'annulee');
  const total = unpaid.reduce((sum, item) => sum + Number(item.total_amount_usd || 0), 0);
  const activeContract = data.contracts[0];

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Mon espace" logout={logout} />
      <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} contentContainerStyle={styles.container}>
        <Card>
          <Text style={styles.cardStrong}>{data.client?.full_name || 'Client'}</Text>
          <Text style={styles.muted}>{data.client?.phone || ''}</Text>
        </Card>
        <View style={styles.statsRow}>
          <MiniStat label="Bouquet" value={activeContract?.plan_name || '-'} icon="wifi-outline" />
          <MiniStat label="Factures" value={unpaid.length} icon="receipt-outline" />
          <MiniStat label="Reste" value={money(total)} icon="cash-outline" />
        </View>
        <List title="Mes contrats" icon="document-text-outline" items={data.contracts.map((x) => `${x.contract_number} - ${x.plan_name} - ${x.status}`)} />
        <List title="Mes factures" icon="receipt-outline" items={data.invoices.map((x) => `${x.invoice_number} - ${money(x.total_amount_usd)} - ${x.status}`)} />
        <List title="Mes paiements" icon="cash-outline" items={data.payments.map((x) => `${x.payment_reference} - ${money(x.amount_usd)} - ${x.method}`)} />
      </ScrollView>
    </SafeAreaView>
  );
}

function AppHeader({ title, logout }) {
  return (
    <View style={styles.header}>
      <Brand />
      <Text style={styles.headerTitle}>{title}</Text>
      <Pressable style={styles.headerButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

function Brand({ dark = false }) {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>LN</Text></View>
      <View>
        <Text style={[styles.brandText, dark && styles.brandTextDark]}>LWASIVA_NET</Text>
        <Text style={[styles.brandSub, dark && styles.brandSubDark]}>Internet haut debit</Text>
      </View>
    </View>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={20} color={colors.brand} />
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function MiniStat({ label, value, icon }) {
  return (
    <View style={styles.miniStat}>
      <Ionicons name={icon} size={18} color={colors.brand} />
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={[styles.input, props.multiline && styles.inputTall]} placeholderTextColor="#90a09a" {...props} />
    </View>
  );
}

function List({ title, icon, items }) {
  return (
    <Card>
      <SectionTitle icon={icon} title={title} />
      {items.length === 0 ? <Text style={styles.muted}>Aucune donnee</Text> : items.slice(0, 8).map((item, index) => (
        <View style={styles.listItem} key={`${title}-${index}`}>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hero: { minHeight: 520 },
  heroImage: { opacity: 1 },
  heroOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20, backgroundColor: 'rgba(4, 33, 27, 0.58)' },
  topRow: { position: 'absolute', top: 18, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { fontWeight: '900', color: '#17130a' },
  brandText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  brandSub: { color: '#dcebe7', fontSize: 12 },
  brandTextDark: { color: colors.ink },
  brandSubDark: { color: colors.muted },
  lightButton: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 13, minHeight: 38 },
  lightButtonText: { color: colors.ink, fontWeight: '800' },
  kicker: { color: colors.accent, fontWeight: '800', marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 39, fontWeight: '900', lineHeight: 42 },
  heroText: { color: '#e8f2ef', fontSize: 16, lineHeight: 24, marginTop: 10 },
  container: { padding: 16, gap: 14 },
  statsRow: { flexDirection: 'row', gap: 10 },
  miniStat: { flex: 1, minHeight: 110, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.line },
  miniLabel: { color: colors.muted, fontSize: 12, marginTop: 7 },
  miniValue: { color: colors.ink, fontSize: 17, fontWeight: '900', marginTop: 6 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 2 },
  sectionTitleText: { color: colors.brandDark, fontSize: 18, fontWeight: '900' },
  horizontal: { marginHorizontal: -16, paddingHorizontal: 16 },
  planCard: { width: 235, minHeight: 220, marginRight: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.line },
  planName: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 10 },
  planSpeed: { color: colors.ink, fontSize: 31, fontWeight: '900', marginTop: 10 },
  muted: { color: colors.muted, lineHeight: 20 },
  price: { color: colors.accent, fontWeight: '900', marginTop: 12 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.line, gap: 10 },
  cardText: { color: colors.ink, lineHeight: 21 },
  cardStrong: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  stars: { color: colors.accent, fontSize: 18 },
  field: { gap: 6 },
  fieldLabel: { color: colors.muted, fontWeight: '800', fontSize: 13 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, color: colors.ink, backgroundColor: colors.soft },
  inputTall: { minHeight: 92, textAlignVertical: 'top', paddingTop: 12 },
  primaryButton: { minHeight: 48, borderRadius: 14, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontWeight: '900' },
  loginContent: { minHeight: '100%', justifyContent: 'center', padding: 18 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  backText: { color: colors.brandDark, fontWeight: '900' },
  loginBox: { backgroundColor: colors.surface, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.line, gap: 14 },
  loginTitle: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  header: { minHeight: 72, backgroundColor: colors.brandDark, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'right' },
  headerButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  listItem: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
  listText: { color: colors.ink, lineHeight: 20 }
});
