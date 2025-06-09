const { expect } = require("chai");
const { parseMarkdownSpec } = require("../agent/parser");

describe("Markdown Parser", () => {
  it("parsuje poprawnie specyfikację pól", () => {
    const md = `
## Formularz testowy
- Imię: ${first_name}
- Email: ${email}
`;

    const result = parseMarkdownSpec(md, {
      first_name: "Anna",
      email: "anna@example.com",
    });

    expect(result).to.deep.equal({
      "first_name": "Anna",
      "email": "anna@example.com",
    });
  });
});
