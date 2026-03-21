"use client";

import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

interface UrlInputProps {
  onFetch: (url: string) => void;
  isLoading: boolean;
}

export function UrlInput({ onFetch, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (url.trim()) onFetch(url.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="url"
        placeholder="https://youtube.com/watch?v=..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground flex-1 transition-shadow duration-200 focus:animate-input-glow focus:ring-1 focus:ring-primary/60 focus:outline-none"
        disabled={isLoading}
      />
      <Button
        type="submit"
        disabled={isLoading || !url.trim()}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {isLoading ? "Fetching..." : "Fetch"}
      </Button>
    </form>
  );
}
