import { createAdminClient, editorialGenerator, serviceRpc } from '@/lib/server/deps';
import { cronHandler } from '@/lib/server/cron';
import { logger } from '@/lib/services/log';
import { runNextEditorialJob } from '@/lib/services/editorial';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Processa UM job editorial por execução (pesquisa + rascunho → fila de revisão). */
export const GET = cronHandler('editorial_run', () =>
  runNextEditorialJob({
    rpc: serviceRpc(),
    generator: editorialGenerator(),
    logger,
    today: () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
    listExistingArticles: async () => {
      const { data } = await createAdminClient()
        .from('articles')
        .select('id, title, content_md')
        .in('status', ['in_review', 'approved', 'published'])
        .order('created_at', { ascending: false })
        .limit(300);
      return data ?? [];
    },
  }),
);
