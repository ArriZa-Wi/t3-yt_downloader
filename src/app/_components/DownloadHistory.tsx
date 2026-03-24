"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DownloadHistory() {
  const { data: session, status: authStatus } = useSession();
  const [open, setOpen] = useState(false);

  const history = api.downloader.getHistory.useQuery(undefined, {
    enabled: !!session && open,
  });

  return (
    <div className="w-full max-w-2xl">
      <Card className="border-border bg-card shadow-xl">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <span className="text-sm font-semibold text-foreground">
            Download History
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground"
          >
            ▼
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <CardContent className="space-y-3 px-4 pb-4 pt-0">
                {authStatus === "unauthenticated" ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Sign in to see your download history.
                  </p>
                ) : history.isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : !history.data?.length ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No downloads yet.
                  </p>
                ) : (
                  history.data.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3"
                    >
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="h-10 w-16 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded bg-secondary text-xs text-muted-foreground">
                          --
                        </div>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.title ?? "Untitled"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase"
                        >
                          {item.format}
                        </Badge>
                        <Badge
                          variant={item.status === "done" ? "default" : item.status === "error" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
