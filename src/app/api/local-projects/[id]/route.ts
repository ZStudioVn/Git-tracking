import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const project = await db.localProject.findFirst({ where: { id: context.params.id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  await db.localProject.delete({ where: { id: context.params.id } });
  return NextResponse.json({ ok: true });
}
