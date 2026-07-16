// ルールの状態: sanka=三箇条(最大3) / kokoroe=心得(候補層) / sotsugyo=卒業(アーカイブ)
export type RuleStatus = 'sanka' | 'kokoroe' | 'sotsugyo'

export interface Rule {
  id: string
  text: string // ルール本文
  origin: string // きっかけ（このルールが生まれたエピソード）
  category: string
  status: RuleStatus
  createdAt: string // 制定日 YYYY-MM-DD
  updatedAt: string // 改定日 YYYY-MM-DD
  graduatedAt?: string // 卒業日
  graduationReason?: string // 卒業理由
}
