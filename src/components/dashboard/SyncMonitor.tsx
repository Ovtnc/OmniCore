'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronRight, Activity } from 'lucide-react';

type QueueStats = {
  xmlImport: { waiting: number; active: number; completed: number; failed: number };
  marketplaceSync: { waiting: number; active: number; completed: number; failed: number };
};

type JobProgress = {
  total: number;
  processed: number;
  status: string;
};

export function SyncMonitor() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [activeJob, setActiveJob] = useState<JobProgress | null>(null);

  useEffect(() => {
    const fetchData = () => {
      Promise.all([
        fetch('/api/queue/stats').then((r) => r.json()),
        fetch('/api/jobs?limit=5').then((r) => r.json()),
      ]).then(([statsData, jobsData]) => {
        setStats(statsData);
        const jobs = Array.isArray(jobsData) ? jobsData : [];
        const active = jobs.find(
          (j: { status: string; result?: { total?: number; processed?: number } }) =>
            j.status === 'ACTIVE' && j.result?.total != null
        );
        if (active?.result) {
          setActiveJob({
            total: active.result.total ?? 0,
            processed: active.result.processed ?? 0,
            status: active.status,
          });
        } else {
          setActiveJob(null);
        }
      });
    };
    fetchData();
    const t = setInterval(fetchData, 3000);
    return () => clearInterval(t);
  }, []);

  const waiting = (stats?.xmlImport?.waiting ?? 0) + (stats?.marketplaceSync?.waiting ?? 0);
  const active = (stats?.xmlImport?.active ?? 0) + (stats?.marketplaceSync?.active ?? 0);
  const completed = (stats?.xmlImport?.completed ?? 0) + (stats?.marketplaceSync?.completed ?? 0);
  const failed = (stats?.xmlImport?.failed ?? 0) + (stats?.marketplaceSync?.failed ?? 0);
  const total = activeJob ? activeJob.total : waiting + active;
  const done = activeJob ? activeJob.processed : completed;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/40 bg-background/60 p-6 shadow-none ring-1 ring-white/5 backdrop-blur-sm dark:bg-background/40"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span
            className="relative flex h-2 w-2"
            aria-hidden
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
          Canlı Senkronizasyon
        </h3>
        <span className="font-mono text-sm font-medium text-primary">
          %{percentage}
        </span>
      </div>

      <Progress value={percentage} className="h-1.5 rounded-full" />

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center rounded-xl border border-border/40 bg-muted/30 py-3 backdrop-blur-sm">
          <p className="text-xs text-muted-foreground">Bekleyen</p>
          <p className="text-xl font-bold">{waiting + (activeJob ? Math.max(0, activeJob.total - activeJob.processed) : 0)}</p>
        </div>
        <div className="text-center rounded-xl border border-border/40 bg-emerald-500/10 py-3 backdrop-blur-sm">
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Tamamlanan</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{done}</p>
        </div>
        <div className="text-center rounded-xl border border-border/40 bg-destructive/10 py-3 backdrop-blur-sm">
          <p className="text-xs text-destructive">Hatalı</p>
          <p className="text-xl font-bold text-destructive">{failed}</p>
        </div>
      </div>

      <Button variant="ghost" size="sm" className="mt-4 w-full" asChild>
        <Link href="/tools">
          İş detayları <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </motion.div>
  );
}
