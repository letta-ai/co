/**
 * Format tool call arguments as Python-style string
 * 
 * Input: { query: "poetry", num_results: 10 }
 * Output: query="poetry", num_results=10
 */
export function formatToolArgs(args: any): string {
  if (!args || typeof args !== 'object') {
    return '';
  }
  
  return Object.entries(args)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`)
    .join(', ');
}

/**
 * Format tool call as Python-style function call
 * 
 * Input: name="web_search", arguments='{"query":"poetry","num_results":10}'
 * Output: web_search(query="poetry", num_results=10)
 */
export function formatToolCall(name: string, argumentsJson: string): string {
  try {
    const argsObj = JSON.parse(argumentsJson);
    const formattedArgs = formatToolArgs(argsObj);
    return `${name}(${formattedArgs})`;
  } catch (e) {
    // If JSON parse fails, wrap the raw string in parens
    return `${name}(${argumentsJson})`;
  }
}
