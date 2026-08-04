import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle,
  Cloud,
  DatabaseBackup,
  EyeOff,
  FileText,
  HardDrive,
  HeartPulse,
  Network,
  Plug,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  Video,
} from 'lucide-react';
import { apiUrl } from '../lib/endpoints';

type Tab = 'health' | 'incidents' | 'cases' | 'nvrs' | 'rules' | 'storage' | 'privacy' | 'integrations' | 'sites' | 'review';

const emptyNvr = {
  name: 'Existing NVR',
  vendor: 'hikvision',
  host: '',
  port: 554,
  username: 'admin',
  password: '',
  channel_count: 4,
  use_substreams: true,
  custom_main_template: '/channel/{channel}/main',
  custom_sub_template: '/channel/{channel}/sub',
};

const emptyRule = {
  name: 'Person after hours',
  severity: 'high',
  enabled: true,
  camera_ids: [] as string[],
  objects: ['person'],
  zone: 'any',
  schedule: '22:00-06:00',
  condition: 'present',
  threshold_seconds: 0,
  cooldown_seconds: 120,
  actions: ['record', 'notify'],
};

const emptyPrivacy = {
  name: 'Home privacy mode',
  enabled: false,
  camera_ids: [] as string[],
  schedule: '18:00-07:00',
  mode: 'disable_ai',
  reason: 'Private household hours',
};

const emptyCase = {
  title: 'New security case',
  status: 'open',
  severity: 'medium',
  assigned_to: '',
  event_ids: [] as string[],
  incident_id: '',
  notes: '',
  locked: false,
};

const emptyPolicy = {
  name: 'Default camera retention',
  enabled: true,
  camera_ids: [] as string[],
  retention_days: 30,
  event_retention_days: 90,
  archive_target: 'local',
  lock_evidence: true,
  record_mode: 'continuous',
};

const emptyIntegration = {
  name: 'Critical incident webhook',
  kind: 'webhook',
  enabled: true,
  target: '',
  events: ['critical_incident', 'camera_offline'],
  secret_ref: '',
};

const emptySite = {
  name: 'Main site',
  role: 'recorder',
  endpoint: '',
  enabled: true,
  location: '',
  notes: '',
};

const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 };
const grid4: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 };

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const Operations: React.FC = () => {
  const [tab, setTab] = useState<Tab>('health');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [nvrs, setNvrs] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [nvrForm, setNvrForm] = useState<any>(emptyNvr);
  const [rules, setRules] = useState<any[]>([]);
  const [ruleForm, setRuleForm] = useState<any>(emptyRule);
  const [privacyModes, setPrivacyModes] = useState<any[]>([]);
  const [privacyForm, setPrivacyForm] = useState<any>(emptyPrivacy);
  const [events, setEvents] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [evidencePackage, setEvidencePackage] = useState<any>(null);
  const [evidencePackages, setEvidencePackages] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [caseForm, setCaseForm] = useState<any>(emptyCase);
  const [policies, setPolicies] = useState<any[]>([]);
  const [policyForm, setPolicyForm] = useState<any>(emptyPolicy);
  const [forecast, setForecast] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [integrationForm, setIntegrationForm] = useState<any>(emptyIntegration);
  const [sites, setSites] = useState<any[]>([]);
  const [siteForm, setSiteForm] = useState<any>(emptySite);
  const [reviews, setReviews] = useState<Record<string, any>>({});

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const requestJson = async (path: string, options?: RequestInit) => {
    const res = await fetch(apiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cameraData, healthData, incidentData, caseData, evidenceData, nvrData, ruleData, policyData, forecastData, privacyData, integrationData, siteData, eventData, reviewData] = await Promise.all([
        fetch(apiUrl('/cameras')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/ops-api/health-center')).then(r => r.ok ? r.json() : null),
        fetch(apiUrl('/ops-api/incidents')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/ops-api/cases')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/ops-api/evidence-packages')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/ops-api/nvrs')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/ops-api/alert-rules')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/ops-api/storage-policies')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/ops-api/storage-forecast')).then(r => r.ok ? r.json() : null),
        fetch(apiUrl('/ops-api/privacy-modes')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/ops-api/integrations')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/ops-api/sites')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/events?limit=25')).then(r => r.ok ? r.json() : []),
        fetch(apiUrl('/ops-api/event-reviews')).then(r => r.ok ? r.json() : []),
      ]);
      setCameras(cameraData);
      setHealth(healthData);
      setIncidents(incidentData);
      setCases(caseData);
      setEvidencePackages(evidenceData);
      setNvrs(nvrData);
      setRules(ruleData);
      setPolicies(policyData);
      setForecast(forecastData);
      setPrivacyModes(privacyData);
      setIntegrations(integrationData);
      setSites(siteData);
      setEvents(eventData);
      setReviews(Object.fromEntries(reviewData.map((r: any) => [r.event_id, r])));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Failed to load operations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const previewNvr = async () => {
    try {
      const data = await requestJson('/ops-api/nvrs/preview', { method: 'POST', body: JSON.stringify(nvrForm) });
      setPreview(data.channels || []);
      notify('NVR channels prepared.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Preview failed.');
    }
  };

  const importNvr = async () => {
    try {
      const data = await requestJson('/ops-api/nvrs', { method: 'POST', body: JSON.stringify(nvrForm) });
      setPreview([]);
      setNvrForm(emptyNvr);
      await loadAll();
      notify(`Imported ${data.created_cameras} channel camera${data.created_cameras === 1 ? '' : 's'}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'NVR import failed.');
    }
  };

  const addRule = async () => {
    try {
      await requestJson('/ops-api/alert-rules', { method: 'POST', body: JSON.stringify(ruleForm) });
      setRuleForm(emptyRule);
      await loadAll();
      notify('Alert rule saved.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Rule save failed.');
    }
  };

  const addPrivacyMode = async () => {
    try {
      await requestJson('/ops-api/privacy-modes', { method: 'POST', body: JSON.stringify(privacyForm) });
      setPrivacyForm(emptyPrivacy);
      await loadAll();
      notify('Privacy mode saved.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Privacy mode save failed.');
    }
  };

  const deleteItem = async (path: string, done: string) => {
    try {
      await requestJson(path, { method: 'DELETE' });
      await loadAll();
      notify(done);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Delete failed.');
    }
  };

  const reviewEvent = async (eventId: string, verdict: string) => {
    try {
      await requestJson(`/ops-api/event-reviews/${eventId}`, {
        method: 'PUT',
        body: JSON.stringify({ verdict, note: '', tags: verdict === 'training' ? ['training-candidate'] : [] }),
      });
      await loadAll();
      notify('Event review saved.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Review failed.');
    }
  };

  const addCase = async () => {
    try {
      await requestJson('/ops-api/cases', { method: 'POST', body: JSON.stringify(caseForm) });
      setCaseForm(emptyCase);
      await loadAll();
      notify('Case created.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Case save failed.');
    }
  };

  const createCaseFromIncident = async (incidentId: string) => {
    try {
      await requestJson(`/ops-api/cases/from-incident?incident_id=${encodeURIComponent(incidentId)}`, { method: 'POST' });
      await loadAll();
      notify('Incident converted to case.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Case creation failed.');
    }
  };

  const addPolicy = async () => {
    try {
      await requestJson('/ops-api/storage-policies', { method: 'POST', body: JSON.stringify(policyForm) });
      setPolicyForm(emptyPolicy);
      await loadAll();
      notify('Storage policy saved.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Storage policy save failed.');
    }
  };

  const addIntegration = async () => {
    try {
      await requestJson('/ops-api/integrations', { method: 'POST', body: JSON.stringify(integrationForm) });
      setIntegrationForm(emptyIntegration);
      await loadAll();
      notify('Integration saved.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Integration save failed.');
    }
  };

  const testIntegration = async (integrationId: string) => {
    try {
      const data = await requestJson(`/ops-api/integrations/${integrationId}/test`, { method: 'POST' });
      notify(data.message || 'Integration tested.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Integration test failed.');
    }
  };

  const addSite = async () => {
    try {
      await requestJson('/ops-api/sites', { method: 'POST', body: JSON.stringify(siteForm) });
      setSiteForm(emptySite);
      await loadAll();
      notify('Site node saved.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Site save failed.');
    }
  };

  const packageIncident = async (incident: any) => {
    try {
      const data = await requestJson('/ops-api/evidence-package', {
        method: 'POST',
        body: JSON.stringify({
          title: `${incident.camera_name} incident ${new Date(incident.start).toLocaleString()}`,
          event_ids: incident.events.map((event: any) => event.id),
          include_clips: true,
          include_metadata: true,
          watermark: true,
        }),
      });
      setEvidencePackage(data);
      await loadAll();
      notify(`Evidence package ${data.package_id} prepared.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Evidence package failed.');
    }
  };

  const cameraOptions = useMemo(() => cameras.map(camera => (
    <option key={camera.id} value={camera.id}>{camera.name}</option>
  )), [cameras]);

  return (
    <div className="settings-shell">
      <div className="settings-topbar">
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--t1)' }}>Operations Center</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--t3)', marginTop: 2 }}>NVR import, reliability, privacy, rules, and event review</div>
        </div>
        <button className="btn btn-ghost" onClick={loadAll} disabled={loading}>
          <RefreshCw size={15} /> {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="settings-body">
        <nav className="settings-nav">
          {[
            ['health', HeartPulse, 'Health'],
            ['incidents', Activity, 'Incidents'],
            ['cases', FileText, 'Cases'],
            ['nvrs', Network, 'NVRs'],
            ['rules', BellRing, 'Rules'],
            ['storage', HardDrive, 'Storage'],
            ['privacy', EyeOff, 'Privacy'],
            ['integrations', Plug, 'Integrations'],
            ['sites', Cloud, 'Sites'],
            ['review', Shield, 'Review'],
          ].map(([id, Icon, label]) => {
            const Cmp = Icon as typeof HeartPulse;
            return (
              <button key={id as string} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id as Tab)}>
                <Cmp size={15} /> {label as string}
              </button>
            );
          })}
        </nav>

        <div className="settings-content">
          {tab === 'health' && (
            <>
              <div style={grid4}>
                {[
                  ['Readiness', `${health?.readiness?.score ?? '--'}%`],
                  ['Cameras', health?.summary?.cameras ?? cameras.length],
                  ['Recording', health?.summary?.recording ?? 0],
                  ['Archive', `${health?.summary?.recording_gb ?? 0} GB`],
                ].map(([label, value]) => (
                  <div className="card" key={label as string} style={{ padding: 18 }}>
                    <div className="card-title">{label as string}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--t1)', marginTop: 8 }}>{value as any}</div>
                    {label === 'Readiness' && <div style={{ color: 'var(--t3)', fontSize: '0.72rem', marginTop: 4 }}>{health?.readiness?.level || 'loading'}</div>}
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-head">
                  <span className="card-title">Reliability Issues</span>
                  <span className={`badge ${(health?.issues?.length || 0) ? 'recording' : 'online'}`}>{health?.issues?.length || 0}</span>
                </div>
                {(health?.issues || []).length === 0 ? (
                  <div className="empty"><CheckCircle size={24} color="var(--green)" /><div className="empty-title">No active reliability issues</div></div>
                ) : health.issues.map((issue: any, index: number) => (
                  <div className="cam-row" key={`${issue.scope}-${issue.id || index}`}>
                    <AlertTriangle size={16} color={issue.severity === 'critical' ? 'var(--red)' : 'var(--amber)'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{issue.name || issue.scope}</div>
                      <div style={{ color: 'var(--t2)', fontSize: '0.76rem', marginTop: 2 }}>{issue.message}</div>
                    </div>
                    <span className={`badge ${issue.severity === 'critical' ? 'recording' : 'offline'}`}>{issue.severity}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'incidents' && (
            <>
              <div style={grid4}>
                {[
                  ['Open Incidents', incidents.length],
                  ['Critical', incidents.filter(i => i.severity === 'critical').length],
                  ['Evidence Ready', evidencePackage ? evidencePackage.package_id : 'none'],
                  ['Reviewed Events', Object.keys(reviews).length],
                ].map(([label, value]) => (
                  <div className="card" key={label as string} style={{ padding: 18 }}>
                    <div className="card-title">{label as string}</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--t1)', marginTop: 8 }}>{value as any}</div>
                  </div>
                ))}
              </div>

              {evidencePackage && (
                <div className="card">
                  <div className="card-head">
                    <span className="card-title">Latest Evidence Manifest</span>
                    <span className="badge online">{evidencePackage.event_count} events</span>
                  </div>
                  <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '180px 1fr', gap: 10, color: 'var(--t2)', fontSize: '0.76rem' }}>
                    <strong style={{ color: 'var(--t1)' }}>Package ID</strong><span>{evidencePackage.package_id}</span>
                    <strong style={{ color: 'var(--t1)' }}>SHA-256</strong><span style={{ fontFamily: 'JetBrains Mono, monospace', overflowWrap: 'anywhere' }}>{evidencePackage.sha256}</span>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-head">
                  <span className="card-title">Incident Intelligence</span>
                  <span className={`badge ${incidents.length ? 'recording' : 'online'}`}>{incidents.length}</span>
                </div>
                {incidents.length === 0 ? <div className="empty"><Activity size={22} /><div className="empty-title">No grouped incidents yet</div></div> : incidents.map(incident => (
                  <div className="cam-row" key={incident.id} style={{ alignItems: 'flex-start' }}>
                    <AlertTriangle size={16} color={incident.severity === 'critical' ? 'var(--red)' : incident.severity === 'high' ? 'var(--amber)' : 'var(--cyan)'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>{incident.camera_name}</strong>
                        <span className={`badge ${incident.severity === 'critical' ? 'recording' : incident.severity === 'high' ? 'offline' : 'online'}`}>{incident.severity}</span>
                      </div>
                      <div style={{ color: 'var(--t2)', fontSize: '0.76rem', marginTop: 4 }}>{incident.summary}</div>
                      <div style={{ color: 'var(--t3)', fontSize: '0.7rem', marginTop: 3 }}>
                        {new Date(incident.start).toLocaleString()} - {new Date(incident.end).toLocaleTimeString()}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {(incident.objects || []).map((objectName: string) => <span className="badge online" key={objectName}>{objectName}</span>)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost" onClick={() => createCaseFromIncident(incident.id)}><Shield size={14} /> Case</button>
                      <button className="btn btn-ghost" onClick={() => packageIncident(incident)}><FileText size={14} /> Evidence</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'cases' && (
            <>
              <div style={grid4}>
                {[
                  ['Open', cases.filter(c => c.status === 'open').length],
                  ['Reviewing', cases.filter(c => c.status === 'reviewing').length],
                  ['Locked', cases.filter(c => c.locked).length],
                  ['Evidence Packs', evidencePackages.length],
                ].map(([label, value]) => (
                  <div className="card" key={label as string} style={{ padding: 18 }}>
                    <div className="card-title">{label as string}</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--t1)', marginTop: 8 }}>{value as any}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Create Case</span><button className="btn btn-primary" onClick={addCase}><Save size={15} /> Save Case</button></div>
                <div style={{ padding: 18, ...grid4 }}>
                  <Field label="Title"><input className="form-input" value={caseForm.title} onChange={e => setCaseForm((f: any) => ({ ...f, title: e.target.value }))} /></Field>
                  <Field label="Status"><select className="form-select" value={caseForm.status} onChange={e => setCaseForm((f: any) => ({ ...f, status: e.target.value }))}>{['open', 'reviewing', 'resolved', 'archived'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Severity"><select className="form-select" value={caseForm.severity} onChange={e => setCaseForm((f: any) => ({ ...f, severity: e.target.value }))}>{['low', 'medium', 'high', 'critical'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Assigned To"><input className="form-input" value={caseForm.assigned_to} onChange={e => setCaseForm((f: any) => ({ ...f, assigned_to: e.target.value }))} /></Field>
                  <Field label="Notes"><input className="form-input" value={caseForm.notes} onChange={e => setCaseForm((f: any) => ({ ...f, notes: e.target.value }))} /></Field>
                  <Field label="Evidence Lock"><select className="form-select" value={caseForm.locked ? 'yes' : 'no'} onChange={e => setCaseForm((f: any) => ({ ...f, locked: e.target.value === 'yes' }))}><option value="yes">Locked</option><option value="no">Unlocked</option></select></Field>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Case Register</span></div>
                {cases.length === 0 ? <div className="empty"><FileText size={22} /><div className="empty-title">No cases yet</div></div> : cases.map(item => (
                  <div className="cam-row" key={item.id}>
                    <FileText size={15} color={item.locked ? 'var(--amber)' : 'var(--cyan)'} />
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{item.title}</div><div style={{ color: 'var(--t3)', fontSize: '0.72rem' }}>{item.status} - {item.assigned_to || 'unassigned'} - {(item.event_ids || []).length} events</div></div>
                    <span className={`badge ${item.severity === 'critical' ? 'recording' : item.severity === 'high' ? 'offline' : 'online'}`}>{item.severity}</span>
                    <button className="btn btn-danger" onClick={() => deleteItem(`/ops-api/cases/${item.id}`, 'Case deleted.')}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Evidence Packages</span></div>
                {evidencePackages.length === 0 ? <div className="empty"><DatabaseBackup size={22} /><div className="empty-title">No evidence packages yet</div></div> : evidencePackages.map(item => (
                  <div className="cam-row" key={item.id}>
                    <DatabaseBackup size={15} color="var(--green)" />
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700 }}>{item.title}</div><div style={{ color: 'var(--t3)', fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace', overflowWrap: 'anywhere' }}>{item.sha256}</div></div>
                    <span className="badge online">{item.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'nvrs' && (
            <>
              <div className="card">
                <div className="card-head">
                  <span className="card-title">Import Existing NVR</span>
                  <button className="btn btn-primary" onClick={importNvr}><Plus size={15} /> Import</button>
                </div>
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={grid4}>
                    <Field label="Name"><input className="form-input" value={nvrForm.name} onChange={e => setNvrForm((f: any) => ({ ...f, name: e.target.value }))} /></Field>
                    <Field label="Vendor">
                      <select className="form-select" value={nvrForm.vendor} onChange={e => setNvrForm((f: any) => ({ ...f, vendor: e.target.value }))}>
                        {['hikvision', 'dahua', 'amcrest', 'reolink', 'axis', 'generic', 'custom'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </Field>
                    <Field label="Host"><input className="form-input" value={nvrForm.host} onChange={e => setNvrForm((f: any) => ({ ...f, host: e.target.value }))} placeholder="192.168.1.20" /></Field>
                    <Field label="Channels"><input className="form-input" type="number" min={1} max={128} value={nvrForm.channel_count} onChange={e => setNvrForm((f: any) => ({ ...f, channel_count: Number(e.target.value) }))} /></Field>
                  </div>
                  <div style={grid4}>
                    <Field label="RTSP Port"><input className="form-input" type="number" value={nvrForm.port} onChange={e => setNvrForm((f: any) => ({ ...f, port: Number(e.target.value) }))} /></Field>
                    <Field label="Username"><input className="form-input" value={nvrForm.username} onChange={e => setNvrForm((f: any) => ({ ...f, username: e.target.value }))} /></Field>
                    <Field label="Password"><input className="form-input" type="password" value={nvrForm.password} onChange={e => setNvrForm((f: any) => ({ ...f, password: e.target.value }))} /></Field>
                    <Field label="Substreams">
                      <select className="form-select" value={nvrForm.use_substreams ? 'yes' : 'no'} onChange={e => setNvrForm((f: any) => ({ ...f, use_substreams: e.target.value === 'yes' }))}>
                        <option value="yes">Create main + sub</option>
                        <option value="no">Main stream only</option>
                      </select>
                    </Field>
                  </div>
                  {nvrForm.vendor === 'custom' && (
                    <div style={grid2}>
                      <Field label="Main Path Template"><input className="form-input" value={nvrForm.custom_main_template} onChange={e => setNvrForm((f: any) => ({ ...f, custom_main_template: e.target.value }))} /></Field>
                      <Field label="Sub Path Template"><input className="form-input" value={nvrForm.custom_sub_template} onChange={e => setNvrForm((f: any) => ({ ...f, custom_sub_template: e.target.value }))} /></Field>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={previewNvr}><Video size={15} /> Preview Channels</button>
                    <span style={{ color: 'var(--t3)', fontSize: '0.76rem', alignSelf: 'center' }}>{preview.length ? `${preview.length} channels ready` : 'Preview before import to confirm generated RTSP URLs.'}</span>
                  </div>
                </div>
              </div>

              {preview.length > 0 && (
                <div className="card">
                  <div className="card-head"><span className="card-title">Channel Preview</span></div>
                  {preview.map(channel => (
                    <div className="cam-row" key={channel.channel}>
                      <Video size={15} color="var(--cyan)" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{channel.name}</div>
                        <div style={{ color: 'var(--t3)', fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel.rtsp_url_main}</div>
                      </div>
                      <span className="badge online">CH {channel.channel}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <div className="card-head"><span className="card-title">Imported NVRs</span></div>
                {nvrs.length === 0 ? <div className="empty"><Network size={22} /><div className="empty-title">No existing NVRs imported</div></div> : nvrs.map(nvr => (
                  <div className="cam-row" key={nvr.id}>
                    <Network size={15} color="var(--cyan)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{nvr.name}</div>
                      <div style={{ color: 'var(--t3)', fontSize: '0.72rem' }}>{nvr.vendor} at {nvr.host}:{nvr.port} - {nvr.channel_count} channels</div>
                    </div>
                    <span className={`badge ${nvr.enabled ? 'online' : 'offline'}`}>{nvr.status}</span>
                    <button className="btn btn-danger" onClick={() => deleteItem(`/ops-api/nvrs/${nvr.id}`, 'NVR removed.')}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'rules' && (
            <>
              <div className="card">
                <div className="card-head"><span className="card-title">Smart Alert Rule</span><button className="btn btn-primary" onClick={addRule}><Save size={15} /> Save Rule</button></div>
                <div style={{ padding: 18, ...grid4 }}>
                  <Field label="Name"><input className="form-input" value={ruleForm.name} onChange={e => setRuleForm((f: any) => ({ ...f, name: e.target.value }))} /></Field>
                  <Field label="Severity"><select className="form-select" value={ruleForm.severity} onChange={e => setRuleForm((f: any) => ({ ...f, severity: e.target.value }))}>{['low', 'medium', 'high', 'critical'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Object Classes"><input className="form-input" value={ruleForm.objects.join(', ')} onChange={e => setRuleForm((f: any) => ({ ...f, objects: e.target.value.split(',').map(v => v.trim()).filter(Boolean) }))} /></Field>
                  <Field label="Schedule"><input className="form-input" value={ruleForm.schedule} onChange={e => setRuleForm((f: any) => ({ ...f, schedule: e.target.value }))} /></Field>
                  <Field label="Cameras"><select className="form-select" multiple value={ruleForm.camera_ids} onChange={e => setRuleForm((f: any) => ({ ...f, camera_ids: Array.from(e.target.selectedOptions).map(o => o.value) }))}>{cameraOptions}</select></Field>
                  <Field label="Condition"><input className="form-input" value={ruleForm.condition} onChange={e => setRuleForm((f: any) => ({ ...f, condition: e.target.value }))} /></Field>
                  <Field label="Threshold Seconds"><input className="form-input" type="number" value={ruleForm.threshold_seconds} onChange={e => setRuleForm((f: any) => ({ ...f, threshold_seconds: Number(e.target.value) }))} /></Field>
                  <Field label="Cooldown Seconds"><input className="form-input" type="number" value={ruleForm.cooldown_seconds} onChange={e => setRuleForm((f: any) => ({ ...f, cooldown_seconds: Number(e.target.value) }))} /></Field>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Active Rules</span></div>
                {rules.length === 0 ? <div className="empty"><BellRing size={22} /><div className="empty-title">No alert rules yet</div></div> : rules.map(rule => (
                  <div className="cam-row" key={rule.id}>
                    <BellRing size={15} color="var(--pink)" />
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{rule.name}</div><div style={{ color: 'var(--t3)', fontSize: '0.72rem' }}>{rule.objects?.join(', ') || 'objects'} during {rule.schedule}</div></div>
                    <span className={`badge ${rule.enabled ? 'online' : 'offline'}`}>{rule.severity}</span>
                    <button className="btn btn-danger" onClick={() => deleteItem(`/ops-api/alert-rules/${rule.id}`, 'Rule deleted.')}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'storage' && (
            <>
              <div style={grid4}>
                {[
                  ['Recording GB', forecast?.recording_gb ?? 0],
                  ['Files', forecast?.recording_files ?? 0],
                  ['Policies', forecast?.active_policies ?? policies.length],
                  ['Event Retention', `${forecast?.max_event_retention_days ?? 0} days`],
                ].map(([label, value]) => (
                  <div className="card" key={label as string} style={{ padding: 18 }}>
                    <div className="card-title">{label as string}</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--t1)', marginTop: 8 }}>{value as any}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Storage Policy</span><button className="btn btn-primary" onClick={addPolicy}><Save size={15} /> Save Policy</button></div>
                <div style={{ padding: 18, ...grid4 }}>
                  <Field label="Name"><input className="form-input" value={policyForm.name} onChange={e => setPolicyForm((f: any) => ({ ...f, name: e.target.value }))} /></Field>
                  <Field label="Record Mode"><select className="form-select" value={policyForm.record_mode} onChange={e => setPolicyForm((f: any) => ({ ...f, record_mode: e.target.value }))}>{['continuous', 'motion', 'events_only'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Archive Target"><select className="form-select" value={policyForm.archive_target} onChange={e => setPolicyForm((f: any) => ({ ...f, archive_target: e.target.value }))}>{['local', 'nas', 's3', 'none'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Enabled"><select className="form-select" value={policyForm.enabled ? 'yes' : 'no'} onChange={e => setPolicyForm((f: any) => ({ ...f, enabled: e.target.value === 'yes' }))}><option value="yes">Enabled</option><option value="no">Disabled</option></select></Field>
                  <Field label="Retention Days"><input className="form-input" type="number" min={1} value={policyForm.retention_days} onChange={e => setPolicyForm((f: any) => ({ ...f, retention_days: Number(e.target.value) }))} /></Field>
                  <Field label="Event Retention"><input className="form-input" type="number" min={1} value={policyForm.event_retention_days} onChange={e => setPolicyForm((f: any) => ({ ...f, event_retention_days: Number(e.target.value) }))} /></Field>
                  <Field label="Lock Evidence"><select className="form-select" value={policyForm.lock_evidence ? 'yes' : 'no'} onChange={e => setPolicyForm((f: any) => ({ ...f, lock_evidence: e.target.value === 'yes' }))}><option value="yes">Yes</option><option value="no">No</option></select></Field>
                  <Field label="Cameras"><select className="form-select" multiple value={policyForm.camera_ids} onChange={e => setPolicyForm((f: any) => ({ ...f, camera_ids: Array.from(e.target.selectedOptions).map(o => o.value) }))}>{cameraOptions}</select></Field>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Active Storage Policies</span></div>
                {policies.length === 0 ? <div className="empty"><HardDrive size={22} /><div className="empty-title">No storage policies yet</div></div> : policies.map(policy => (
                  <div className="cam-row" key={policy.id}>
                    <HardDrive size={15} color="var(--cyan)" />
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{policy.name}</div><div style={{ color: 'var(--t3)', fontSize: '0.72rem' }}>{policy.record_mode} - {policy.retention_days} days - {policy.archive_target}</div></div>
                    <span className={`badge ${policy.enabled ? 'online' : 'offline'}`}>{policy.lock_evidence ? 'evidence locked' : 'standard'}</span>
                    <button className="btn btn-danger" onClick={() => deleteItem(`/ops-api/storage-policies/${policy.id}`, 'Storage policy deleted.')}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              {forecast?.recommendation && <div className="card" style={{ padding: 18, color: 'var(--t2)', fontSize: '0.82rem' }}>{forecast.recommendation}</div>}
            </>
          )}

          {tab === 'privacy' && (
            <>
              <div className="card">
                <div className="card-head"><span className="card-title">Privacy Mode</span><button className="btn btn-primary" onClick={addPrivacyMode}><Save size={15} /> Save Mode</button></div>
                <div style={{ padding: 18, ...grid4 }}>
                  <Field label="Name"><input className="form-input" value={privacyForm.name} onChange={e => setPrivacyForm((f: any) => ({ ...f, name: e.target.value }))} /></Field>
                  <Field label="Mode"><select className="form-select" value={privacyForm.mode} onChange={e => setPrivacyForm((f: any) => ({ ...f, mode: e.target.value }))}>{['disable_camera', 'mask_recording', 'disable_ai', 'local_only'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Schedule"><input className="form-input" value={privacyForm.schedule} onChange={e => setPrivacyForm((f: any) => ({ ...f, schedule: e.target.value }))} /></Field>
                  <Field label="Enabled"><select className="form-select" value={privacyForm.enabled ? 'yes' : 'no'} onChange={e => setPrivacyForm((f: any) => ({ ...f, enabled: e.target.value === 'yes' }))}><option value="yes">Enabled</option><option value="no">Disabled</option></select></Field>
                  <Field label="Cameras"><select className="form-select" multiple value={privacyForm.camera_ids} onChange={e => setPrivacyForm((f: any) => ({ ...f, camera_ids: Array.from(e.target.selectedOptions).map(o => o.value) }))}>{cameraOptions}</select></Field>
                  <Field label="Reason"><input className="form-input" value={privacyForm.reason} onChange={e => setPrivacyForm((f: any) => ({ ...f, reason: e.target.value }))} /></Field>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Saved Privacy Modes</span></div>
                {privacyModes.length === 0 ? <div className="empty"><EyeOff size={22} /><div className="empty-title">No privacy modes yet</div></div> : privacyModes.map(mode => (
                  <div className="cam-row" key={mode.id}>
                    <EyeOff size={15} color="var(--cyan)" />
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{mode.name}</div><div style={{ color: 'var(--t3)', fontSize: '0.72rem' }}>{mode.mode} - {mode.schedule}</div></div>
                    <span className={`badge ${mode.enabled ? 'online' : 'offline'}`}>{mode.enabled ? 'enabled' : 'off'}</span>
                    <button className="btn btn-danger" onClick={() => deleteItem(`/ops-api/privacy-modes/${mode.id}`, 'Privacy mode deleted.')}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'integrations' && (
            <>
              <div className="card">
                <div className="card-head"><span className="card-title">Event Integration</span><button className="btn btn-primary" onClick={addIntegration}><Save size={15} /> Save Integration</button></div>
                <div style={{ padding: 18, ...grid4 }}>
                  <Field label="Name"><input className="form-input" value={integrationForm.name} onChange={e => setIntegrationForm((f: any) => ({ ...f, name: e.target.value }))} /></Field>
                  <Field label="Kind"><select className="form-select" value={integrationForm.kind} onChange={e => setIntegrationForm((f: any) => ({ ...f, kind: e.target.value }))}>{['webhook', 'mqtt', 'email', 'home_assistant', 'slack', 'teams'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Target"><input className="form-input" value={integrationForm.target} onChange={e => setIntegrationForm((f: any) => ({ ...f, target: e.target.value }))} placeholder="URL, topic, email, or endpoint" /></Field>
                  <Field label="Enabled"><select className="form-select" value={integrationForm.enabled ? 'yes' : 'no'} onChange={e => setIntegrationForm((f: any) => ({ ...f, enabled: e.target.value === 'yes' }))}><option value="yes">Enabled</option><option value="no">Disabled</option></select></Field>
                  <Field label="Events"><input className="form-input" value={integrationForm.events.join(', ')} onChange={e => setIntegrationForm((f: any) => ({ ...f, events: e.target.value.split(',').map(v => v.trim()).filter(Boolean) }))} /></Field>
                  <Field label="Secret Ref"><input className="form-input" value={integrationForm.secret_ref} onChange={e => setIntegrationForm((f: any) => ({ ...f, secret_ref: e.target.value }))} placeholder="env:SLACK_WEBHOOK_URL" /></Field>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Configured Integrations</span></div>
                {integrations.length === 0 ? <div className="empty"><Plug size={22} /><div className="empty-title">No integrations yet</div></div> : integrations.map(item => (
                  <div className="cam-row" key={item.id}>
                    <Plug size={15} color="var(--pink)" />
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{item.name}</div><div style={{ color: 'var(--t3)', fontSize: '0.72rem' }}>{item.kind} - {(item.events || []).join(', ')}</div></div>
                    <span className={`badge ${item.enabled ? 'online' : 'offline'}`}>{item.target ? 'target set' : 'needs target'}</span>
                    <button className="btn btn-ghost" onClick={() => testIntegration(item.id)}>Test</button>
                    <button className="btn btn-danger" onClick={() => deleteItem(`/ops-api/integrations/${item.id}`, 'Integration deleted.')}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'sites' && (
            <>
              <div style={grid4}>
                {[
                  ['Sites', sites.length],
                  ['Recorders', sites.filter(s => s.role === 'recorder').length],
                  ['Backups', sites.filter(s => s.role === 'backup').length],
                  ['Enabled', sites.filter(s => s.status === 'enabled').length],
                ].map(([label, value]) => (
                  <div className="card" key={label as string} style={{ padding: 18 }}>
                    <div className="card-title">{label as string}</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--t1)', marginTop: 8 }}>{value as any}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Site Node</span><button className="btn btn-primary" onClick={addSite}><Save size={15} /> Save Site</button></div>
                <div style={{ padding: 18, ...grid4 }}>
                  <Field label="Name"><input className="form-input" value={siteForm.name} onChange={e => setSiteForm((f: any) => ({ ...f, name: e.target.value }))} /></Field>
                  <Field label="Role"><select className="form-select" value={siteForm.role} onChange={e => setSiteForm((f: any) => ({ ...f, role: e.target.value }))}>{['recorder', 'viewer', 'relay', 'backup'].map(v => <option key={v}>{v}</option>)}</select></Field>
                  <Field label="Endpoint"><input className="form-input" value={siteForm.endpoint} onChange={e => setSiteForm((f: any) => ({ ...f, endpoint: e.target.value }))} placeholder="https://site.example.com" /></Field>
                  <Field label="Enabled"><select className="form-select" value={siteForm.enabled ? 'yes' : 'no'} onChange={e => setSiteForm((f: any) => ({ ...f, enabled: e.target.value === 'yes' }))}><option value="yes">Enabled</option><option value="no">Disabled</option></select></Field>
                  <Field label="Location"><input className="form-input" value={siteForm.location} onChange={e => setSiteForm((f: any) => ({ ...f, location: e.target.value }))} /></Field>
                  <Field label="Notes"><input className="form-input" value={siteForm.notes} onChange={e => setSiteForm((f: any) => ({ ...f, notes: e.target.value }))} /></Field>
                </div>
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Site Registry</span></div>
                {sites.length === 0 ? <div className="empty"><Cloud size={22} /><div className="empty-title">No site nodes configured</div></div> : sites.map(site => (
                  <div className="cam-row" key={site.id}>
                    <Cloud size={15} color="var(--cyan)" />
                    <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{site.name}</div><div style={{ color: 'var(--t3)', fontSize: '0.72rem' }}>{site.role} - {site.location || site.endpoint || 'local'}</div></div>
                    <span className={`badge ${site.status === 'enabled' ? 'online' : 'offline'}`}>{site.status}</span>
                    <button className="btn btn-danger" onClick={() => deleteItem(`/ops-api/sites/${site.id}`, 'Site deleted.')}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'review' && (
            <div className="card">
              <div className="card-head">
                <span className="card-title">Event Review Workflow</span>
                <DatabaseBackup size={16} color="var(--t2)" />
              </div>
              {events.length === 0 ? <div className="empty"><Shield size={22} /><div className="empty-title">No events to review</div></div> : events.map(event => {
                const review = reviews[event.id] || event.review;
                return (
                  <div className="cam-row" key={event.id}>
                    <Shield size={15} color={review?.verdict === 'false_positive' ? 'var(--amber)' : 'var(--cyan)'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{event.object_class || 'event'} <span style={{ color: 'var(--t3)', fontWeight: 500 }}>{event.confidence ? `${Math.round(event.confidence * 100)}%` : ''}</span></div>
                      <div style={{ color: 'var(--t3)', fontSize: '0.72rem' }}>{event.timestamp || 'No timestamp'} - {review?.verdict || 'unreviewed'}</div>
                    </div>
                    {['useful', 'false_positive', 'evidence', 'training'].map(verdict => (
                      <button key={verdict} className="btn btn-ghost" style={{ padding: '6px 9px' }} onClick={() => reviewEvent(event.id, verdict)}>{verdict.replace('_', ' ')}</button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default Operations;

