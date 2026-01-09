import newWBSActivity from "../config/data/newWbsActivityData";

function validateWbsTemplates(wbsList: typeof newWBSActivity) {
  const byBundle = new Map<string, any[]>();

  for (const wbs of wbsList) {
    if (!byBundle.has(wbs.bundleKey)) {
      byBundle.set(wbs.bundleKey, []);
    }
    byBundle.get(wbs.bundleKey)!.push(wbs);
  }

  for (const [bundleKey, wbsItems] of byBundle.entries()) {
    const exec = wbsItems.filter(w => w.discipline === "EXECUTION");
    const check = wbsItems.filter(w => w.discipline === "CHECKING");

    if (exec.length === 0) {
      throw new Error(`❌ Bundle ${bundleKey} has NO EXECUTION WBS`);
    }

    if (check.length !== exec.length) {
      throw new Error(
        `❌ Bundle ${bundleKey} mismatch: EXEC=${exec.length}, CHECK=${check.length}`
      );
    }
  }

  console.log("✅ WBS template validation passed");
}
validateWbsTemplates(newWBSActivity);