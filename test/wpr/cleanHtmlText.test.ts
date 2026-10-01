import { cleanHtmlText, extractText } from "../../src/modules/wpr/wpr.transform";

describe("cleanHtmlText — pure-string port of the FE's DOMParser-based cleaner", () => {
  test("falsy input returns empty string", () => {
    expect(cleanHtmlText("")).toBe("");
    expect(cleanHtmlText(null)).toBe("");
    expect(cleanHtmlText(undefined)).toBe("");
  });

  test("plain text with no markup passes through trimmed", () => {
    expect(cleanHtmlText("  Confirmed base plate thickness.  ")).toBe("Confirmed base plate thickness.");
  });

  test("<br> becomes a newline", () => {
    expect(cleanHtmlText("Line one<br>Line two<br/>Line three")).toBe("Line one\nLine two\nLine three");
  });

  test("closing p/div/li become newlines and <li> becomes a bullet", () => {
    const html = "<p>First item</p><div>Second item</div><ul><li>Bulleted</li></ul>";
    expect(cleanHtmlText(html)).toBe("First item\nSecond item\n• Bulleted");
  });

  test("&nbsp; becomes a real space", () => {
    expect(cleanHtmlText("Qty:&nbsp;12&nbsp;pcs")).toBe("Qty: 12 pcs");
  });

  test("remaining tags are stripped", () => {
    expect(cleanHtmlText("<span class=\"x\"><strong>Approved</strong></span>")).toBe("Approved");
  });

  test("common HTML entities are decoded", () => {
    expect(cleanHtmlText("Tolerance &lt; 1/16&quot; &amp; verified")).toBe('Tolerance < 1/16" & verified');
  });

  test("3+ consecutive newlines collapse to 2", () => {
    const html = "A<br><br><br><br>B";
    expect(cleanHtmlText(html)).toBe("A\n\nB");
  });

  test("realistic RFI/notes fixture end to end", () => {
    const html =
      "<p>Revised bolt pattern per structural comment&nbsp;#3.</p>" +
      "<ul><li>Base plate: 3/4&quot; A36</li><li>Anchor bolts: 4x 1&quot; dia</li></ul>" +
      "<div>Awaiting EOR sign-off &amp; resubmittal.</div>";
    expect(cleanHtmlText(html)).toBe(
      'Revised bolt pattern per structural comment #3.\n• Base plate: 3/4" A36\n• Anchor bolts: 4x 1" dia\nAwaiting EOR sign-off & resubmittal.'
    );
  });
});

describe("extractText — RFI response tag-strip (verbatim FE regex, no entity decoding)", () => {
  test("prefers reason over description", () => {
    expect(extractText({ reason: "Reason text", description: "Description text" })).toBe("Reason text");
  });

  test("falls back to description when reason is absent", () => {
    expect(extractText({ description: "<p>Only description</p>" })).toBe("Only description");
  });

  test("strips tags but does NOT decode entities (matches the FE exactly)", () => {
    expect(extractText({ reason: "Qty:&nbsp;<b>12</b>" })).toBe("Qty:&nbsp;12");
  });

  test("returns empty string for a response with neither field", () => {
    expect(extractText({})).toBe("");
  });
});
