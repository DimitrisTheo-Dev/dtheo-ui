export interface Finding {
  rule: string;
  severity: 'error' | 'warning';
  line: number;
  column: number;
  message: string;
  fix: string;
  excerpt: string;
}

export function checkSource(source: string, options?: { file?: string }): Finding[];

export const ruleList: Array<{ id: string; severity: 'error' | 'warning'; message: string; fix: string }>;
