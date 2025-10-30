// LeadProton AI utility stubs
// These can be wired to real providers later.

export function generateEmailPatterns(firstName: string, lastName: string, domain: string): string[] {
  const f = firstName.toLowerCase();
  const l = lastName.toLowerCase();
  const d = domain.toLowerCase();
  return [
    `${f}.${l}@${d}`,
    `${f}${l}@${d}`,
    `${f[0]}${l}@${d}`,
    `${f}${l[0]}@${d}`,
    `${l}${f[0]}@${d}`,
  ];
}

export function scoreLead(input: { firstName?: string; lastName?: string; companyName?: string; role?: string }): number {
  // Simple deterministic score for now
  let score = 50;
  if (input.role) score += 10;
  if (input.companyName && input.companyName.length > 3) score += 10;
  if (input.firstName && input.lastName) score += 10;
  return Math.max(0, Math.min(100, score));
}

export function companySummary(domain: string): string {
  return `Summary for ${domain}\n- Industry: Unknown (sample)\n- Description: Placeholder from LeadProton AI\n- HQ: N/A`;
}

