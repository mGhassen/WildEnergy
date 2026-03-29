import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { z } from 'zod';

const bulkUpdateSchema = z.object({
  courseIds: z.array(z.number().int().positive()).min(1, 'At least one course ID required'),
  changes: z.object({
    max_participants: z.number().int().min(1).optional(),
    is_active: z.boolean().optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  }).refine((c) => Object.keys(c).length > 0, { message: 'At least one change field required' }),
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const { data: { user: adminUser }, error: authError } = await supabaseServer().auth.getUser(token);
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const { data: adminCheck } = await supabaseServer()
      .from('user_profiles')
      .select('is_admin, accessible_portals')
      .eq('email', adminUser.email)
      .single();
    if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bulkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { courseIds, changes } = parsed.data;
    const updatePayload: Record<string, unknown> = {};
    if (changes.max_participants !== undefined) updatePayload.max_participants = changes.max_participants;
    if (changes.is_active !== undefined) updatePayload.is_active = changes.is_active;
    if (changes.status !== undefined) updatePayload.status = changes.status;

    if (changes.max_participants !== undefined) {
      const { data: courses, error: fetchError } = await supabaseServer()
        .from('courses')
        .select('id, current_participants')
        .in('id', courseIds);

      if (fetchError) {
        return NextResponse.json({ error: 'Failed to fetch courses', details: fetchError.message }, { status: 500 });
      }

      const invalid = (courses || []).filter((c: { current_participants: number }) => c.current_participants > changes.max_participants!);
      if (invalid.length > 0) {
        return NextResponse.json({
          error: 'Max participants cannot be lower than current registrations',
          details: invalid.map((c: { id: number; current_participants: number }) => ({ courseId: c.id, current: c.current_participants })),
        }, { status: 400 });
      }
    }

    const { data: updated, error: updateError } = await supabaseServer()
      .from('courses')
      .update(updatePayload)
      .in('id', courseIds)
      .select('id');

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update courses', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updatedCount: (updated || []).length,
      message: `${(updated || []).length} course(s) updated`,
    });
  } catch (error) {
    console.error('Bulk update courses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
