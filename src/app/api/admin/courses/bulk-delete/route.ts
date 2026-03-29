import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { deleteCourseWithRegistrationCleanup } from '@/lib/course-delete-cleanup';
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
      const result = await deleteCourseWithRegistrationCleanup(
        supabaseServer(),
        courseId
      );

      if (!result.ok) {
        failed.push({ courseId, reason: result.error });
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
