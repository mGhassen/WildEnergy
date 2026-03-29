import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { registrationStatusBlocksDelete } from '@/lib/course-delete-rules';
import { z } from 'zod';

const bulkDeleteSchema = z.object({
  courseIds: z.array(z.number().int().positive()).min(1, 'At least one course ID required'),
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
    const parsed = bulkDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { courseIds } = parsed.data;
    const deleted: number[] = [];
    const failed: { courseId: number; reason: string }[] = [];

    for (const courseId of courseIds) {
      const { data: registrations } = await supabaseServer()
        .from('class_registrations')
        .select('id, status')
        .eq('course_id', courseId);

      const { data: checkins } = await supabaseServer()
        .from('checkins')
        .select(`
          id,
          registration_id,
          class_registrations!inner(course_id)
        `)
        .eq('class_registrations.course_id', courseId);

      const hasBlockingReg = (registrations || []).some((r) =>
        registrationStatusBlocksDelete(r.status)
      );

      if (hasBlockingReg || (checkins?.length || 0) > 0) {
        failed.push({
          courseId,
          reason: 'Active registration or check-in on course',
        });
        continue;
      }

      const { error: delError } = await supabaseServer()
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (delError) {
        failed.push({ courseId, reason: delError.message || 'Delete failed' });
        continue;
      }

      deleted.push(courseId);
    }

    return NextResponse.json({
      success: failed.length === 0,
      deletedCount: deleted.length,
      deleted,
      failed,
      message:
        failed.length === 0
          ? `${deleted.length} course(s) deleted`
          : `${deleted.length} deleted, ${failed.length} could not be deleted`,
    });
  } catch (error) {
    console.error('Bulk delete courses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
