'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent } from '@/lib/format'
import type { CategoryExpense } from '@/types'

interface CategoryBreakdownProps {
  categories: CategoryExpense[]
  loading: boolean
  onCategoryClick: (cat: CategoryExpense) => void
}

export function CategoryBreakdown({ categories, loading, onCategoryClick }: CategoryBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Saídas por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            Nenhuma saída no período
          </p>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <button
                key={cat.category_id}
                className="w-full text-left group"
                onClick={() => onCategoryClick(cat)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.category_color }}
                    />
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {cat.category_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{formatPercent(cat.percentage)}</span>
                    <span className="font-semibold">{formatCurrency(cat.total)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.category_color,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
