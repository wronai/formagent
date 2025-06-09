function validateSpec(md) {
  const required = ['first_name', 'last_name', 'email'];
  for (const r of required) {
    if (!md.includes(`\${${r}}`)) {
      throw new Error(`Brak pola ${r} w specyfikacji`);
    }
  }
}

module.exports = { validateSpec };