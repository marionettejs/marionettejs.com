export function diagnosticExamples(markdown) {
  return Object.fromEntries([...markdown.matchAll(/^### (MN\d{4}):[^\n]*\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm)]
    .map(([, code, body]) => [code, body.trim()]));
}
