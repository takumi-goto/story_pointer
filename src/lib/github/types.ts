// GitHub API Response Types

export interface GitHubApiUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface GitHubApiPullRequest {
  id: number;
  number: number;
  html_url: string;
  title: string;
  state: "open" | "closed";
  user: GitHubApiUser;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  merge_commit_sha: string | null;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
}

export interface GitHubApiSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubApiPullRequest[];
}

export interface GitHubApiCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
}
