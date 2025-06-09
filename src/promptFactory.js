function createFormMappingPrompt(html, markdown) {
  return `
Given this HTML form:

${html}

And this form specification:

${markdown}

Return JSON mapping of CSS selectors to values.
`;
}
