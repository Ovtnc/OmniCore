import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const { categoryId } = await params;
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      icon: true,
      isActive: true,
      storeId: true,
    },
  });
  if (!category) {
    return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404 });
  }
  return NextResponse.json(category);
}
