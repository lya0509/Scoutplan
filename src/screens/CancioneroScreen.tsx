import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput
} from 'react-native';
import { Music, Search, ChevronRight, Heart, Sparkles, BookOpen, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { navigateBackOrHome } from '../utils/navigationHelper';

interface SongItem {
  id: string;
  title: string;
  category: 'cancion' | 'danza' | 'oracion';
  lyrics: string;
}

const SONGS_DATA: SongItem[] = [
  {
    id: 'oracion_scout',
    title: 'Oración Scout (Baden-Powell)',
    category: 'oracion',
    lyrics: `Señor, enséñame a ser generoso,\na servirte como Tú te mereces,\na dar sin medida,\na combatir sin miedo a las heridas,\na trabajar sin buscar reposo,\ny a no esperar otra recompensa\nque la de saber que hago tu santa voluntad.\n\nAmén.`
  },
  {
    id: 'oracion_clan',
    title: 'Oración del Rover / Clan',
    category: 'oracion',
    lyrics: `Dame Señor:
Un corazón vigilante, que ningún pensamiento vano lo aleje de Ti;
un corazón noble, que ningún afecto indigno rebaje;
un corazón recto, que ninguna maldad lo desvíe;
un corazón fuerte, que ninguna pasión lo esclavice;
un corazón generoso, para siempre servir.

Que así sea...`
  },
  {
    id: 'cancion_flor_de_lis',
    title: 'Canto de la Flor de Lis',
    category: 'cancion',
    lyrics: `Brilla la flor de lis en nuestra pañoleta,\nguía de nuestro andar en la gran senda abierta.\nPromesa de honor, ley de hermandad,\njuntos caminaremos en busca de la verdad.\n\n(Coro)\n¡Avanti Scouts, siempre listos a servir!\nCon paso firme e ideal que nos hace vivir.`
  },
  {
    id: 'danza_aniki_kuni',
    title: 'Aniki Kuni (Danza Scout)',
    category: 'danza',
    lyrics: `Aniki kuni ahouara wa wa wa nika aouara,\nAniki kuni ahouara wa wa wa nika aouara.\n\nEawani eawani wa wa wa nika aouara,\nEawani eawani wa wa wa nika aouara.`
  },
  {
    id: 'cancion_despedida',
    title: 'Canto de la Despedida (Auld Lang Syne)',
    category: 'cancion',
    lyrics: `¿Por qué perder las esperanzas de volverse a ver?\n¿Por qué perder las esperanzas si hay tanto querer?\n\n(Coro)\nNo es más que un hasta luego, no es más que un adiós.\nUnidos por la Promesa nos reunirá el Señor.\n\nCon la mano entrelazada hacemos una red,\ny el pensamiento en la promesa que hicimos ayer.`
  }
];

export default function CancioneroScreen({ navigation }: any) {
  const { isDarkMode, theme } = useTheme();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('todos');
  const [selectedSong, setSelectedSong] = useState<SongItem | null>(null);

  const filtered = SONGS_DATA.filter(s => {
    const mSearch = s.title.toLowerCase().includes(search.toLowerCase()) || s.lyrics.toLowerCase().includes(search.toLowerCase());
    const mCat = category === 'todos' || s.category === category;
    return mSearch && mCat;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <TouchableOpacity
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
            marginBottom: 10,
            gap: 6
          }}
          onPress={() => navigateBackOrHome(navigation, user?.role)}
        >
          <ArrowLeft size={16} color={theme.text} />
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.offlineBadge}>⚡ 100% OFFLINE (CANCIONES Y ORACIONES EN TU BOLSILLO)</Text>
        <Text style={[styles.title, { color: theme.text }]}>Cancionero & Oraciones Scout</Text>

        <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Search size={16} color={isDarkMode ? '#71717a' : '#a1a1aa'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar canción u oración..."
            placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.catRow}>
        {[
          { id: 'todos', label: 'Todas' },
          { id: 'cancion', label: 'Canciones' },
          { id: 'oracion', label: 'Oraciones' },
          { id: 'danza', label: 'Danzas' },
        ].map(c => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.catChip,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
              category === c.id && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setCategory(c.id)}
          >
            <Text style={[styles.catChipText, { color: theme.subText }, category === c.id && { color: 'white', fontWeight: 'bold' }]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {filtered.map(song => (
          <TouchableOpacity
            key={song.id}
            style={[styles.songCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => setSelectedSong(song)}
          >
            <Music size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.songTitle, { color: theme.text }]}>{song.title}</Text>
              <Text style={{ fontSize: 11, color: theme.subText, textTransform: 'uppercase' }}>{song.category}</Text>
            </View>
            <ChevronRight size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedSong && (
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <Text style={[modalStyles.title, { color: theme.text }]}>{selectedSong.title}</Text>
              <TouchableOpacity onPress={() => setSelectedSong(null)}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20, maxHeight: 420 }}>
              <Text style={[modalStyles.lyricsText, { color: theme.text }]}>{selectedSong.lyrics}</Text>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  offlineBadge: { fontSize: 10, fontWeight: '900', color: '#16a34a', letterSpacing: 0.5, marginBottom: 2 },
  title: { fontSize: 18, fontWeight: 'bold' },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginTop: 10, height: 42 },
  searchInput: { flex: 1, fontSize: 13 },
  catRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catChipText: { fontSize: 12 },
  songCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  songTitle: { fontSize: 14, fontWeight: 'bold' }
});

const modalStyles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: 'bold' },
  lyricsText: { fontSize: 14, lineHeight: 24, textAlign: 'center', fontStyle: 'italic' }
});
