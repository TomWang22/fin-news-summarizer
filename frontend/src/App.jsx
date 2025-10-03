// ============================ frontend/src/App.jsx ============================
import React, { useEffect, useMemo, useState, useRef } from 'react'
import client from './api/client' // for POST /api/saved
import { useSearch } from './hooks/useSearch'
import ArticleCard from './components/ArticleCard'
import ErrorBanner from './components/ErrorBanner'
import PresetChips from './components/PresetChips'
import CopyLink from './components/CopyLink'
import Toggle from './components/Toggle'
import SkeletonCard from './components/SkeletonCard'
import ExportCSV from './components/ExportCSV'
import QualitySourcesPicker from './components/QualitySourcesPicker'
import DatePresets from './components/DatePresets'
import SourcesDiag from './components/SourcesDiag'
import SavedSearches from './components/SavedSearches'
import { ToastProvider, useToast } from './components/Toast'
import { PRESETS, buildQuery } from './utils/query'
import { QUALITY_SOURCES, QUALITY_BY_LABEL, LABEL_BY_SOURCE_ID } from './utils/sources'

function AppInner() {
  const [query, setQuery] = useState('AAPL, MSFT')
  const [provider, setProvider] = useState('rss')
  const [limit, setLimit] = useState(10)
  const [sentences, setSentences] = useState(3)
  const [sortBy, setSortBy] = useState('relevance')
  const [hideNeutral, setHideNeutral] = useState(false)
  const [broad, setBroad] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [domains, setDomains] = useState('')
  const [qualityLabel, setQualityLabel] = useState('None')
  const [qualityCfg, setQualityCfg] = useState(QUALITY_BY_LABEL['None'])
  const [showDiag, setShowDiag] = useState(false)

  const { loading, error, data, search } = useSearch()
  const canSearch = useMemo(() => query.trim().length > 0, [query])
  const { push } = useToast()
  const firstLoadDone = useRef(false)

  // hydrate from URL only once
  useEffect(() => {
    if (firstLoadDone.current) return
    firstLoadDone.current = true
    const p = new URLSearchParams(window.location.search)
    const qlbl = p.get('qlbl') || 'None'
    setQuery(p.get('q') || 'AAPL, MSFT')
    setProvider(p.get('prov') || 'rss')
    setLimit(Number(p.get('lim')) || 10)
    setSentences(Number(p.get('sents')) || 3)
    setSortBy(p.get('sort') || 'relevance')
    setHideNeutral(p.get('hn') === '1')
    setBroad(p.get('b') !== '0')
    setDateFrom(p.get('dfrom') || '')
    setDateTo(p.get('dto') || '')
    setDomains(p.get('dom') || '')
    setQualityLabel(qlbl)
    setQualityCfg(QUALITY_BY_LABEL[qlbl] || QUALITY_BY_LABEL['None'])
  }, [])

  // keep URL in sync
  useEffect(() => {
    const p = new URLSearchParams()
    p.set('q', query)
    p.set('prov', provider)
    p.set('lim', String(limit))
    p.set('sents', String(sentences))
    p.set('sort', sortBy)
    p.set('b', broad ? '1' : '0')
    if (hideNeutral) p.set('hn', '1')
    if (dateFrom) p.set('dfrom', dateFrom)
    if (dateTo) p.set('dto', dateTo)
    if (domains) p.set('dom', domains)
    if (qualityLabel) p.set('qlbl', qualityLabel)
    const url = `${window.location.pathname}?${p.toString()}`
    window.history.replaceState(null, '', url)
  }, [query, provider, limit, sentences, sortBy, hideNeutral, broad, dateFrom, dateTo, domains, qualityLabel])

  async function onSubmit(e) {
    e?.preventDefault?.()
    if (!canSearch) return

    const effective = buildQuery({ base: query, provider, broad })
    const baseParams = { query: effective, limit, provider, summarize_sentences: sentences }

    if (provider === 'newsapi') {
      const params1 = { ...baseParams }
      if (dateFrom) params1.date_from = dateFrom
      if (dateTo) params1.date_to = dateTo

      if (qualityCfg.sourceId) {
        params1.sources = qualityCfg.sourceId
        const first = await search(params1)
        // If the specific source ID yields zero, retry by domain fallback.
        if (first?.count === 0 && qualityCfg.domain) {
          const params2 = { ...params1 }
          delete params2.sources
          params2.domains = qualityCfg.domain
          await search(params2)
          push('Retried with domain fallback')
        }
        return
      }
      if (domains) params1.domains = domains
      await search(params1)
      return
    }

    await search(baseParams)
  }

  function onPresetRange({ from, to }) {
    setDateFrom(from || '')
    setDateTo(to || '')
  }

  function buildParamsForSave() {
    const effective = buildQuery({ base: query, provider, broad })
    const p = { query: effective, provider, limit, summarize_sentences: sentences }
    if (provider === 'newsapi') {
      if (dateFrom) p.date_from = dateFrom
      if (dateTo) p.date_to = dateTo
      if (qualityCfg?.sourceId) p.sources = qualityCfg.sourceId
      else if (domains) p.domains = domains
    }
    return p
  }

  async function handleSaveCurrent() {
    const defaultName = `${provider.toUpperCase()} • ${query}`.slice(0, 50)
    const name = window.prompt('Name this search:', defaultName)
    if (!name) return
    const params = buildParamsForSave()
    try {
      await client.post('/api/saved', { name, params })
      push('Saved search created')
    } catch (e) {
      const msg = e?.response?.status === 409
        ? 'Name already exists — try another'
        : (e?.response?.data?.detail || 'Failed to save')
      push(msg)
    }
  }

  function handleClearFilters() {
    setDateFrom('')
    setDateTo('')
    setDomains('')
    setQualityLabel('None')
    setQualityCfg(QUALITY_BY_LABEL['None'])
    push('Cleared NewsAPI filters')
  }

  async function loadSavedAndSearch(params) {
    const isNewsapi = params.provider === 'newsapi'
    setProvider(params.provider || 'rss')
    setLimit(params.limit ?? 10)
    setSentences(params.summarize_sentences ?? 3)
    setQuery(params.query || '')

    if (isNewsapi) {
      setDateFrom(params.date_from || '')
      setDateTo(params.date_to || '')
      if (params.sources) {
        const lbl = LABEL_BY_SOURCE_ID[params.sources] || 'None'
        setQualityLabel(lbl)
        setQualityCfg(QUALITY_BY_LABEL[lbl] || QUALITY_BY_LABEL['None'])
        setDomains('')
      } else {
        setQualityLabel('None')
        setQualityCfg(QUALITY_BY_LABEL['None'])
        setDomains(params.domains || '')
      }
    } else {
      setDateFrom('')
      setDateTo('')
      setDomains('')
      setQualityLabel('None')
      setQualityCfg(QUALITY_BY_LABEL['None'])
    }

    await search(params)
  }

  const articles = useMemo(() => {
    if (!data?.articles) return []
    let arr = [...data.articles]
    if (hideNeutral) arr = arr.filter(a => (a.sentiment ?? 0) > 0.1 || (a.sentiment ?? 0) < -0.1)
    if (sortBy === 'sentiment-desc') arr.sort((a, b) => (b.sentiment ?? 0) - (a.sentiment ?? 0))
    else if (sortBy === 'time-desc') arr.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0))
    return arr
  }, [data, sortBy, hideNeutral])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="border-b bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financial News Summarizer</h1>
            <p className="text-gray-600 mt-1 text-sm">Use presets, quality sources, and date ranges.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveCurrent} className="rounded-2xl border px-3 py-2 text-sm hover:bg-gray-50">Save current</button>
            <button onClick={() => setShowDiag(true)} className="rounded-2xl border px-3 py-2 text-sm hover:bg-gray-50">Check Sources</button>
            <CopyLink />
            <ExportCSV data={data} />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-8 gap-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tickers or keywords"
            className="md:col-span-3 rounded-2xl border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <select value={provider} onChange={e => setProvider(e.target.value)} className="rounded-2xl border px-3 py-2 bg-white">
            <option value="rss">RSS (free)</option>
            <option value="newsapi">NewsAPI</option>
          </select>
          <input type="number" min="1" max="6" value={sentences} onChange={e => setSentences(Number(e.target.value))} className="rounded-2xl border px-3 py-2 bg-white"/>
          <input type="number" min="1" max="50" value={limit} onChange={e => setLimit(Number(e.target.value))} className="rounded-2xl border px-3 py-2 bg-white"/>
          <button disabled={!canSearch || loading} className="rounded-2xl bg-indigo-600 text-white px-4 py-2 disabled:opacity-60 shadow">
            {loading ? 'Searching…' : 'Search'}
          </button>
          <div className="flex gap-3 items-center md:col-span-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="rounded-2xl border px-3 py-2 bg-white">
              <option value="relevance">Sort: Relevance</option>
              <option value="sentiment-desc">Sort: Sentiment ⬇︎</option>
              <option value="time-desc">Sort: Newest ⬇︎</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hideNeutral} onChange={e => setHideNeutral(e.target.checked)} />
              Hide neutral
            </label>
            <Toggle checked={broad} onChange={setBroad} label="Broad mode" />
          </div>
        </form>

        {provider === 'newsapi' && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-2xl border px-3 py-2 bg-white"/>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-2xl border px-3 py-2 bg-white"/>
            <div className="md:col-span-3 flex flex-col gap-2">
              <DatePresets onSet={onPresetRange} />
              <div className="flex gap-3">
                <QualitySourcesPicker
                  options={QUALITY_SOURCES}            // optional: if your component accepts it
                  value={qualityLabel}
                  onChange={(cfg) => { setQualityLabel(cfg.label); setQualityCfg(cfg) }}
                />
                <input
                  className="rounded-2xl border px-3 py-2 bg-white flex-1"
                  placeholder="Custom domains (comma separated)"
                  value={domains}
                  onChange={e => setDomains(e.target.value)}
                  title="Used when no Quality Source is chosen"
                />
                <button onClick={handleClearFilters} type="button" className="rounded-2xl border px-3 py-2 text-sm hover:bg-gray-50">
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1">
          <SavedSearches currentParams={buildParamsForSave()} onLoad={loadSavedAndSearch} />
        </div>

        <section>
          <PresetChips presets={PRESETS} onPick={setQuery} />
        </section>

        <ErrorBanner message={error} />
        {loading && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: Math.min(6, limit) }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}
        {data && !loading && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
              <div>
                Provider: <span className="font-medium">{data.provider}</span>
                <span className="mx-2">•</span>
                Results: <span className="font-medium">{data.count}</span>
                {provider === 'newsapi' && qualityLabel !== 'None' && (
                  <span className="ml-2 text-xs text-gray-500">(quality: {qualityLabel})</span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate max-w-[60%]">
                Query sent: “{buildQuery({ base: query, provider, broad })}”
              </div>
            </div>
            {articles.length === 0 ? (
              <div className="text-sm text-gray-600">No articles after filters.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {articles.map((a, i) => <ArticleCard key={i} a={a} />)}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-10 text-center text-xs text-gray-500">Built for quick scanning. Sentiment is heuristic, not advice.</footer>

      <SourcesDiag open={showDiag} onClose={() => setShowDiag(false)} dateFrom={dateFrom} dateTo={dateTo} />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}