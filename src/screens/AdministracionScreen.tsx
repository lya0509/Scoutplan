import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search, Plus, X, ShieldCheck, Users, Building2, UserCheck, UserX, AlertTriangle, History } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { showAlert } from '../utils/alert';
import { DeleteAccountButton } from '../components/DeleteAccountModal';
import {
  REGIONS, ROLE_LABELS, OTHER_DISTRICT, ScoutGroup,
  assignableRoles, canMoveMembers, canCreateGroups, districtsFor, regionLabel, districtLabel, slugDistrict, registerDistricts, registerRegions,
} from '../data/territory';
import PullToRefreshScrollView from '../components/PullToRefreshScrollView';

const UNITS = [
  { id: 'manada', label: 'Manada', color: '#ffb300' },
  { id: 'tropa', label: 'Tropa', color: '#43a047' },
  { id: 'comunidad', label: 'Caminantes', color: '#1e88e5' },
  { id: 'clan', label: 'Clan', color: '#e53935' },
];
const unitLabel = (u?: string | null) => {
  const k = (u || '').toLowerCase();
  if (k === 'grupo' || k === 'general') return 'Jefatura';
  if (k === 'caminantes') return 'Caminantes';
  return UNITS.find(x => x.id === k)?.label || (u ? u : 'Sin rama');
};
const LEADER_ROLES = ['scouter', 'jefe_grupo', 'comisionado', 'comisionado_distrital', 'comisionado_regional', 'nacional', 'admin'];

type Person = {
  id: string; name?: string; email?: string; cedula?: string; role?: string; unit?: string;
  group_name?: string; region?: string | null; district?: string | null; account_status?: string | null;
};
type Filter = 'todos' | 'pendientes' | 'dirigentes';

/**
 * Administración de grupos y roles, según quién entra:
 *  - Jefe de Grupo: personas de su grupo (Scout / Scouter / Jefe de Grupo, rama, aprobar).
 *  - Comisionado Distrital / Regional: además crea grupos y mueve personas dentro de su territorio.
 *  - Admin / Nacional: todo el país y todos los roles.
 * La base de datos aplica las mismas reglas (proteger_perfil, scout_groups RLS).
 */
export default function AdministracionScreen() {
  const { user } = useAuth();
  const { theme, isDarkMode, primaryColor } = useTheme();
  const myRole: string = user?.role || 'scout';
  const roles = assignableRoles(myRole);
  const canMove = canMoveMembers(myRole);
  const canGroups = canCreateGroups(myRole);
  const isAdmin = myRole === 'admin' || myRole === 'nacional';

  const [tab, setTab] = useState<'personas' | 'grupos' | 'historial'>('personas');
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<ScoutGroup[]>([]);
  const [missingTable, setMissingTable] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Person | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, g] = await Promise.all([
        dataService.getAdminPeople({ role: myRole, region: user?.region, district: user?.district, group_name: user?.group_name }),
        canGroups ? dataService.getScoutGroups() : Promise.resolve({ groups: [], districts: [], missingTable: false }),
      ]);
      registerDistricts(g.districts || []);
      registerRegions((g as any).regions || []);
      setPeople(p || []);
      setGroups(g.groups || []);
      setMissingTable(g.missingTable);
    } finally {
      setLoading(false);
    }
  }, [myRole, user?.region, user?.district, user?.group_name, canGroups]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Grupos dentro de mi territorio (a los que puedo mover gente)
  const myGroups = useMemo(() => groups.filter(g => {
    if (isAdmin) return true;
    if (myRole === 'comisionado_regional') return g.region === user?.region;
    if (myRole === 'comisionado_distrital' || myRole === 'comisionado') return g.district === user?.district;
    return false;
  }), [groups, isAdmin, myRole, user?.region, user?.district]);

  const groupNames = useMemo(() => {
    const s = new Set<string>();
    people.forEach(p => p.group_name && s.add(p.group_name));
    myGroups.forEach(g => s.add(g.name));
    return Array.from(s).sort();
  }, [people, myGroups]);

  const pendingCount = people.filter(p => p.account_status === 'pending').length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(p => {
      if (filter === 'pendientes' && p.account_status !== 'pending' && p.account_status !== 'rejected') return false;
      if (filter === 'dirigentes' && !LEADER_ROLES.includes(p.role || '')) return false;
      if (groupFilter !== 'all' && p.group_name !== groupFilter) return false;
      if (q && ![p.name, p.email, p.cedula, p.group_name].some(v => (v || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [people, query, filter, groupFilter]);

  const scopeText = isAdmin ? 'Todo el país'
    : myRole === 'comisionado_regional' ? regionLabel(user?.region)
    : (myRole === 'comisionado_distrital' || myRole === 'comisionado') ? districtLabel(user?.district)
    : (user?.group_name || 'Tu grupo');

  const chip = (active: boolean) => [styles.chip, { borderColor: active ? primaryColor : theme.border, backgroundColor: active ? primaryColor : theme.cardBg }];
  const chipText = (active: boolean) => [styles.chipText, { color: active ? '#fff' : theme.text }];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <PullToRefreshScrollView onRefresh={() => load()} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={[styles.scope, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <ShieldCheck size={20} color={primaryColor} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.scopeTitle, { color: theme.text }]}>{ROLE_LABELS[myRole] || myRole}</Text>
            <Text style={[styles.scopeSub, { color: theme.subText }]}>Alcance: {scopeText}</Text>
          </View>
        </View>

        {canGroups && missingTable && (
          <View style={[styles.warn, { backgroundColor: isDarkMode ? '#2a1f05' : '#fffbeb', borderColor: isDarkMode ? '#78350f' : '#fde68a' }]}>
            <AlertTriangle size={18} color={isDarkMode ? '#fcd34d' : '#92400e'} />
            <Text style={[styles.warnText, { color: isDarkMode ? '#fcd34d' : '#92400e' }]}>
              Falta activar el catálogo de grupos en la base de datos (supabase_administracion.sql). Mientras tanto puedes cambiar roles, pero no crear grupos.
            </Text>
          </View>
        )}

        <View style={[styles.tabs, { backgroundColor: theme.inputBg }]}>
          {([
            ['personas', `Personas (${people.length})`, Users],
            ...(canGroups ? [['grupos', `Grupos (${myGroups.length})`, Building2]] : []),
            ['historial', 'Historial', History],
          ] as [typeof tab, string, any][]).map(([t, label, Icon]) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && { backgroundColor: theme.cardBg }]}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
            >
              <Icon size={16} color={tab === t ? primaryColor : theme.subText} />
              <Text style={[styles.tabText, { color: tab === t ? theme.text : theme.subText }]} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={primaryColor} />
        ) : tab === 'personas' ? (
          <>
            <View style={[styles.search, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Search size={18} color={theme.subText} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar por nombre, correo o cédula"
                placeholderTextColor={theme.subText}
                style={[styles.searchInput, { color: theme.text }]}
                accessibilityLabel="Buscar personas"
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {([['todos', 'Todos'], ['pendientes', `Por aprobar${pendingCount ? ` (${pendingCount})` : ''}`], ['dirigentes', 'Dirigentes']] as [Filter, string][]).map(([id, label]) => (
                <TouchableOpacity key={id} style={chip(filter === id)} onPress={() => setFilter(id)}>
                  <Text style={chipText(filter === id)}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {canMove && groupNames.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <TouchableOpacity style={chip(groupFilter === 'all')} onPress={() => setGroupFilter('all')}>
                  <Text style={chipText(groupFilter === 'all')}>Todos los grupos</Text>
                </TouchableOpacity>
                {groupNames.map(g => (
                  <TouchableOpacity key={g} style={chip(groupFilter === g)} onPress={() => setGroupFilter(g)}>
                    <Text style={chipText(groupFilter === g)}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {shown.length === 0 ? (
              <Text style={[styles.empty, { color: theme.subText }]}>No hay personas con ese filtro.</Text>
            ) : shown.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                onPress={() => setEditing(p)}
                accessibilityRole="button"
                accessibilityLabel={`Administrar a ${p.name}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{p.name || 'Sin nombre'}{p.id === user?.id ? ' (tú)' : ''}</Text>
                  <Text style={[styles.meta, { color: theme.subText }]} numberOfLines={1}>
                    {[p.group_name || 'Sin grupo', unitLabel(p.unit)].join(' · ')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.badge, { backgroundColor: LEADER_ROLES.includes(p.role || '') ? primaryColor + '22' : theme.inputBg }]}>
                    <Text style={[styles.badgeText, { color: LEADER_ROLES.includes(p.role || '') ? theme.accentText : theme.subText }]}>{ROLE_LABELS[p.role || 'scout'] || p.role}</Text>
                  </View>
                  {p.account_status === 'pending' && <Text style={styles.pending}>Por aprobar</Text>}
                  {p.account_status === 'rejected' && <Text style={styles.rejected}>Rechazada</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : tab === 'historial' ? (
          <HistoryTab />
        ) : (
          <GroupsTab
            groups={myGroups}
            people={people}
            onChanged={load}
            onShowPeople={(g) => { setGroupFilter(g); setFilter('todos'); setTab('personas'); }}
            missingTable={missingTable}
          />
        )}
      </PullToRefreshScrollView>

      {editing && (
        <EditPersonModal
          person={editing}
          roles={roles}
          canMove={canMove}
          groups={myGroups}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </View>
  );
}

// ─────────────────────────────── Editar persona ───────────────────────────────

function EditPersonModal({ person, roles, canMove, groups, onClose, onSaved }: {
  person: Person; roles: string[]; canMove: boolean; groups: ScoutGroup[];
  onClose: () => void; onSaved: () => void;
}) {
  const { user } = useAuth();
  const { theme, primaryColor } = useTheme();
  const isSelf = person.id === user?.id;
  const editable = !isSelf && (roles.includes(person.role || 'scout'));
  const [role, setRole] = useState(person.role || 'scout');
  const [unit, setUnit] = useState((person.unit || '').toLowerCase());
  const [groupName, setGroupName] = useState(person.group_name || '');
  const [saving, setSaving] = useState(false);

  const targetGroup = groups.find(g => g.name === groupName);
  const groupChoices = useMemo(() => {
    const list = [...groups].filter(g => g.active !== false || g.name === person.group_name);
    if (person.group_name && !list.some(g => g.name === person.group_name)) list.unshift({ name: person.group_name });
    return list;
  }, [groups, person.group_name]);

  const save = async (extra?: { account_status?: 'approved' | 'rejected' }) => {
    const changes: Record<string, any> = {};
    const parts: string[] = [];
    if (role !== (person.role || 'scout')) { changes.role = role; parts.push(`ahora eres ${ROLE_LABELS[role] || role}`); }
    if (unit && unit !== (person.unit || '').toLowerCase()) { changes.unit = unit; parts.push(`tu rama es ${unitLabel(unit)}`); }
    if (canMove && groupName && groupName !== person.group_name) {
      changes.group_name = groupName;
      if (targetGroup?.region) changes.region = targetGroup.region;
      if (targetGroup?.district) changes.district = targetGroup.district;
      parts.push(`te asignaron a ${groupName}`);
    }
    if (extra?.account_status) {
      changes.account_status = extra.account_status;
      parts.unshift(extra.account_status === 'approved' ? 'tu cuenta fue aprobada' : 'tu cuenta no fue aprobada');
    }
    if (!Object.keys(changes).length) { onClose(); return; }
    setSaving(true);
    try {
      const where = changes.group_name || person.group_name;
      const text = `${parts.join(', ')}${where && extra?.account_status !== 'rejected' ? ` (${where})` : ''}.`;
      await dataService.updateMemberAdmin(person, changes, {
        senderId: user?.id,
        text: (text.charAt(0).toUpperCase() + text.slice(1)) + (changes.role ? ' Si no ves el cambio, cierra sesión y vuelve a entrar.' : ''),
      });
      onSaved();
    } catch (e: any) {
      showAlert('No se pudo guardar', e?.message || 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const confirmReject = () => showAlert('Rechazar cuenta', `¿Rechazar el acceso de ${person.name || 'esta persona'}? No verá nada del grupo.`, [
    { text: 'Rechazar', style: 'destructive', onPress: () => save({ account_status: 'rejected' }) },
    { text: 'Cancelar', style: 'cancel' },
  ]);

  const chip = (active: boolean) => [styles.chip, { borderColor: active ? primaryColor : theme.border, backgroundColor: active ? primaryColor : theme.cardBg }];
  const chipText = (active: boolean) => [styles.chipText, { color: active ? '#fff' : theme.text }];
  const pending = person.account_status === 'pending' || person.account_status === 'rejected';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={styles.sheetHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{person.name || 'Sin nombre'}</Text>
              <Text style={[styles.meta, { color: theme.subText }]} numberOfLines={2}>
                {[person.email, person.cedula ? `C.I. ${person.cedula}` : ''].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar">
              <X size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 14, paddingBottom: 4 }}>
            {!editable && (
              <Text style={[styles.note, { color: theme.subText, backgroundColor: theme.inputBg }]}>
                {isSelf ? 'No puedes cambiar tu propio rol ni tu grupo. Pídeselo a un Comisionado o al administrador.' : 'Esta persona tiene un rol que no puedes modificar.'}
              </Text>
            )}

            {editable && pending && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.primary, { backgroundColor: '#16a34a', flex: 1 }]} onPress={() => save({ account_status: 'approved' })} disabled={saving}>
                  <UserCheck size={17} color="#fff" />
                  <Text style={styles.primaryText}>Aprobar cuenta</Text>
                </TouchableOpacity>
                {person.account_status !== 'rejected' && (
                  <TouchableOpacity style={[styles.secondary, { borderColor: theme.border }]} onPress={confirmReject} disabled={saving} accessibilityLabel="Rechazar cuenta">
                    <UserX size={17} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View>
              <Text style={[styles.label, { color: theme.subText }]}>Rol</Text>
              <View style={styles.wrap}>
                {(editable ? roles : [person.role || 'scout']).map(r => (
                  <TouchableOpacity key={r} style={chip(role === r)} onPress={() => editable && setRole(r)} disabled={!editable}>
                    <Text style={chipText(role === r)}>{ROLE_LABELS[r] || r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: theme.subText }]}>Rama{role === 'scouter' ? ' (de la que es Scouter)' : ''}</Text>
              <View style={styles.wrap}>
                {UNITS.map(u => (
                  <TouchableOpacity key={u.id} style={chip(unit === u.id)} onPress={() => editable && setUnit(u.id)} disabled={!editable}>
                    <Text style={chipText(unit === u.id)}>{u.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {canMove && (
              <View>
                <Text style={[styles.label, { color: theme.subText }]}>Grupo</Text>
                <View style={styles.wrap}>
                  {groupChoices.map(g => (
                    <TouchableOpacity key={g.name} style={chip(groupName === g.name)} onPress={() => editable && setGroupName(g.name)} disabled={!editable}>
                      <Text style={chipText(groupName === g.name)}>{g.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {groupName !== person.group_name && (
                  <Text style={[styles.hint, { color: theme.subText }]}>Pasará a {groupName}{targetGroup?.district ? ` · ${districtLabel(targetGroup.district)}` : ''}.</Text>
                )}
              </View>
            )}
          </ScrollView>

          {isSelf && (
            <View style={{ marginTop: 14 }}>
              <DeleteAccountButton />
            </View>
          )}

          {editable && (
            <TouchableOpacity style={[styles.primary, { backgroundColor: primaryColor, marginTop: 14 }]} onPress={() => save()} disabled={saving} accessibilityRole="button">
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Guardar cambios</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────── Historial ───────────────────────────────

const ACTION_ICON: Record<string, string> = {
  rol: '🛡️', cuenta: '✅', grupo: '🔀', rama: '🏕️', registro: '📝', cuenta_borrada: '🗑️', grupo_creado: '🏢', grupo_estado: '⏸️',
  etapa: '🎖️', requisito: '☑️',
};

function HistoryTab() {
  const { theme, primaryColor } = useTheme();
  const [rows, setRows] = useState<any[] | null>(null);
  const [missing, setMissing] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    dataService.getAuditLog().then(r => { if (alive) { setRows(r.rows); setMissing(r.missingTable); } });
    return () => { alive = false; };
  }, []));

  if (!rows) return <ActivityIndicator style={{ marginTop: 30 }} color={primaryColor} />;
  if (missing) return <Text style={[styles.empty, { color: theme.subText }]}>Falta activar el historial en la base de datos (supabase_historial_borrado.sql).</Text>;
  if (!rows.length) return <Text style={[styles.empty, { color: theme.subText }]}>Todavía no hay cambios registrados.</Text>;

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.hint, { color: theme.subText, marginTop: 0 }]}>Últimos {rows.length} cambios de roles, cuentas, grupos y etapas (aprobaciones, devoluciones y requisitos que marca un dirigente). Nadie puede editar ni borrar este registro.</Text>
      {rows.map(r => (
        <View key={r.id} style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.border, alignItems: 'flex-start' }]}>
          <Text style={{ fontSize: 18 }}>{ACTION_ICON[r.action] || '•'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: theme.text, fontSize: 14 }]}>{r.detail}</Text>
            <Text style={[styles.meta, { color: theme.subText }]} numberOfLines={2}>
              {[r.target_name, r.group_name].filter(Boolean).join(' · ')}
            </Text>
            <Text style={[styles.meta, { color: theme.subText }]}>Por {r.actor_name || '—'} · {fmt(r.at)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────── Grupos ───────────────────────────────

function GroupsTab({ groups, people, onChanged, onShowPeople, missingTable }: {
  groups: ScoutGroup[]; people: Person[]; onChanged: () => void; onShowPeople: (g: string) => void; missingTable: boolean;
}) {
  const { user } = useAuth();
  const { theme, primaryColor } = useTheme();
  const myRole: string = user?.role || '';
  const isAdmin = myRole === 'admin' || myRole === 'nacional';
  const isRegional = myRole === 'comisionado_regional';
  const fixedRegion = !isAdmin ? (user?.region || '') : '';
  const fixedDistrict = !isAdmin && !isRegional ? (user?.district || '') : '';

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [region, setRegion] = useState(fixedRegion || 'miranda');
  const [district, setDistrict] = useState(fixedDistrict);
  const [newDistrict, setNewDistrict] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const districtChoices = districtsFor(region, groups).filter(d => d.id !== OTHER_DISTRICT.id);

  const create = async () => {
    const finalDistrict = fixedDistrict || (district === '__new' ? slugDistrict(newDistrict) : district);
    if (name.trim().length < 3) { showAlert('Falta el nombre', 'Escribe el nombre del grupo (por ejemplo: Grupo Scout Kanaima #12).'); return; }
    if (!finalDistrict) { showAlert('Falta el distrito', 'Elige el distrito del grupo o escribe uno nuevo.'); return; }
    if (district === '__new' && newDistrict.trim().length < 3) { showAlert('Falta el distrito', 'Escribe el nombre del distrito nuevo.'); return; }
    setSaving(true);
    try {
      await dataService.createScoutGroup({
        name,
        region: fixedRegion || region,
        district: finalDistrict,
        newDistrictName: !fixedDistrict && district === '__new' ? newDistrict.trim() : undefined,
      }, user?.id);
      setName(''); setNewDistrict(''); setShowForm(false);
      showAlert('Grupo creado', `${name.trim()} ya está en el catálogo. Ahora asigna su Jefatura desde Personas.`);
      onChanged();
    } catch (e: any) {
      showAlert('No se pudo crear', e?.message || 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (g: ScoutGroup) => {
    if (!g.id) return;
    setBusy(g.id);
    try {
      await dataService.setScoutGroupActive(g.id, g.active === false);
      onChanged();
    } catch (e: any) {
      showAlert('No se pudo guardar', e?.message || 'Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  // Agrupar por región → distrito
  const sections = useMemo(() => {
    const map = new Map<string, ScoutGroup[]>();
    groups.forEach(g => {
      const key = `${regionLabel(g.region)} · ${districtLabel(g.district)}`;
      map.set(key, [...(map.get(key) || []), g]);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [groups]);

  const chip = (active: boolean) => [styles.chip, { borderColor: active ? primaryColor : theme.border, backgroundColor: active ? primaryColor : theme.cardBg }];
  const chipText = (active: boolean) => [styles.chipText, { color: active ? '#fff' : theme.text }];

  return (
    <View style={{ gap: 12 }}>
      {!missingTable && !showForm && (
        <TouchableOpacity style={[styles.primary, { backgroundColor: primaryColor }]} onPress={() => setShowForm(true)} accessibilityRole="button">
          <Plus size={18} color="#fff" />
          <Text style={styles.primaryText}>Nuevo grupo</Text>
        </TouchableOpacity>
      )}

      {showForm && (
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.sheetTitle, { color: theme.text, marginBottom: 10 }]}>Nuevo grupo</Text>
          <Text style={[styles.label, { color: theme.subText }]}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Grupo Scout Kanaima #12"
            placeholderTextColor={theme.subText}
            style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border }]}
          />

          <Text style={[styles.label, { color: theme.subText, marginTop: 12 }]}>Región</Text>
          {fixedRegion ? (
            <Text style={[styles.fixed, { color: theme.text }]}>{regionLabel(fixedRegion)}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {REGIONS.map(r => (
                <TouchableOpacity key={r.id} style={chip(region === r.id)} onPress={() => { setRegion(r.id); setDistrict(''); }}>
                  <Text style={chipText(region === r.id)}>{r.label.replace('Región ', '')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={[styles.label, { color: theme.subText, marginTop: 12 }]}>Distrito</Text>
          {fixedDistrict ? (
            <Text style={[styles.fixed, { color: theme.text }]}>{districtLabel(fixedDistrict)}</Text>
          ) : (
            <>
              <View style={styles.wrap}>
                {districtChoices.map(d => (
                  <TouchableOpacity key={d.id} style={chip(district === d.id)} onPress={() => setDistrict(d.id)}>
                    <Text style={chipText(district === d.id)}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
                {(isAdmin || isRegional) && (
                  <TouchableOpacity style={chip(district === '__new')} onPress={() => setDistrict('__new')}>
                    <Text style={chipText(district === '__new')}>+ Distrito nuevo</Text>
                  </TouchableOpacity>
                )}
              </View>
              {district === '__new' && (
                <TextInput
                  value={newDistrict}
                  onChangeText={setNewDistrict}
                  placeholder="Nombre del distrito"
                  placeholderTextColor={theme.subText}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border, marginTop: 8 }]}
                />
              )}
            </>
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <TouchableOpacity style={[styles.secondary, { borderColor: theme.border, flex: 1 }]} onPress={() => setShowForm(false)}>
              <Text style={{ color: theme.subText, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primary, { backgroundColor: primaryColor, flex: 2 }]} onPress={create} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Crear grupo</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {sections.length === 0 && !showForm && (
        <Text style={[styles.empty, { color: theme.subText }]}>No hay grupos en tu territorio todavía.</Text>
      )}

      {sections.map(([title, list]) => (
        <View key={title} style={{ gap: 8 }}>
          <Text style={[styles.section, { color: theme.subText }]}>{title}</Text>
          {list.map(g => {
            const members = people.filter(p => p.group_name === g.name);
            const approved = members.filter(p => p.account_status !== 'pending' && p.account_status !== 'rejected');
            const youth = approved.filter(p => (p.role || 'scout') === 'scout').length;
            const leaders = approved.filter(p => LEADER_ROLES.includes(p.role || ''));
            const jefes = approved.filter(p => p.role === 'jefe_grupo').map(p => p.name);
            const pend = members.filter(p => p.account_status === 'pending').length;
            const inactive = g.active === false;
            return (
              <View key={g.id || g.name} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border, opacity: inactive ? 0.6 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: theme.text }]}>{g.name}{inactive ? ' · inactivo' : ''}</Text>
                    <Text style={[styles.meta, { color: theme.subText }]}>
                      {youth} jóvenes · {leaders.length} dirigentes{pend ? ` · ${pend} por aprobar` : ''}
                    </Text>
                    <Text style={[styles.meta, { color: jefes.length ? theme.subText : '#d97706' }]} numberOfLines={2}>
                      {jefes.length ? `Jefatura: ${jefes.join(', ')}` : 'Sin Jefe de Grupo asignado'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={[styles.small, { borderColor: theme.border }]} onPress={() => onShowPeople(g.name)}>
                    <Users size={15} color={primaryColor} />
                    <Text style={[styles.smallText, { color: theme.text }]}>Ver personas</Text>
                  </TouchableOpacity>
                  {g.id && (
                    <TouchableOpacity style={[styles.small, { borderColor: theme.border }]} onPress={() => toggleActive(g)} disabled={busy === g.id}>
                      {busy === g.id ? <ActivityIndicator size="small" color={primaryColor} /> : null}
                      <Text style={[styles.smallText, { color: theme.text }]}>{inactive ? 'Activar' : 'Desactivar'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
      <Text style={[styles.hint, { color: theme.subText }]}>
        Un grupo inactivo deja de aparecer en el registro y para mover personas, pero no se borra nada.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  scope: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
  scopeTitle: { fontSize: 15, fontWeight: '800' },
  scopeSub: { fontSize: 13, marginTop: 1 },
  warn: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  warnText: { flex: 1, fontSize: 13, lineHeight: 18 },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 9, minHeight: 40 },
  tabText: { fontSize: 14, fontWeight: '700' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 46 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  chipRow: { gap: 8, paddingVertical: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, minHeight: 36, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 60 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12.5, marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  pending: { fontSize: 12, fontWeight: '700', color: '#d97706' },
  rejected: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 520, alignSelf: 'center', borderRadius: 18, borderWidth: 1, padding: 18 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '800' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 13, lineHeight: 18, borderRadius: 10, padding: 10 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  hint: { fontSize: 12.5, marginTop: 6, lineHeight: 17 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, minHeight: 46, paddingHorizontal: 14 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, minHeight: 46, paddingHorizontal: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  section: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, fontSize: 15 },
  fixed: { fontSize: 15, fontWeight: '600' },
  small: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 38 },
  smallText: { fontSize: 13, fontWeight: '600' },
});
