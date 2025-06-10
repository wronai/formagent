export function parseMarkdownSpec(md) {
  const fields = {};
  const lines = md.split('\n');
  for (const line of lines) {
    const match = line.match(/\$\{(\w+?)\}/);
    if (match) {
      const key = match[1];
      let selector = `#${key}`;
      if (key.includes('email')) selector = "input[name='email']";
      if (key.includes('cv')) selector = "input[type='file']";
      fields[selector] = `/data/${key}.pdf`;
    }
  }
  return {
    url: 'https://example.com/form',
    markdown: md,
    fields
  };
}

export default { parseMarkdownSpec };