const { exec } = require("child_process");

exec("node agent/main.js specs/form_acme.md", (err, stdout, stderr) => {
  if (err) {
    console.error("❌ Błąd uruchomienia:", err);
    process.exit(1);
  } else {
    console.log("✅ Test integracyjny OK");
  }
});
