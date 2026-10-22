export type AIModel = {
  provider: string;
  model: string;
  roles: string[];
  approved: boolean;
  tier: number;
  input_rub_per_million: string;
  output_rub_per_million: string;
  max_input_tokens: number;
  max_output_tokens: number;
  context_window: number;
  json_mode: boolean;
  independent_review: boolean;
  vision: boolean;
  extra_body: Record<string, unknown>;
};
export type AICheck = { status: string; checked_at: string; models: string[] };
export type AIProvider = {
  id: string;
  name: string;
  base_url: string;
  local: boolean;
  enabled: boolean;
  timeout_seconds: number;
  project: string;
  has_key: boolean;
  available: boolean;
  credential_source: string;
  managed: boolean;
  last_check: AICheck | null;
};
export type AIPreset = Pick<AIProvider, 'id' | 'name' | 'base_url' | 'local'> & {
  purpose: string;
  docs: string;
};
export type AIPolicy = {
  mode: string;
  local_only: boolean;
  min_samples: number;
  min_pass_rate: number;
};
export type AIOverview = {
  revision: number;
  providers: AIProvider[];
  models: AIModel[];
  policy: AIPolicy;
  catalog: AIPreset[];
  roles: Record<string, string>;
  local_endpoints: string[];
  cache_ttl_seconds: number;
  reload_seconds: number;
  stats_truncated: boolean;
  stats: Record<
    string,
    {
      calls: number;
      errors: number;
      cached_tokens: number;
      input_tokens: number;
      output_tokens: number;
      estimated_rub: string | null;
    }
  >;
};
