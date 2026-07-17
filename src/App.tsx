import { useEffect, useMemo, useRef, useState } from 'react'
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

type Tab = 'sanka' | 'kokoroe'

type FormState =
  | { mode: 'new' }
  | { mode: 'edit'; rule: Rule }
  | null

function App() {
  const [rules, setRules] = useState<Rule[]>(loadRules)
  const [tab, setTab] = useState<Tab>('sanka')
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

      <nav className="tabs">
        <button
          className={`tab ${tab === 'sanka' ? 'tab-active' : ''}`}
          onClick={() => setTab('sanka')}
        >
          三箇条
        </button>
        <button
          className={`tab ${tab === 'kokoroe' ? 'tab-active' : ''}`}
          onClick={() => setTab('kokoroe')}
        >
          心得（{kokoroe.length}）
        </button>
      </nav>

      {tab === 'sanka' && (
        <>
          <section className="section">
            <div className="sanka-list">
              {sanka.map((r, i) => (
                <article key={r.id} className="card sanka-card">
                  <div className="sanka-number">其の{['一', '二', '三'][i]}</div>
                  <CardMenu
                    items={[
                      { label: '編集', onClick: () => setForm({ mode: 'edit', rule: r }) },
                      { label: '心得に戻す', onClick: () => setStatus(r.id, 'kokoroe') },
                      { label: '卒業させる', onClick: () => graduate(r) },
                    ]}
                  />
                  <RuleBody rule={r} />
                </article>
              ))}
              {Array.from({ length: MAX_SANKA - sanka.length }).map((_, i) => (
                <div key={i} className="card sanka-empty">
                  空位 — 心得から昇格を待つ
                </div>
              ))}
            </div>
          </section>

          {today && (
            <section className="section">
              <div className="card today-card">
                <div className="today-label">今日の1本</div>
                <p className="today-text">{today.text}</p>
                {today.origin && (
                  <ClampText text={today.origin} className="today-origin" />
                )}
              </div>
            </section>
          )}

          <Wani />
        </>
      )}

      {tab === 'kokoroe' && (
        <section className="section">
          <button className="primary add-button" onClick={() => setForm({ mode: 'new' })}>
            ＋ ルールを刻む
          </button>

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
                <CardMenu
                  items={[
                    { label: '三箇条へ昇格', onClick: () => promote(r) },
                    { label: '編集', onClick: () => setForm({ mode: 'edit', rule: r }) },
                    { label: '卒業させる', onClick: () => graduate(r) },
                  ]}
                />
                <RuleBody rule={r} />
              </article>
            ))}
          </div>

          {sotsugyo.length > 0 && (
            <div className="graduated-block">
              <button
                className="toggle-graduated"
                onClick={() => setShowGraduated((v) => !v)}
              >
                卒業したルール（{sotsugyo.length}） {showGraduated ? '▲' : '▼'}
              </button>
              {showGraduated && (
                <div className="rule-list">
                  {sotsugyo.map((r) => (
                    <article key={r.id} className="card graduated">
                      <CardMenu
                        items={[
                          { label: '心得に復帰', onClick: () => setStatus(r.id, 'kokoroe') },
                        ]}
                      />
                      <RuleBody rule={r} />
                      {r.graduationReason && (
                        <p className="graduation-reason">
                          卒業理由: {r.graduationReason}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <footer className="footer">
        <button
          className="toggle-graduated"
          onClick={() => setShowExport((v) => !v)}
        >
          お引越し（バックアップ） {showExport ? '▲' : '▼'}
        </button>
        {showExport && (
          <>
            <div className="footer-buttons">
              <button
                onClick={() =>
                  downloadFile(
                    `wani-rulebook-${todayStr()}.md`,
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
                    `wani-rulebook-${todayStr()}.json`,
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

// 長い文章を3行で畳んで「続きを読む」で開閉する
function ClampText({ text, className }: { text: string; className: string }) {
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && !expanded) setOverflowing(el.scrollHeight > el.clientHeight + 1)
  }, [text, expanded])

  return (
    <>
      <p ref={ref} className={`${className} ${expanded ? '' : 'clamp-3'}`}>
        {text}
      </p>
      {(overflowing || expanded) && (
        <button
          className="link-button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
        >
          {expanded ? '閉じる' : '…続きを読む'}
        </button>
      )}
    </>
  )
}

// カード右上の「⋯」メニュー
function CardMenu({
  items,
}: {
  items: { label: string; onClick: () => void }[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="menu-wrap">
      <button
        className="menu-button"
        aria-label="操作メニュー"
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <>
          <div className="menu-backdrop" onClick={() => setOpen(false)} />
          <div className="menu">
            {items.map((it) => (
              <button
                key={it.label}
                onClick={() => {
                  setOpen(false)
                  it.onClick()
                }}
              >
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RuleBody({ rule }: { rule: Rule }) {
  return (
    <>
      <p className="rule-text">{rule.text}</p>
      {rule.origin && <ClampText text={rule.origin} className="rule-origin" />}
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
          タグ
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="新しいタグを入力、または下から選択"
          />
        </label>
        {categories.length > 0 && (
          <div className="chips form-chips">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${category === c ? 'chip-active' : ''}`}
                onClick={() => setCategory(category === c ? '' : c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
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
