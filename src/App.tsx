import { useEffect, useMemo, useState } from 'react'
import type { Rule, RuleStatus } from './types'
import {
  loadRules,
  saveRules,
  pickToday,
  exportMarkdown,
  exportJson,
  downloadFile,
  todayStr,
  newId,
} from './storage'
import Wani from './Wani'
import './App.css'

const MAX_SANKA = 3

type FormState =
  | { mode: 'new' }
  | { mode: 'edit'; rule: Rule }
  | null

function App() {
  const [rules, setRules] = useState<Rule[]>(loadRules)
  const [form, setForm] = useState<FormState>(null)
  const [filter, setFilter] = useState<string>('すべて')
  const [showGraduated, setShowGraduated] = useState(false)
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    saveRules(rules)
  }, [rules])

  const sanka = rules.filter((r) => r.status === 'sanka')
  const kokoroe = rules.filter((r) => r.status === 'kokoroe')
  const sotsugyo = rules.filter((r) => r.status === 'sotsugyo')

  const today = useMemo(() => pickToday(kokoroe), [kokoroe])

  const categories = useMemo(() => {
    const set = new Set(rules.map((r) => r.category).filter(Boolean))
    return [...set]
  }, [rules])

  const filteredKokoroe =
    filter === 'すべて' ? kokoroe : kokoroe.filter((r) => r.category === filter)

  function upsertRule(text: string, origin: string, category: string) {
    const now = todayStr()
    if (form?.mode === 'edit') {
      const id = form.rule.id
      setRules((rs) =>
        rs.map((r) =>
          r.id === id ? { ...r, text, origin, category, updatedAt: now } : r,
        ),
      )
    } else {
      const rule: Rule = {
        id: newId(),
        text,
        origin,
        category,
        status: 'kokoroe',
        createdAt: now,
        updatedAt: now,
      }
      setRules((rs) => [rule, ...rs])
    }
    setForm(null)
  }

  function setStatus(id: string, status: RuleStatus) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  function promote(rule: Rule) {
    if (sanka.length >= MAX_SANKA) {
      alert(
        `三箇条は満杯です（最大${MAX_SANKA}つ）。\nどれかを卒業させるか、心得に戻してから昇格させてください。`,
      )
      return
    }
    setStatus(rule.id, 'sanka')
  }

  function graduate(rule: Rule) {
    const reason = prompt(
      `「${rule.text}」を卒業させます。\n卒業理由を残しておこう（あとで読むと面白いよ）:`,
    )
    if (reason === null) return
    setRules((rs) =>
      rs.map((r) =>
        r.id === rule.id
          ? {
              ...r,
              status: 'sotsugyo',
              graduatedAt: todayStr(),
              graduationReason: reason,
            }
          : r,
      ),
    )
  }

  function importJson(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!Array.isArray(parsed)) throw new Error('not array')
        if (
          !confirm(
            `${parsed.length}件のルールを読み込みます。今のデータは上書きされます。よい？`,
          )
        )
          return
        setRules(parsed as Rule[])
      } catch {
        alert('JSONの読み込みに失敗しました。エクスポートしたファイルを選んでね。')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ワニのルールブック</h1>
        <p className="tagline">— 価値観を、育てる —</p>
      </header>

      {/* 三箇条 */}
      <section className="section">
        <h2 className="section-title sanka-title">🧭 三箇条</h2>
        <div className="sanka-list">
          {sanka.map((r, i) => (
            <article key={r.id} className="card sanka-card">
              <div className="sanka-number">其の{['一', '二', '三'][i]}</div>
              <RuleBody rule={r} />
              <div className="actions">
                <button onClick={() => setForm({ mode: 'edit', rule: r })}>編集</button>
                <button onClick={() => setStatus(r.id, 'kokoroe')}>心得に戻す</button>
                <button className="danger" onClick={() => graduate(r)}>
                  卒業
                </button>
              </div>
            </article>
          ))}
          {Array.from({ length: MAX_SANKA - sanka.length }).map((_, i) => (
            <div key={i} className="card sanka-empty">
              空位 — 心得から昇格を待つ
            </div>
          ))}
        </div>
      </section>

      {/* 今日の1本 */}
      {today && (
        <section className="section">
          <div className="card today-card">
            <div className="today-label">✨ 今日の1本</div>
            <p className="today-text">{today.text}</p>
            {today.origin && <p className="today-origin">{today.origin}</p>}
          </div>
        </section>
      )}

      {/* 心得 */}
      <section className="section">
        <div className="kokoroe-header">
          <h2 className="section-title">📖 心得（{kokoroe.length}）</h2>
          <button className="primary" onClick={() => setForm({ mode: 'new' })}>
            ＋ ルールを刻む
          </button>
        </div>

        {categories.length > 0 && (
          <div className="chips">
            {['すべて', ...categories].map((c) => (
              <button
                key={c}
                className={`chip ${filter === c ? 'chip-active' : ''}`}
                onClick={() => setFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="rule-list">
          {filteredKokoroe.length === 0 && (
            <p className="empty-note">
              まだ心得がない。「これは」と思ったら気軽に刻もう。
            </p>
          )}
          {filteredKokoroe.map((r) => (
            <article key={r.id} className="card">
              <RuleBody rule={r} />
              <div className="actions">
                <button className="promote" onClick={() => promote(r)}>
                  ⬆ 三箇条へ昇格
                </button>
                <button onClick={() => setForm({ mode: 'edit', rule: r })}>編集</button>
                <button className="danger" onClick={() => graduate(r)}>
                  卒業
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 卒業 */}
      {sotsugyo.length > 0 && (
        <section className="section">
          <button
            className="toggle-graduated"
            onClick={() => setShowGraduated((v) => !v)}
          >
            🎓 卒業したルール（{sotsugyo.length}） {showGraduated ? '▲' : '▼'}
          </button>
          {showGraduated && (
            <div className="rule-list">
              {sotsugyo.map((r) => (
                <article key={r.id} className="card graduated">
                  <RuleBody rule={r} />
                  {r.graduationReason && (
                    <p className="graduation-reason">卒業理由: {r.graduationReason}</p>
                  )}
                  <div className="actions">
                    <button onClick={() => setStatus(r.id, 'kokoroe')}>
                      心得に復帰
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 番人 */}
      <Wani />

      {/* お引越し */}
      <footer className="footer">
        <button
          className="toggle-graduated"
          onClick={() => setShowExport((v) => !v)}
        >
          📦 お引越し（バックアップ） {showExport ? '▲' : '▼'}
        </button>
        {showExport && (
          <>
        <div className="footer-buttons">
          <button
            onClick={() =>
              downloadFile(
                `niwa-rulebook-${todayStr()}.md`,
                exportMarkdown(rules),
                'text/markdown',
              )
            }
          >
            Markdownで書き出す
          </button>
          <button
            onClick={() =>
              downloadFile(
                `niwa-rulebook-${todayStr()}.json`,
                exportJson(rules),
                'application/json',
              )
            }
          >
            JSONで書き出す
          </button>
          <label className="import-label">
            JSONを読み込む
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importJson(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <p className="footer-note">
          データはこの端末のブラウザ（localStorage）に保存されています。
        </p>
          </>
        )}
      </footer>

      {form && (
        <RuleForm
          initial={form.mode === 'edit' ? form.rule : undefined}
          categories={categories}
          onSubmit={upsertRule}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  )
}

function RuleBody({ rule }: { rule: Rule }) {
  return (
    <>
      <p className="rule-text">{rule.text}</p>
      {rule.origin && <p className="rule-origin">{rule.origin}</p>}
      <p className="rule-meta">
        {rule.category && <span className="rule-category">{rule.category}</span>}
        <span>
          制定 {rule.createdAt}
          {rule.updatedAt !== rule.createdAt && ` ／ 改定 ${rule.updatedAt}`}
        </span>
      </p>
    </>
  )
}

function RuleForm({
  initial,
  categories,
  onSubmit,
  onClose,
}: {
  initial?: Rule
  categories: string[]
  onSubmit: (text: string, origin: string, category: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState(initial?.text ?? '')
  const [origin, setOrigin] = useState(initial?.origin ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{initial ? 'ルールを改定する' : 'ルールを刻む'}</h3>
        <label>
          ルール本文
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="例: 即決で買わない、一晩寝かせる"
            autoFocus
          />
        </label>
        <label>
          きっかけ（このルールが生まれたエピソード）
          <textarea
            rows={3}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="例: 衝動買いで後悔した夜に決めた。…"
          />
        </label>
        <label>
          カテゴリ
          <input
            list="category-suggestions"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="例: 価値観 / お金 / 健康"
          />
          <datalist id="category-suggestions">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <div className="modal-buttons">
          <button onClick={onClose}>やめる</button>
          <button
            className="primary"
            disabled={!text.trim()}
            onClick={() => onSubmit(text.trim(), origin.trim(), category.trim())}
          >
            {initial ? '改定する' : '刻む'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
