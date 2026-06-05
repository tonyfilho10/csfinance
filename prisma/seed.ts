import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed system categories
  const categories = [
    { name: 'Alimentação', color: '#f97316', icon: 'utensils', type: 'debit' as const },
    { name: 'Transporte', color: '#3b82f6', icon: 'car', type: 'debit' as const },
    { name: 'Moradia', color: '#8b5cf6', icon: 'home', type: 'debit' as const },
    { name: 'Saúde', color: '#ef4444', icon: 'heart-pulse', type: 'debit' as const },
    { name: 'Educação', color: '#06b6d4', icon: 'graduation-cap', type: 'debit' as const },
    { name: 'Lazer', color: '#ec4899', icon: 'gamepad-2', type: 'debit' as const },
    { name: 'Vestuário', color: '#f59e0b', icon: 'shirt', type: 'debit' as const },
    { name: 'Salário', color: '#22c55e', icon: 'banknote', type: 'credit' as const },
    { name: 'Freelance', color: '#10b981', icon: 'briefcase', type: 'credit' as const },
    { name: 'Investimento', color: '#6366f1', icon: 'trending-up', type: 'credit' as const },
    { name: 'Transferência', color: '#94a3b8', icon: 'arrow-left-right', type: 'both' as const },
    { name: 'Outros', color: '#64748b', icon: 'ellipsis', type: 'both' as const },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: {
        id: cat.name, // use name as pseudo-key for seeding
      },
      update: {},
      create: {
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        type: cat.type,
        isSystem: true,
      },
    }).catch(async () => {
      // If upsert fails on id, just try insert
      const existing = await prisma.category.findFirst({
        where: { name: cat.name, isSystem: true },
      })
      if (!existing) {
        await prisma.category.create({
          data: { ...cat, isSystem: true },
        })
      }
    })
  }

  console.log('✅ Categorias seed concluído')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
