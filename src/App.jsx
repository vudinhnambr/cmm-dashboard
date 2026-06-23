import { useEffect, useMemo, useState } from 'react';
import {
  Activity, RefreshCw, Search, AlertTriangle,
  CheckCircle2, Package, Layers,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import {
  loadData, computeMetrics, groupBy, fmtDate, daysUntil,
} from './data';
import './dashboard.css';

const CAT_COLORS = { Shipment: 'var(--azure)', ITR: 'var(--violet)', default: 'var(--signal)' };
const catColor = (c) => CAT_COLORS[c] || CAT_COLORS.default;
const pct = (x) => `${Math.round(x * 100)}%`;

function SectionHead({ eyebrow, title }) {
  return (
    <div className="section-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <span className="rule" />
    </div>
  );
}

function ProgressRing({ value, size = 84, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--grid-line)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--signal)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off}
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)' }}
      />
    </svg>
  );
}

function DueList({ rows, accent }) {
  return (
    <div className="due-list">
      {rows
        .slice()
        .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
        .map((r) => {
          const du = daysUntil(r.dueDate);
          return (
            <div className="due-row" key={r.id} style={{ '--accent': accent }}>
              <div className="d-when" style={{ color: accent }}>
                {Math.abs(du)}<small>{du < 0 ? 'NGÀY TRỄ' : 'NGÀY NỮA'}</small>
              </div>
              <div className="d-body">
                <div className="d-name">{r.partName}</div>
                <div className="d-meta">{r.category} · {fmtDate(r.dueDate)} · còn {r.balance}/{r.target}</div>
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default function App() {
  const [state, setState] = useState({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'category', dir: 1 });

  async function fetchAll() {
    setState({ status: 'loading' });
    try {
      const { items, source, warning } = await loadData();
      setState({ status: 'ready', items, source, warning, loadedAt: new Date() });
    } catch (e) {
      setState({ status: 'error', message: e.message });
    }
  }
  useEffect(() => { fetchAll(); }, []);

  const items = state.items || [];
  const m = useMemo(() => computeMetrics(items), [items]);

  const catData = useMemo(() => {
    const g = groupBy(items, 'category');
    return [...g.entries()].map(([name, rows]) => ({
      name,
      target: rows.reduce((s, r) => s + r.target, 0),
      completed: rows.reduce((s, r) => s + r.completed, 0),
      count: rows.length,
    }));
  }, [items]);

  const statusData = useMemo(() => {
    const g = groupBy(items, 'status');
    return [...g.entries()].map(([name, rows]) => ({ name, value: rows.length }));
  }, [items]);

  const filtered = useMemo(() => {
    let r = items;
    if (catFilter !== 'all') r = r.filter((x) => x.category === catFilter);
    if (statusFilter !== 'all') r = r.filter((x) => x.status.toLowerCase() === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((x) =>
        [x.partName, x.refNo, x.ringSN, x.features, x.comment]
          .filter(Boolean).some((f) => f.toString().toLowerCase().includes(q))
      );
    }
    const { key, dir } = sort;
    return [...r].sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === 'dueDate' || key === 'planDate') { av = av ? av.getTime() : Infinity; bv = bv ? bv.getTime() : Infinity; }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av == null) av = -Infinity;
      if (bv == null) bv = -Infinity;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [items, catFilter, statusFilter, query, sort]);

  const cats = useMemo(() => ['all', ...new Set(items.map((x) => x.category))], [items]);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }));
  }
  const arrow = (key) => (sort.key === key ? <span className="arrow">{sort.dir > 0 ? '↑' : '↓'}</span> : null);

  if (state.status === 'loading') {
    return (
      <div className="app"><div className="center-state"><div>
        <div className="spinner" />
        <div className="mono" style={{ color: 'var(--txt-mid)' }}>Đang tải dữ liệu CMM…</div>
      </div></div></div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="app"><div className="center-state">
        <div className="err-box">
          <b>Không tải được dữ liệu.</b><br />{state.message}
          <br /><br />Kiểm tra <code>GDRIVE_FILE_ID</code> trong <code>src/config.js</code> và quyền share của file Drive (Anyone with the link).
          <br /><br /><button className="refresh-btn" onClick={fetchAll}><RefreshCw size={13} /> Thử lại</button>
        </div>
      </div></div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-mark">
          <div className="brand-glyph"><Activity size={22} strokeWidth={2.2} /></div>
          <div className="brand-text">
            <h1>CMM Progress Dashboard</h1>
            <div className="sub">ITR · Inspection &amp; Shipment Tracking</div>
          </div>
        </div>
        <div className="topbar-meta">
          <span className={`src-pill ${state.source === 'sheets' ? 'drive' : 'sample'}`}>
            <span className="dot" />{state.source === 'sheets' ? 'Google Sheets' : 'Dữ liệu mẫu'}
          </span>
          <div style={{ marginTop: 6 }}>Cập nhật {state.loadedAt.toLocaleTimeString('vi-VN')}</div>
          <button className="refresh-btn" onClick={fetchAll}><RefreshCw size={13} /> Tải lại</button>
        </div>
      </header>

      {state.warning && (
        <div className="warn-banner">
          <AlertTriangle size={15} />
          <span>{state.warning}</span>
        </div>
      )}

      <SectionHead eyebrow="01 — Overview" title="Tổng quan tiến độ" />
      <div className="kpi-grid">
        <div className="kpi" style={{ '--accent': 'var(--signal)' }}>
          <div className="label">Tiến độ chung</div>
          <div className="ring-wrap">
            <ProgressRing value={m.overallProgress} />
            <div>
              <div className="ring-num">{pct(m.overallProgress)}</div>
              <div className="foot ok"><Package size={13} /> {m.totCompleted}/{m.totTarget} chi tiết</div>
            </div>
          </div>
        </div>
        <div className="kpi" style={{ '--accent': 'var(--signal)' }}>
          <div className="label">Hoàn thành</div>
          <div className="value">{m.completedJobs}<small> / {m.totalJobs} job</small></div>
          <div className="foot ok"><CheckCircle2 size={13} /> {m.openJobs} job đang mở</div>
        </div>
        <div className="kpi" style={{ '--accent': 'var(--amber)' }}>
          <div className="label">Còn lại (Balance)</div>
          <div className="value">{m.totBalance}</div>
          <div className="foot warn"><Layers size={13} /> chi tiết chưa đo / chưa giao</div>
        </div>
        <div className="kpi" style={{ '--accent': m.overdueCount ? 'var(--rose)' : 'var(--amber)' }}>
          <div className="label">Cảnh báo hạn</div>
          <div className="value">{m.overdueCount}<small> / {m.dueSoonCount} sắp tới</small></div>
          <div className={`foot ${m.overdueCount ? 'alert' : 'warn'}`}>
            <AlertTriangle size={13} /> {m.overdueCount ? 'job đã quá hạn' : 'không có quá hạn'}
          </div>
        </div>
      </div>

      <SectionHead eyebrow="02 — Breakdown" title="Phân tích theo Category &amp; Status" />
      <div className="charts-grid">
        <div className="panel">
          <div className="panel-title">Khối lượng theo Category</div>
          <div className="panel-sub">Qty Target vs Completed</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--txt-mid)', fontSize: 12, fontFamily: 'var(--font-mono)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--txt-low)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="target" name="Target" radius={[4, 4, 0, 0]} fill="var(--border-bright)" />
              <Bar dataKey="completed" name="Completed" radius={[4, 4, 0, 0]}>
                {catData.map((d, i) => <Cell key={i} fill={catColor(d.name)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <div className="panel-title">Trạng thái job</div>
          <div className="panel-sub">Open vs Completed</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3} stroke="none">
                {statusData.map((d, i) => (
                  <Cell key={i} fill={d.name.toLowerCase() === 'completed' ? 'var(--signal)' : 'var(--amber)'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 18, justifyContent: 'center', marginTop: -8 }}>
            {statusData.map((d) => (
              <span key={d.name} className="mono" style={{ color: 'var(--txt-mid)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="dot" style={{ background: d.name.toLowerCase() === 'completed' ? 'var(--signal)' : 'var(--amber)' }} />
                {d.name} · {d.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <SectionHead eyebrow="03 — Schedule" title="Theo dõi Due Date" />
      <div className="charts-grid">
        <div className="panel">
          <div className="panel-title" style={{ color: 'var(--rose)' }}>Quá hạn</div>
          <div className="panel-sub">{m.overdue.length} job · Status chưa Completed</div>
          {m.overdue.length === 0
            ? <div className="empty-note">Không có job nào quá hạn.</div>
            : <DueList rows={m.overdue} accent="var(--rose)" />}
        </div>
        <div className="panel">
          <div className="panel-title" style={{ color: 'var(--amber)' }}>Sắp đến hạn (≤ 7 ngày)</div>
          <div className="panel-sub">{m.dueSoon.length} job</div>
          {m.dueSoon.length === 0
            ? <div className="empty-note">Không có job nào trong 7 ngày tới.</div>
            : <DueList rows={m.dueSoon} accent="var(--amber)" />}
        </div>
      </div>

      <SectionHead eyebrow="04 — Records" title="Bảng chi tiết" />
      <div className="panel">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={15} />
            <input
              placeholder="Tìm part name, ref no, ring SN, comment…"
              value={query} onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {cats.map((c) => (
              <button key={c} className={`chip ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)}>
                {c === 'all' ? 'Tất cả category' : c}
              </button>
            ))}
          </div>
          <div className="chips">
            {['all', 'open', 'completed'].map((s) => (
              <button key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s === 'all' ? 'Mọi status' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="tbl-scroll">
          <table className="itr">
            <thead>
              <tr>
                <th onClick={() => toggleSort('category')}>Cat {arrow('category')}</th>
                <th onClick={() => toggleSort('partName')}>Part Name {arrow('partName')}</th>
                <th onClick={() => toggleSort('refNo')}>Ref No {arrow('refNo')}</th>
                <th onClick={() => toggleSort('target')}>Target {arrow('target')}</th>
                <th onClick={() => toggleSort('completed')}>Done {arrow('completed')}</th>
                <th onClick={() => toggleSort('balance')}>Bal {arrow('balance')}</th>
                <th onClick={() => toggleSort('progress')}>Progress {arrow('progress')}</th>
                <th onClick={() => toggleSort('dueDate')}>Due {arrow('dueDate')}</th>
                <th onClick={() => toggleSort('status')}>Status {arrow('status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const du = daysUntil(r.dueDate);
                const isComplete = r.status.toLowerCase() === 'completed';
                const dueCls = !r.dueDate ? 'ok' : (du < 0 && !isComplete) ? 'overdue' : (du <= 7 && !isComplete) ? 'soon' : 'ok';
                return (
                  <tr key={r.id}>
                    <td><span className={`cat-tag cat-${r.category}`}>{r.category}</span></td>
                    <td className="part-cell" title={r.comment || ''}>{r.partName}</td>
                    <td className="ref-cell">{r.refNo || '—'}</td>
                    <td className="mono">{r.target}</td>
                    <td className="mono">{r.completed}</td>
                    <td className="mono">{r.balance}</td>
                    <td>
                      <span className={`minibar ${r.progress < 1 ? 'warn' : ''}`}><i style={{ width: pct(Math.min(r.progress, 1)) }} /></span>
                      <span className="mono" style={{ marginLeft: 8, color: 'var(--txt-low)' }}>{pct(r.progress)}</span>
                    </td>
                    <td className={`due-tag ${dueCls}`}>
                      {fmtDate(r.dueDate)}
                      {r.dueDate && !isComplete && du < 0 && <span> ({Math.abs(du)}d trễ)</span>}
                    </td>
                    <td><span className={`badge ${isComplete ? 'completed' : 'open'}`}>
                      <span className="dot" />{r.status}
                    </span></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9}><div className="empty-note" style={{ border: 'none' }}>Không có bản ghi khớp bộ lọc.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mono" style={{ marginTop: 12, color: 'var(--txt-low)', fontSize: 11 }}>
          Hiển thị {filtered.length} / {items.length} bản ghi · nhấp tiêu đề cột để sắp xếp
        </div>
      </div>
    </div>
  );
}
