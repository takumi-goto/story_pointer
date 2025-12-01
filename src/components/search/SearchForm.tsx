"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface SearchFormProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-4">
      <div className="flex-1">
        <Input
          placeholder="チケットキー (KT-6019)、URL、またはキーワードで検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" isLoading={isLoading} disabled={!query.trim()}>
        {isLoading ? "検索中..." : "検索"}
      </Button>
    </form>
  );
}
