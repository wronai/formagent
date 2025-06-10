export function validateSpec(md) {
  console.log('Validating markdown:', md);
  const required = ['first_name', 'last_name', 'email'];
  for (const r of required) {
    console.log(`Checking for field: ${r}`);
    console.log(`Contains \${${r}}?`, md.includes(`\${${r}}`));
    console.log(`Contains ${r}?`, md.includes(`${r}`));
    if (!md.includes(`\${${r}}`) && !md.includes(`${r}`)) {
      throw new Error(`Brak pola ${r} w specyfikacji`);
    }
  }
}

export default { validateSpec };