/**
 * Icon packs for mermaid `architecture-beta`. GENERATED - do not hand-edit.
 *
 * CLOUD PROVIDERS use genuine vendor artwork from @thesvg/icons:
 *   aws (740), azure (628), gcp (214), k8s (38)
 * These are real SVG files with brand colours intact. Nothing is redrawn.
 *
 * The mxGraph stencil conversion they replaced is gone. It had to
 * re-implement mxGraph's paint model - save/restore, fillcolor, fillalpha,
 * fill-rule - and every gap in that emulation showed up as a visual defect:
 * solid silhouettes, filled-in holes, washed-out glyphs. Real SVG has no such
 * failure mode.
 *
 * Remaining stencil packs (cisco, rack, electrical, veeam ...) are kept only
 * where no real-SVG source exists, and carry the same caveat.
 *
 * 10169 icons across 50 packs, each behind a dynamic import.
 */

export const ICON_PACKS = [
  {
    name: "active-directoryx",
    loader: () =>
      import("#/assets/icon-packs/active-directoryx.json").then(
        (m) => m.default,
      ),
  },
  {
    name: "alibabacloud",
    loader: () =>
      import("#/assets/icon-packs/alibabacloud.json").then((m) => m.default),
  },
  {
    name: "allied-telesisx",
    loader: () =>
      import("#/assets/icon-packs/allied-telesisx.json").then((m) => m.default),
  },
  {
    name: "android",
    loader: () =>
      import("#/assets/icon-packs/android.json").then((m) => m.default),
  },
  {
    name: "arrows",
    loader: () =>
      import("#/assets/icon-packs/arrows.json").then((m) => m.default),
  },
  {
    name: "atlassian",
    loader: () =>
      import("#/assets/icon-packs/atlassian.json").then((m) => m.default),
  },
  {
    name: "atlassianx",
    loader: () =>
      import("#/assets/icon-packs/atlassianx.json").then((m) => m.default),
  },
  {
    name: "aws",
    loader: () => import("#/assets/icon-packs/aws.json").then((m) => m.default),
  },
  {
    name: "aws2",
    loader: () =>
      import("#/assets/icon-packs/aws2.json").then((m) => m.default),
  },
  {
    name: "azure",
    loader: () =>
      import("#/assets/icon-packs/azure.json").then((m) => m.default),
  },
  {
    name: "basic",
    loader: () =>
      import("#/assets/icon-packs/basic.json").then((m) => m.default),
  },
  {
    name: "bootstrap",
    loader: () =>
      import("#/assets/icon-packs/bootstrap.json").then((m) => m.default),
  },
  {
    name: "bpmn",
    loader: () =>
      import("#/assets/icon-packs/bpmn.json").then((m) => m.default),
  },
  {
    name: "cabinets",
    loader: () =>
      import("#/assets/icon-packs/cabinets.json").then((m) => m.default),
  },
  {
    name: "cisco",
    loader: () =>
      import("#/assets/icon-packs/cisco.json").then((m) => m.default),
  },
  {
    name: "cisco19",
    loader: () =>
      import("#/assets/icon-packs/cisco19.json").then((m) => m.default),
  },
  {
    name: "ciscosafe",
    loader: () =>
      import("#/assets/icon-packs/ciscosafe.json").then((m) => m.default),
  },
  {
    name: "citrix",
    loader: () =>
      import("#/assets/icon-packs/citrix.json").then((m) => m.default),
  },
  {
    name: "citrix2",
    loader: () =>
      import("#/assets/icon-packs/citrix2.json").then((m) => m.default),
  },
  {
    name: "cumulusx",
    loader: () =>
      import("#/assets/icon-packs/cumulusx.json").then((m) => m.default),
  },
  {
    name: "dynamics365x",
    loader: () =>
      import("#/assets/icon-packs/dynamics365x.json").then((m) => m.default),
  },
  {
    name: "eip",
    loader: () => import("#/assets/icon-packs/eip.json").then((m) => m.default),
  },
  {
    name: "electrical",
    loader: () =>
      import("#/assets/icon-packs/electrical.json").then((m) => m.default),
  },
  {
    name: "floorplan",
    loader: () =>
      import("#/assets/icon-packs/floorplan.json").then((m) => m.default),
  },
  {
    name: "flowchart",
    loader: () =>
      import("#/assets/icon-packs/flowchart.json").then((m) => m.default),
  },
  {
    name: "fluidpower",
    loader: () =>
      import("#/assets/icon-packs/fluidpower.json").then((m) => m.default),
  },
  {
    name: "gcp",
    loader: () => import("#/assets/icon-packs/gcp.json").then((m) => m.default),
  },
  {
    name: "gmdl",
    loader: () =>
      import("#/assets/icon-packs/gmdl.json").then((m) => m.default),
  },
  {
    name: "ibm",
    loader: () => import("#/assets/icon-packs/ibm.json").then((m) => m.default),
  },
  {
    name: "ibmcloud",
    loader: () =>
      import("#/assets/icon-packs/ibmcloud.json").then((m) => m.default),
  },
  {
    name: "ibmx",
    loader: () =>
      import("#/assets/icon-packs/ibmx.json").then((m) => m.default),
  },
  {
    name: "ios7",
    loader: () =>
      import("#/assets/icon-packs/ios7.json").then((m) => m.default),
  },
  {
    name: "k8s",
    loader: () => import("#/assets/icon-packs/k8s.json").then((m) => m.default),
  },
  {
    name: "leanmapping",
    loader: () =>
      import("#/assets/icon-packs/leanmapping.json").then((m) => m.default),
  },
  {
    name: "logos",
    loader: () =>
      import("#/assets/icon-packs/logos.json").then((m) => m.default),
  },
  {
    name: "mockup",
    loader: () =>
      import("#/assets/icon-packs/mockup.json").then((m) => m.default),
  },
  {
    name: "networks",
    loader: () =>
      import("#/assets/icon-packs/networks.json").then((m) => m.default),
  },
  {
    name: "networks2",
    loader: () =>
      import("#/assets/icon-packs/networks2.json").then((m) => m.default),
  },
  {
    name: "office",
    loader: () =>
      import("#/assets/icon-packs/office.json").then((m) => m.default),
  },
  {
    name: "openstack",
    loader: () =>
      import("#/assets/icon-packs/openstack.json").then((m) => m.default),
  },
  {
    name: "pid",
    loader: () => import("#/assets/icon-packs/pid.json").then((m) => m.default),
  },
  {
    name: "rack",
    loader: () =>
      import("#/assets/icon-packs/rack.json").then((m) => m.default),
  },
  {
    name: "salesforce",
    loader: () =>
      import("#/assets/icon-packs/salesforce.json").then((m) => m.default),
  },
  {
    name: "sapx",
    loader: () =>
      import("#/assets/icon-packs/sapx.json").then((m) => m.default),
  },
  {
    name: "signs",
    loader: () =>
      import("#/assets/icon-packs/signs.json").then((m) => m.default),
  },
  {
    name: "sitemap",
    loader: () =>
      import("#/assets/icon-packs/sitemap.json").then((m) => m.default),
  },
  {
    name: "veeam",
    loader: () =>
      import("#/assets/icon-packs/veeam.json").then((m) => m.default),
  },
  {
    name: "vvd",
    loader: () => import("#/assets/icon-packs/vvd.json").then((m) => m.default),
  },
  {
    name: "webicons",
    loader: () =>
      import("#/assets/icon-packs/webicons.json").then((m) => m.default),
  },
  {
    name: "weblogos",
    loader: () =>
      import("#/assets/icon-packs/weblogos.json").then((m) => m.default),
  },
];
