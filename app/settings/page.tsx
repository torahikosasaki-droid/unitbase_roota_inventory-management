'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertBadge } from '@/components/inventory/StockAlert'
import { maskImei } from '@/lib/imei'
import { toast } from 'sonner'
import type { AppUser, Booth, SheetRow, UserRole, SafetyStockSetting } from '@/types/inventory'

type Tab = 'users' | 'booths' | 'safety-stock' | 'connection' | 'logs'

// ----------------------------------------------------------------
// Users tab
// ----------------------------------------------------------------
function UsersTab() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [role, setRole] = useState<UserRole>('staff')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/users')
      const data = await res.json()
      setUsers(data.users)
    } catch {
      toast.error('ユーザー一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!name.trim() || !teamName.trim()) { toast.error('名前とチーム名を入力してください'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, teamName, role }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('ユーザーを追加しました')
      setName(''); setTeamName(''); setRole('staff'); setShowForm(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '追加に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, userName: string) => {
    if (!window.confirm(`「${userName}」を削除しますか？`)) return
    try {
      const res = await fetch(`/api/settings/users?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(`${userName} を削除しました`)
      await load()
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  const handleRoleToggle = async (user: AppUser) => {
    const newRole: UserRole = user.role === 'admin' ? 'staff' : 'admin'
    try {
      const res = await fetch(`/api/settings/users?id=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) throw new Error()
      toast.success('ロールを変更しました')
      await load()
    } catch {
      toast.error('ロール変更に失敗しました')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{users.length}名登録</p>
        <Button size="sm" className="text-xs" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'キャンセル' : '+ ユーザーを追加'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="px-4 pt-4 pb-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">名前</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="田中" className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">チーム名</Label>
                <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="大阪チーム" className="mt-1 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">ロール</Label>
              <div className="flex gap-2 mt-1">
                {(['staff', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`px-3 py-1 rounded text-xs border transition-colors ${role === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}
                  >
                    {r === 'admin' ? '管理者' : 'スタッフ'}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={saving} className="w-full text-xs">
              {saving ? '追加中...' : '追加する'}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm text-slate-400">読み込み中...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">ユーザーがいません</div>
      ) : (
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs text-slate-500">名前</TableHead>
                <TableHead className="text-xs text-slate-500">チーム</TableHead>
                <TableHead className="text-xs text-slate-500">ロール</TableHead>
                <TableHead className="text-xs text-slate-500">追加日</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-sm font-medium text-slate-800">{user.name}</TableCell>
                  <TableCell className="text-xs text-slate-500">{user.teamName}</TableCell>
                  <TableCell>
                    <button onClick={() => handleRoleToggle(user)} title="クリックでロール変更">
                      <Badge
                        variant="outline"
                        className={`text-xs cursor-pointer ${user.role === 'admin' ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-slate-300 text-slate-600'}`}
                      >
                        {user.role === 'admin' ? '管理者' : 'スタッフ'}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                    >
                      削除
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Booths tab
// ----------------------------------------------------------------
function BoothsTab() {
  const [booths, setBooths] = useState<Booth[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/booths')
      const data = await res.json()
      setBooths(data.booths)
    } catch {
      toast.error('ブース一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    try {
      const res = await fetch('/api/settings/booths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('ブースを追加しました')
      setNewName('')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '追加に失敗しました')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`ブース「${name}」を削除しますか？`)) return
    try {
      const res = await fetch(`/api/settings/booths?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(`ブース「${name}」を削除しました`)
      await load()
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">持ち出し登録画面で使用するブース一覧を管理します</p>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="ブース名（例: D, 梅田店）"
          className="text-sm"
        />
        <Button size="sm" onClick={handleAdd} className="text-xs shrink-0">追加</Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-slate-400">読み込み中...</div>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100 rounded-md border border-slate-200 overflow-hidden">
          {booths.map((booth) => (
            <div key={booth.id} className="flex items-center justify-between px-4 py-3 bg-white">
              <span className="text-sm font-medium text-slate-800">{booth.name}</span>
              <button
                onClick={() => handleDelete(booth.id, booth.name)}
                className="text-xs text-slate-400 hover:text-red-600 transition-colors"
              >
                削除
              </button>
            </div>
          ))}
          {booths.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-400">ブースがありません</div>
          )}
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Safety stock tab
// ----------------------------------------------------------------
function SafetyStockTab() {
  const [settings, setSettings] = useState<SafetyStockSetting[]>([])
  const [booths, setBooths] = useState<Booth[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ boothId: '', mainCategory: '', subCategory: '', threshold: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ssRes, boothRes] = await Promise.all([
        fetch('/api/settings/safety-stock'),
        fetch('/api/settings/booths'),
      ])
      const [ssData, boothData] = await Promise.all([ssRes.json(), boothRes.json()])
      setSettings(ssData.settings)
      setBooths(boothData.booths)
    } catch {
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.boothId || !form.mainCategory || !form.threshold) {
      toast.error('ブース・大カテゴリー・基準台数を入力してください')
      return
    }
    try {
      const res = await fetch('/api/settings/safety-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boothId: form.boothId,
          mainCategory: form.mainCategory,
          subCategory: form.subCategory || undefined,
          threshold: parseInt(form.threshold, 10),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('安全在庫を追加しました')
      setForm({ boothId: '', mainCategory: '', subCategory: '', threshold: '' })
      setShowForm(false)
      await load()
    } catch {
      toast.error('追加に失敗しました')
    }
  }

  const handleSaveThreshold = async (id: string) => {
    const v = parseInt(editValue, 10)
    if (isNaN(v) || v < 0) { toast.error('正の整数を入力してください'); return }
    try {
      const res = await fetch(`/api/settings/safety-stock?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: v }),
      })
      if (!res.ok) throw new Error()
      toast.success('更新しました')
      setEditingId(null)
      await load()
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/safety-stock?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('削除しました')
      await load()
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  const boothName = (id: string) => booths.find((b) => b.id === id)?.name ?? id

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">チームごとの基準在庫台数を設定します</p>
        <Button size="sm" className="text-xs" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'キャンセル' : '+ 追加'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="px-4 pt-4 pb-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">ブース</Label>
                <select
                  value={form.boothId}
                  onChange={(e) => setForm((f) => ({ ...f, boothId: e.target.value }))}
                  className="mt-1 w-full text-sm border border-slate-200 rounded px-2 py-1.5 bg-white"
                >
                  <option value="">選択してください</option>
                  {booths.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-600">基準台数</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.threshold}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                  placeholder="例: 20"
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">大カテゴリー</Label>
                <Input value={form.mainCategory} onChange={(e) => setForm((f) => ({ ...f, mainCategory: e.target.value }))} placeholder="モバイル" className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">小カテゴリー（任意）</Label>
                <Input value={form.subCategory} onChange={(e) => setForm((f) => ({ ...f, subCategory: e.target.value }))} placeholder="iPhone" className="mt-1 text-sm" />
              </div>
            </div>
            <Button size="sm" onClick={handleAdd} className="w-full text-xs">追加する</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm text-slate-400">読み込み中...</div>
      ) : settings.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">設定がありません</div>
      ) : (
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs text-slate-500">ブース</TableHead>
                <TableHead className="text-xs text-slate-500">大カテゴリー</TableHead>
                <TableHead className="text-xs text-slate-500">小カテゴリー</TableHead>
                <TableHead className="text-xs text-slate-500">基準台数</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm text-slate-800">{boothName(s.boothId)}</TableCell>
                  <TableCell className="text-xs text-slate-600">{s.mainCategory}</TableCell>
                  <TableCell className="text-xs text-slate-600">{s.subCategory ?? '—'}</TableCell>
                  <TableCell>
                    {editingId === s.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-16 h-6 text-xs px-1"
                          autoFocus
                        />
                        <button onClick={() => handleSaveThreshold(s.id)} className="text-xs text-blue-600">保存</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-slate-400">×</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(s.id); setEditValue(String(s.threshold)) }}
                        className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors"
                        title="クリックで編集"
                      >
                        {s.threshold}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                    >
                      削除
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Connection tab
// ----------------------------------------------------------------
interface ConnectionResult {
  ok: boolean
  spreadsheetId: string
  sheetName: string
  rowCount: number
  checkedAt: string
  error?: string
}

function ConnectionTab() {
  const [result, setResult] = useState<ConnectionResult | null>(null)
  const [testing, setTesting] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/settings/connection')
      const data = await res.json()
      setResult(data)
      if (data.ok) toast.success('接続に成功しました')
      else toast.error('接続に失敗しました')
    } catch {
      toast.error('テストに失敗しました')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">Google Sheetsとの接続状態を確認します</p>

      <Card className="border-slate-200">
        <CardContent className="px-4 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">スプレッドシートID</p>
              <p className="text-sm font-mono text-slate-700 mt-0.5">
                {result ? result.spreadsheetId : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">シート名</p>
              <p className="text-sm text-slate-700 mt-0.5">{result ? result.sheetName : '—'}</p>
            </div>
          </div>

          {result && (
            <>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">取得行数</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">{result.rowCount}件</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">確認日時</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(result.checkedAt).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>

              <div className={`rounded px-3 py-2 text-sm ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.ok ? '接続OK' : `エラー: ${result.error}`}
              </div>
            </>
          )}

          <Button onClick={handleTest} disabled={testing} className="w-full text-xs">
            {testing ? '確認中...' : '接続テスト'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ----------------------------------------------------------------
// Logs tab
// ----------------------------------------------------------------
function LogsTab() {
  const [rows, setRows] = useState<SheetRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sheets/inventory')
      .then((r) => r.json())
      .then((data) => {
        const active = (data.devices as SheetRow[])
          .filter((d) => d.checkoutDate || d.soldDate)
          .sort((a, b) => {
            const da = a.soldDate ?? a.checkoutDate ?? ''
            const db = b.soldDate ?? b.checkoutDate ?? ''
            return db.localeCompare(da)
          })
          .slice(0, 50)
        setRows(active)
      })
      .catch(() => toast.error('ログの取得に失敗しました'))
      .finally(() => setLoading(false))
  }, [])

  const statusLabel = (row: SheetRow) => {
    if (row.returnedFlag) return <Badge variant="outline" className="text-xs text-slate-500">返却済</Badge>
    if (row.soldFlag) return <Badge className="text-xs bg-green-100 text-green-800 border-green-200 hover:bg-green-100">販売済</Badge>
    if (row.checkoutFlag) return <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">持ち出し中</Badge>
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-500">持ち出し・販売の記録を日付降順で表示します（最大50件）</p>

      {loading ? (
        <div className="text-center py-8 text-sm text-slate-400">読み込み中...</div>
      ) : (
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs text-slate-500">IMEI</TableHead>
                <TableHead className="text-xs text-slate-500">ステータス</TableHead>
                <TableHead className="text-xs text-slate-500">持ち出し日</TableHead>
                <TableHead className="text-xs text-slate-500">ブース</TableHead>
                <TableHead className="text-xs text-slate-500">販売日</TableHead>
                <TableHead className="text-xs text-slate-500">アラート</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.imei} className={row.alert ? 'bg-red-50' : undefined}>
                  <TableCell className="font-mono text-xs">{maskImei(row.imei)}</TableCell>
                  <TableCell>{statusLabel(row)}</TableCell>
                  <TableCell className="text-xs text-slate-600">{row.checkoutDate ?? '—'}</TableCell>
                  <TableCell className="text-xs text-slate-600">{row.salesBooth ?? '—'}</TableCell>
                  <TableCell className="text-xs text-slate-600">{row.soldDate ?? '—'}</TableCell>
                  <TableCell><AlertBadge text={row.alert} /></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-slate-400 py-8">
                    記録がありません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Main page
// ----------------------------------------------------------------
const TABS: { id: Tab; label: string }[] = [
  { id: 'users',        label: 'ユーザー管理' },
  { id: 'booths',       label: '販売ブース' },
  { id: 'safety-stock', label: '安全在庫' },
  { id: 'connection',   label: '接続設定' },
  { id: 'logs',         label: '操作ログ' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">設定・管理</h1>
          <p className="text-xs text-slate-500 mt-1">ユーザーやシステム設定を管理します</p>
        </div>
        <div className="flex gap-2">
          <Link href="/equipment">
            <Button size="sm" variant="outline" className="text-xs">備品管理</Button>
          </Link>
          <Link href="/import">
            <Button size="sm" variant="outline" className="text-xs">販売実績インポート</Button>
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-200 gap-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-4 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-slate-800 text-slate-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'users'        && <UsersTab />}
        {activeTab === 'booths'       && <BoothsTab />}
        {activeTab === 'safety-stock' && <SafetyStockTab />}
        {activeTab === 'connection'   && <ConnectionTab />}
        {activeTab === 'logs'         && <LogsTab />}
      </div>
    </div>
  )
}
