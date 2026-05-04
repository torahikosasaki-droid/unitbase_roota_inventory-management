import fs from 'fs'
import path from 'path'
import type { SafetyStockSetting, Equipment } from '@/types/inventory'

const DATA_DIR = path.join(process.cwd(), 'data')

export function readJson<T>(filename: string, fallback: T): T {
  const file = path.join(DATA_DIR, filename)
  if (!fs.existsSync(file)) return fallback
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T
  } catch {
    return fallback
  }
}

export function writeJson<T>(filename: string, data: T): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8')
}

export function getSafetyStockSettings(): SafetyStockSetting[] {
  return readJson<SafetyStockSetting[]>('safety-stock.json', [])
}

export function saveSafetyStockSettings(settings: SafetyStockSetting[]): void {
  writeJson('safety-stock.json', settings)
}

export function getEquipmentList(): Equipment[] {
  return readJson<Equipment[]>('equipment.json', [])
}

export function saveEquipmentList(equipment: Equipment[]): void {
  writeJson('equipment.json', equipment)
}
