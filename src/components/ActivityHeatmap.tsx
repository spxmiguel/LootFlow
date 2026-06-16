import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import type { Drop } from '../lib/types'
import { useT } from '../hooks/useT'
import { useStore } from '../store'
import { Card } from './ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getIntensity(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

const INTENSITY_COLORS = [
  'bg-white/[0.03]',               // 0 drops
  'bg-emerald-500/30',             // 1 drop
  'bg-emerald-500/50',             // 2-3 drops
  'bg-emerald-400/70',             // 4-6 drops
  'bg-emerald-400',                // 7+ drops
]

const INTENSITY_BORDERS = [
  'border-transparent',
  'border-emerald-500/20',
  'border-emerald-500/30',
  'border-emerald-400/40',
  'border-emerald-400/50',
]

const MONTH_NAMES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_NAMES_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Component ────────────────────────────────────────────────────────────────

interface ActivityHeatmapProps {
  drops: Drop[]
  compact?: boolean
}

export function ActivityHeatmap({ drops, compact = false }: ActivityHeatmapProps) {
  const t = useT()
  const lang = useStore(s => s.settings.language ?? 'pt')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  const { grid, monthLabels, totalDays, activeDays, currentStreak, longestStreak } = useMemo(() => {
    // Conta drops por dia
    const dropsByDay = new Map<string, number>()
    for (const drop of drops) {
      const dateStr = drop.createdAt ?? drop.registeredAt
      if (!dateStr) continue
      const date = new Date(dateStr)
      const key = getDayKey(date)
      dropsByDay.set(key, (dropsByDay.get(key) ?? 0) + 1)
    }

    // Gera grid de 365 dias (ou 180 se compact)
    const totalDays = compact ? 180 : 365
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cells: Array<{ date: Date; key: string; count: number; intensity: number }> = []

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = getDayKey(d)
      const count = dropsByDay.get(key) ?? 0
      cells.push({ date: d, key, count, intensity: getIntensity(count) })
    }

    // Organiza em colunas (semanas) para renderizar grid CSS
    // Cada coluna = 1 semana, cada linha = dia da semana (0=dom, 6=sab)
    const firstDay = cells[0].date.getDay()
    const grid: Array<Array<typeof cells[0] | null>> = []

    // Primeira coluna pode ter dias vazios no início
    let currentWeek: Array<typeof cells[0] | null> = Array(firstDay).fill(null)
    for (const cell of cells) {
      currentWeek.push(cell)
      if (currentWeek.length === 7) {
        grid.push(currentWeek)
        currentWeek = []
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null)
      grid.push(currentWeek)
    }

    // Labels de meses
    const months = lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_PT
    const monthLabels: Array<{ label: string; col: number }> = []
    let lastMonth = -1
    grid.forEach((week, colIdx) => {
      for (const cell of week) {
        if (cell && cell.date.getMonth() !== lastMonth) {
          lastMonth = cell.date.getMonth()
          monthLabels.push({ label: months[lastMonth], col: colIdx })
          break
        }
      }
    })

    // Streaks
    let currentStreak = 0
    let longestStreak = 0
    let streak = 0

    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i].count > 0) {
        streak++
        if (i === cells.length - 1 || (i < cells.length - 1 && currentStreak === streak - 1)) {
          currentStreak = streak
        }
        longestStreak = Math.max(longestStreak, streak)
      } else {
        if (i === cells.length - 1) currentStreak = 0
        streak = 0
      }
    }

    // Recalcular longest streak corretamente
    streak = 0
    longestStreak = 0
    for (const cell of cells) {
      if (cell.count > 0) {
        streak++
        longestStreak = Math.max(longestStreak, streak)
      } else {
        streak = 0
      }
    }

    // Recalcular current streak (dias consecutivos até hoje)
    currentStreak = 0
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i].count > 0) currentStreak++
      else break
    }

    const activeDays = cells.filter(c => c.count > 0).length

    return { grid, monthLabels, totalDays, activeDays, currentStreak, longestStreak }
  }, [drops, lang, compact])

  const dayLabels = lang === 'en' ? DAY_NAMES_EN : DAY_NAMES_PT

  const handleCellHover = (
    e: React.MouseEvent<HTMLDivElement>,
    cell: { date: Date; count: number } | null
  ) => {
    if (!cell) {
      setTooltip(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const dateStr = cell.date.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    const dropWord = lang === 'en' ? (cell.count === 1 ? 'drop' : 'drops') : (cell.count === 1 ? 'drop' : 'drops')
    const text = cell.count > 0
      ? `${cell.count} ${dropWord} – ${dateStr}`
      : `${lang === 'en' ? 'No drops' : 'Sem drops'} – ${dateStr}`

    setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, text })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="p-5 border-white/[0.025]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Flame className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {t('heatmap.title')}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {t('heatmap.subtitle', { days: totalDays })}
              </p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
              {t('heatmap.active_days', { count: activeDays })}
            </span>
            {currentStreak > 0 && (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 font-medium">
                🔥 {t('heatmap.streak', { count: currentStreak })}
              </span>
            )}
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto -mx-1 px-1 pb-2">
          <div className="min-w-[680px]">
            {/* Month labels */}
            <div className="flex mb-1.5 pl-8">
              {monthLabels.map((m, i) => (
                <div
                  key={i}
                  className="text-[10px] text-slate-600 font-medium"
                  style={{
                    position: 'absolute',
                    left: `calc(32px + ${m.col * 14}px)`,
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            <div className="flex gap-0 mt-5 relative">
              {/* Day labels */}
              <div className="flex flex-col gap-[2px] mr-1.5 shrink-0 mt-0">
                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                  <div
                    key={day}
                    className="h-[11px] flex items-center text-[9px] text-slate-600 font-medium"
                    style={{ visibility: day % 2 === 1 ? 'visible' : 'hidden' }}
                  >
                    {dayLabels[day]}
                  </div>
                ))}
              </div>

              {/* Grid cells */}
              <div className="flex gap-[2px]">
                {grid.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-[2px]">
                    {week.map((cell, dayIdx) => (
                      <div
                        key={dayIdx}
                        className={`w-[11px] h-[11px] rounded-[2px] border transition-all duration-150 ${
                          cell
                            ? `${INTENSITY_COLORS[cell.intensity]} ${INTENSITY_BORDERS[cell.intensity]} hover:ring-1 hover:ring-white/20 cursor-pointer`
                            : 'bg-transparent border-transparent'
                        }`}
                        onMouseEnter={e => handleCellHover(e, cell)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend + mobile stats */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.025]">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span>{lang === 'en' ? 'Less' : 'Menos'}</span>
            {INTENSITY_COLORS.map((color, i) => (
              <div
                key={i}
                className={`w-[10px] h-[10px] rounded-[2px] ${color} border ${INTENSITY_BORDERS[i]}`}
              />
            ))}
            <span>{lang === 'en' ? 'More' : 'Mais'}</span>
          </div>

          <div className="flex sm:hidden items-center gap-2">
            <span className="text-[10px] text-slate-500">
              {activeDays} {lang === 'en' ? 'active' : 'ativos'}
            </span>
            {currentStreak > 0 && (
              <span className="text-[10px] text-orange-400">
                🔥 {currentStreak}
              </span>
            )}
          </div>

          {longestStreak > 0 && (
            <span className="text-[10px] text-slate-600">
              {t('heatmap.longest_streak', { count: longestStreak })}
            </span>
          )}
        </div>
      </Card>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-[#0d1117] border border-white/[0.08] rounded-lg px-2.5 py-1.5 shadow-xl text-[11px] text-slate-200 whitespace-nowrap">
            {tooltip.text}
          </div>
        </div>
      )}
    </motion.div>
  )
}
