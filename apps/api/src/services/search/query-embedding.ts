export function buildDeterministicQueryEmbedding(queryTokens: string[]): number[] {
  return queryTokens.map((token, index) => token.length + index);
}
