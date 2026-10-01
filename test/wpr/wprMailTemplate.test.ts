import { buildWprEmailHtml } from "../../src/services/mailServices/mailtemplates/wprMailTemplate";

const BASE = {
  projectName: "26-016- Midland Beal Park",
  weekEnding: "10/04/2026",
  fabricatorName: "Cobb Industrial, Inc.",
  filename: "26-016- Midland Beal Park_WPR_Report_2026-10-04.pdf",
};

describe("buildWprEmailHtml — structure matches the other mail templates", () => {
  test("LIVE output (no testBanner) contains no test banner and no recipient list", () => {
    const html = buildWprEmailHtml(BASE); // testBanner omitted — the LIVE call site never builds one
    expect(html).not.toContain("TEST EMAIL");
    expect(html).not.toContain("not sent to clients");
    expect(html).not.toMatch(/<strong>To:<\/strong>/);
    expect(html).not.toMatch(/<strong>CC:<\/strong>/);
  });

  test("INTERNAL output (testBanner present) renders the banner with the real To/CC that LIVE would have used", () => {
    const html = buildWprEmailHtml({
      ...BASE,
      testBanner: { to: ["pm@client.com"], cc: ["admin@wbt.com", "ops@wbt.com"] },
    });
    expect(html).toContain("TEST EMAIL");
    expect(html).toContain("not sent to clients");
    expect(html).toContain("pm@client.com");
    expect(html).toContain("admin@wbt.com");
    expect(html).toContain("ops@wbt.com");
  });

  test("an empty testBanner (edge case: INTERNAL run with somehow-empty lists) still renders, labeled (none)", () => {
    const html = buildWprEmailHtml({ ...BASE, testBanner: { to: [], cc: [] } });
    expect(html).toContain("TEST EMAIL");
    expect(html).toContain("(none)");
  });

  test("escapes special characters in project name, fabricator name, and filename", () => {
    const html = buildWprEmailHtml({
      projectName: `A & B <Steel> "Co"`,
      weekEnding: "10/04/2026",
      fabricatorName: `Cobb & Sons <Industrial>`,
      filename: `A & B Report <final>.pdf`,
    });
    expect(html).not.toContain("A & B <Steel>");
    expect(html).not.toContain("Cobb & Sons <Industrial>");
    expect(html).not.toContain("<final>.pdf");
    expect(html).toContain("A &amp; B &lt;Steel&gt; &quot;Co&quot;");
    expect(html).toContain("Cobb &amp; Sons &lt;Industrial&gt;");
    expect(html).toContain("A &amp; B Report &lt;final&gt;.pdf");
  });

  test("escapes special characters inside the test banner's To/CC lists too", () => {
    const html = buildWprEmailHtml({
      ...BASE,
      testBanner: { to: [`<script>alert(1)</script>@client.com`], cc: [] },
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("the Customer row is present when a fabricator name is given", () => {
    const html = buildWprEmailHtml(BASE);
    expect(html).toContain(">Customer<");
    expect(html).toContain("Cobb Industrial, Inc.");
  });

  test("the Customer row is omitted entirely when no fabricator name is given", () => {
    const html = buildWprEmailHtml({ ...BASE, fabricatorName: undefined });
    expect(html).not.toContain(">Customer<");
  });

  test("Project / Week Ending / Attachment rows are present with the right values", () => {
    const html = buildWprEmailHtml(BASE);
    expect(html).toContain(">Project<");
    expect(html).toContain(">Week Ending<");
    expect(html).toContain(">Attachment<");
    expect(html).toContain("10/04/2026");
    expect(html).toContain("26-016- Midland Beal Park_WPR_Report_2026-10-04.pdf");
  });

  test("the intro line names the project and the week ending date", () => {
    const html = buildWprEmailHtml(BASE);
    expect(html).toContain("Please find attached the Weekly Progress Report for");
    expect(html).toContain("26-016- Midland Beal Park");
    expect(html).toContain("10/04/2026");
  });

  test("matches the other templates' DOCTYPE/MSO/layout structure", () => {
    const html = buildWprEmailHtml(BASE);
    expect(html).toContain('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"');
    expect(html).toContain("urn:schemas-microsoft-com:vml");
    expect(html).toContain("ExternalClass");
    expect(html).toContain('max-width: 600px');
    expect(html).toContain("@media only screen and (max-width: 600px)");
    expect(html).toContain("whiteboardtec-logo");
    expect(html).toContain("Project Name:");
  });

  test("no call-to-action button — no shared deep-link helper exists to reuse, so none is invented", () => {
    const html = buildWprEmailHtml(BASE);
    expect(html).not.toContain("ps.whiteboardtec.com/login?redirect=");
    expect(html).not.toContain("roundrect");
  });

  test("includes the shared footer/signature output", () => {
    const html = buildWprEmailHtml(BASE);
    expect(html).toContain("Whiteboard Technologies Pvt Ltd");
    expect(html).toContain("Project Station");
  });
});
