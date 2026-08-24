import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase';
import { customQuerySpecSchema } from '@/lib/stats/query-spec';

const TABS = [
  'overview',
  'members',
  'finances',
  'attendance',
  'program',
  'subscriptions',
  'trainers',
] as const;

type StatsTab = (typeof TABS)[number];

const boardWidgetSchema = z.object({
  id: z.string().uuid(),
  metricId: z.string().min(1),
  params: z.record(z.string(), z.string()).default({}),
  customQuery: customQuerySpecSchema.optional(),
});

const boardLayoutSchema = z.object({
  i: z.string().uuid(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  minW: z.number().int().min(1).optional(),
  minH: z.number().int().min(1).optional(),
  maxH: z.number().int().min(1).nullable().optional(),
});

const boardStateSchema = z.object({
  widgets: z.array(boardWidgetSchema),
  layouts: z.array(boardLayoutSchema),
});

type DbWidget = {
  id: string;
  metric_id: string;
  params: Record<string, string> | null;
  custom_query: unknown;
  x: number;
  y: number;
  w: number;
  h: number;
  min_w: number | null;
  min_h: number | null;
  max_h: number | null;
};

function isTab(v: string | null): v is StatsTab {
  return !!v && (TABS as readonly string[]).includes(v);
}

function rowsToBoard(rows: DbWidget[]) {
  return {
    widgets: rows.map((r) => ({
      id: r.id,
      metricId: r.metric_id,
      params: (r.params || {}) as Record<string, string>,
      ...(r.custom_query ? { customQuery: r.custom_query } : {}),
    })),
    layouts: rows.map((r) => ({
      i: r.id,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      minW: r.min_w ?? 2,
      minH: r.min_h ?? 2,
      maxH: r.max_h ?? undefined,
    })),
  };
}

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return { error: NextResponse.json({ error: 'No token provided' }, { status: 401 }) };
  }

  const { data: { user }, error: authError } = await supabaseServer().auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  const { data: adminCheck } = await supabaseServer()
    .from('user_profiles')
    .select('account_id, is_admin, accessible_portals')
    .eq('email', user.email)
    .single();

  if (!adminCheck?.is_admin || !adminCheck?.accessible_portals?.includes('admin')) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  if (!adminCheck.account_id) {
    return { error: NextResponse.json({ error: 'Admin account not found' }, { status: 403 }) };
  }

  return { accountId: adminCheck.account_id as string };
}

async function clonePublicToPersonal(accountId: string, tab: StatsTab) {
  const db = supabaseServer();

  const { data: publicRows, error: publicErr } = await db
    .from('stats_widgets')
    .select('metric_id, params, custom_query, x, y, w, h, min_w, min_h, max_h')
    .is('account_id', null)
    .eq('tab', tab)
    .order('y', { ascending: true })
    .order('x', { ascending: true });

  if (publicErr) throw publicErr;

  const inserts = (publicRows || []).map((r) => ({
    account_id: accountId,
    tab,
    metric_id: r.metric_id,
    params: r.params || {},
    custom_query: r.custom_query,
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    min_w: r.min_w ?? 2,
    min_h: r.min_h ?? 2,
    max_h: r.max_h,
  }));

  const { error: boardErr } = await db.from('stats_boards').upsert({
    account_id: accountId,
    tab,
    updated_at: new Date().toISOString(),
  });
  if (boardErr) throw boardErr;

  if (inserts.length === 0) {
    return [] as DbWidget[];
  }

  const { data: cloned, error: insertErr } = await db
    .from('stats_widgets')
    .insert(inserts)
    .select('id, metric_id, params, custom_query, x, y, w, h, min_w, min_h, max_h');

  if (insertErr) throw insertErr;
  return (cloned || []) as DbWidget[];
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const tabParam = req.nextUrl.searchParams.get('tab');
    if (!isTab(tabParam)) {
      return NextResponse.json({ error: 'Invalid or missing tab' }, { status: 400 });
    }

    const db = supabaseServer();
    const { data: boardRow, error: boardErr } = await db
      .from('stats_boards')
      .select('account_id')
      .eq('account_id', auth.accountId)
      .eq('tab', tabParam)
      .maybeSingle();

    if (boardErr) {
      return NextResponse.json({ error: boardErr.message }, { status: 500 });
    }

    if (!boardRow) {
      const cloned = await clonePublicToPersonal(auth.accountId, tabParam);
      return NextResponse.json(rowsToBoard(cloned));
    }

    const { data: rows, error } = await db
      .from('stats_widgets')
      .select('id, metric_id, params, custom_query, x, y, w, h, min_w, min_h, max_h')
      .eq('account_id', auth.accountId)
      .eq('tab', tabParam)
      .order('y', { ascending: true })
      .order('x', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(rowsToBoard((rows || []) as DbWidget[]));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load board';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (auth.error) return auth.error;

    const tabParam = req.nextUrl.searchParams.get('tab');
    if (!isTab(tabParam)) {
      return NextResponse.json({ error: 'Invalid or missing tab' }, { status: 400 });
    }

    const body = boardStateSchema.parse(await req.json());
    const layoutById = new Map(body.layouts.map((l) => [l.i, l]));

    for (const w of body.widgets) {
      if (!layoutById.has(w.id)) {
        return NextResponse.json(
          { error: `Missing layout for widget ${w.id}` },
          { status: 400 },
        );
      }
    }

    const db = supabaseServer();

    const { error: delErr } = await db
      .from('stats_widgets')
      .delete()
      .eq('account_id', auth.accountId)
      .eq('tab', tabParam);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    const inserts = body.widgets.map((w) => {
      const layout = layoutById.get(w.id)!;
      return {
        id: w.id,
        account_id: auth.accountId,
        tab: tabParam,
        metric_id: w.metricId,
        params: w.params || {},
        custom_query: w.customQuery ?? null,
        x: layout.x,
        y: layout.y,
        w: layout.w,
        h: layout.h,
        min_w: layout.minW ?? 2,
        min_h: layout.minH ?? 2,
        max_h: layout.maxH ?? null,
      };
    });

    if (inserts.length > 0) {
      const { error: insertErr } = await db.from('stats_widgets').insert(inserts);
      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }

    const { error: boardErr } = await db.from('stats_boards').upsert({
      account_id: auth.accountId,
      tab: tabParam,
      updated_at: new Date().toISOString(),
    });
    if (boardErr) {
      return NextResponse.json({ error: boardErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...body });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : 'Failed to save board';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
