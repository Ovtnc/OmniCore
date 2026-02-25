'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileCode2, Loader2, CheckCircle2, Clock, XCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const JOB_TYPE_LABEL: Record<string, string> = {
  XML_GENERATE: 'XML Import',
  MARKETPLACE_SYNC_PRODUCT: 'Pazaryeri sync',
};

type Job = {
  id: string;
  type: string;
  status: string;
  result?: { total?: number; processed?: number; queued?: number };
  store: { name: string };
  createdAt: string;
};

type QueueStats = {
  xmlImport: { waiting: number; active: number; completed: number; failed: number };
  marketplaceSync: { waiting: number; active: number; completed: number; failed: number };
};

function formatTime(s: string) {
  return new Date(s).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ImportQueueStatus() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      Promise.all([fetch('/api/jobs?limit=5').then((r) => r.json()), fetch('/api/queue/stats').then((r) => r.json())])
        .then(([jobsData, statsData]) => {
          setJobs(Array.isArray(jobsData) ? jobsData : []);
          setQueueStats(statsData);
        })
        .catch(() => {
          setJobs([]);
          setQueueStats(null);
        })
        .finally(() => setLoading(false));
    };
    fetchData();
    const t = setInterval(fetchData, 5000);
    return () => clearInterval(t);
  }, []);

  if (loading && jobs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Import & Kuyruk</CardTitle>
          <CardDescription>Yükleniyor…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasActive = jobs.some((j) => j.status === 'ACTIVE' || j.status === 'PENDING');
  const xmlWaiting = queueStats?.xmlImport?.waiting ?? 0;
  const marketplaceWaiting = queueStats?.marketplaceSync?.waiting ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-primary" />
            Import & Kuyruk
          </CardTitle>
          <CardDescription>
            XML import ve pazaryeri sync durumu. {hasActive && 'İşlem devam ediyor…'}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tools">
            Tümü <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {queueStats && (xmlWaiting > 0 || marketplaceWaiting > 0) && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium text-foreground mb-1">Kuyruk</p>
            <div className="flex flex-wrap gap-3 text-muted-foreground">
              <span>XML Import: {xmlWaiting} bekleyen</span>
              <span>Pazaryeri sync: {marketplaceWaiting} bekleyen</span>
            </div>
          </div>
        )}

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Son iş yok.</p>
        ) : (
          <div className="space-y-3">
            {jobs.slice(0, 3).map((job) => {
              const total = job.result?.total ?? 0;
              const processed = job.result?.processed ?? 0;
              const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
              const isActive = job.status === 'ACTIVE';
              const isPending = job.status === 'PENDING';
              const isCompleted = job.status === 'COMPLETED';
              const isFailed = job.status === 'FAILED';

              return (
                <div
                  key={job.id}
                  className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-medium text-sm truncate">
                      {JOB_TYPE_LABEL[job.type] ?? job.type}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
                      {isPending && <Clock className="h-3 w-3" />}
                      {isCompleted && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                      {isFailed && <XCircle className="h-3 w-3 text-destructive" />}
                      {job.store.name} · {formatTime(job.createdAt)}
                    </span>
                  </div>
                  {(isActive || isPending) && total > 0 && (
                    <div className="space-y-1">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {processed} / {total} ürün
                      </p>
                    </div>
                  )}
                  {isCompleted && job.result && (
                    <p className="text-xs text-muted-foreground">
                      {job.result.queued != null && `${job.result.queued} kuyruğa atıldı`}
                      {job.result.processed != null && ` · ${job.result.processed} işlendi`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
