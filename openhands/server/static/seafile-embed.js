/* Inference Defense — embedded artifact store behaviour.
 *
 * The companion to seafile-embed.css, for the things a stylesheet genuinely
 * cannot do:
 *   - remove chrome identified by its TEXT (CSS has no text selector, and the
 *     "Help and resources" heading is a generic h2.heading — verified in
 *     Seafile's own bundle, not guessed);
 *   - set the default view mode, which is stored state rather than styling.
 *
 * Seafile's UI is React and re-renders, so a one-shot pass at load would be
 * undone the moment a route changes. A MutationObserver keeps it applied.
 *
 * Deliberately additive: it hides and defaults, never rewrites Seafile's data.
 */
(function () {
  'use strict';

  // Landing view. Verified keys from the shipped bundle — `grid` is the value
  // Seafile itself writes. Set before first paint so the analyst lands on the
  // file grid rather than a list that flips a moment later.
  try {
    if (!localStorage.getItem('sf_repo_list_view_mode')) {
      localStorage.setItem('sf_repo_list_view_mode', 'grid');
    }
    if (!localStorage.getItem('seafile_view_mode')) {
      localStorage.setItem('seafile_view_mode', 'grid');
    }
  } catch (e) {
    /* storage can be denied in a frame; the view mode is not worth failing over */
  }

  // Sidebar sections that belong to a standalone Seafile, not to the console.
  var DROP_TEXT = ['help and resources', 'help', 'clients', 'about'];

  // The driver's own sidecar. `.vfs/meta.json` is bookkeeping — versions and
  // content hashes the store keeps about itself — and this frame is
  // CLIENT-FACING: it should show the workspace's output, not the machinery
  // that tracks it. Hidden in the UI rather than moved, because the sidecar has
  // to live beside the data it describes to stay portable with the library.
  function hideSidecar() {
    document.querySelectorAll('tr, .grid-item, .dirent-item').forEach(function (row) {
      var name = row.querySelector('.dirent-name, .item-name, a');
      if (name && (name.textContent || '').trim() === '.vfs') {
        row.style.display = 'none';
      }
    });
  }

  function prune() {
    hideSidecar();
    expandSections();
    iconMenus();
    // The heading is text-identified; its following block is the footer.
    var headings = document.querySelectorAll('.side-nav h2, .side-nav .heading');
    headings.forEach(function (h) {
      if (DROP_TEXT.indexOf((h.textContent || '').trim().toLowerCase()) !== -1) {
        h.style.display = 'none';
        var sib = h.nextElementSibling;
        while (sib) {
          sib.style.display = 'none';
          sib = sib.nextElementSibling;
        }
      }
    });

    // Individual nav entries, for the folded sidebar where the heading is absent.
    document.querySelectorAll('.side-nav .nav-item, .side-nav-footer').forEach(function (el) {
      var text = (el.textContent || '').trim().toLowerCase();
      if (DROP_TEXT.indexOf(text) !== -1 || el.classList.contains('side-nav-footer')) {
        el.style.display = 'none';
      }
    });
  }

  // ── Opening a file ────────────────────────────────────────────────────────
  // Artifacts open in the CONSOLE's viewers — the same markdown, mermaid,
  // document and sheet viewers the rest of the product uses — not in the
  // store's own previewer and never in a new browser tab. A file that opens in
  // a standalone tab has left the console: no drawer, no conversation context,
  // and nothing tying it back to the run that produced it.
  //
  // File links look like /seafile/lib/<repo>/file/<path>, confirmed in the
  // rendered DOM rather than assumed.
  var FILE_RE = /\/seafile\/lib\/[^/]+\/file\/(.+)$/;

  function onClick(e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;

    // Nothing opens a second browsing context, whatever asked for it.
    if (a.target && a.target !== '_self') a.removeAttribute('target');

    var href = a.getAttribute('href') || '';
    var m = FILE_RE.exec(href.split('?')[0]);
    if (!m) return;

    var path = decodeURIComponent(m[1]);
    e.preventDefault();
    e.stopPropagation();
    parent.postMessage({ type: 'id:open-artifact', path: path }, '*');
  }

  // Capture phase: Seafile binds its own handlers on these rows, and a listener
  // on the bubble phase would run after it had already navigated.
  function bindOpen() {
    document.addEventListener('click', onClick, true);
    // Some rows are rendered with target=_blank before any click happens.
    document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
      a.removeAttribute('target');
    });
  }

  // Tree sections land EXPANDED. Collapsed, the rail shows headings with an
  // arrow and nothing under them, so the first thing an analyst does is open
  // each one — and the sideways caret above empty space reads as a rendering
  // fault rather than a control.
  function expandSections() {
    document.querySelectorAll('.tree-section .rotate-90, .side-nav .rotate-90').forEach(
      function (caret) {
        var header = caret.closest('.tree-section-header, .nav-item, .sf-heading');
        if (header && !header.dataset.idExpanded) {
          header.dataset.idExpanded = '1';
          caret.click();
        }
      },
    );
  }


  // ── Menu icons ────────────────────────────────────────────────────────────
  // Every menu row gets a leading glyph, the way a desktop file manager does:
  // an icon is faster to find than a word, and a menu of bare text in a product
  // whose every other surface is iconified looks unfinished.
  //
  // Matched on the item's TEXT because Seafile does not class its menu rows by
  // action. Keyed on the longest phrases first so "New Folder" is not caught by
  // the rule for "New File".
  var L = 'data:image/svg+xml;utf8,';
  var SVG = function (d) {
    return (
      L +
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' " +
      "stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
      d +
      '</svg>'
    );
  };
  var MENU_ICONS = [
    ['new folder', SVG("<path d='M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'/><path d='M12 10v6'/><path d='M9 13h6'/>")],
    ['new file', SVG("<path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'/><path d='M14 2v5h5'/><path d='M12 11v6'/><path d='M9 14h6'/>")],
    ['markdown', SVG("<rect width='20' height='16' x='2' y='4' rx='2'/><path d='m7 15 0-6 2.5 3L12 9v6'/><path d='M17 9v6'/><path d='m19.5 12.5-2.5 2.5-2.5-2.5'/>")],
    ['excel', SVG("<path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'/><path d='M14 2v5h5'/><path d='m9 13 6 5'/><path d='m15 13-6 5'/>")],
    ['powerpoint', SVG("<path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'/><path d='M14 2v5h5'/><path d='M9 12h4a2 2 0 0 1 0 4H9v-4Z'/>")],
    ['word', SVG("<path d='M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'/><path d='M14 2v5h5'/><path d='m8 13 1.5 4 1.5-4 1.5 4L14 13'/>")],
    ['rename', SVG("<path d='M12 20h9'/><path d='M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'/>")],
    ['delete', SVG("<path d='M3 6h18'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'/><path d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>")],
    ['download', SVG("<path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/><path d='m7 10 5 5 5-5'/><path d='M12 15V3'/>")],
    ['history', SVG("<path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'/><path d='M3 3v5h5'/><path d='M12 7v5l4 2'/>")],
    ['copy', SVG("<rect width='14' height='14' x='8' y='8' rx='2'/><path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/>")],
    ['move', SVG("<path d='M5 9l-3 3 3 3'/><path d='M9 5l3-3 3 3'/><path d='M15 19l-3 3-3-3'/><path d='M19 9l3 3-3 3'/><path d='M2 12h20'/><path d='M12 2v20'/>")],
    ['view', SVG("<path d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z'/><circle cx='12' cy='12' r='3'/>")],
    ['sort', SVG("<path d='m3 16 4 4 4-4'/><path d='M7 20V4'/><path d='m21 8-4-4-4 4'/><path d='M17 4v16'/>")],
    ['tag', SVG("<path d='M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z'/><circle cx='7.5' cy='7.5' r='.5'/>")],
    ['settings', SVG("<circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z'/>")],
    ['trash', SVG("<path d='M3 6h18'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'/>")],
    ['open', SVG("<path d='M15 3h6v6'/><path d='M10 14 21 3'/><path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/>")],
  ];

  function iconMenus() {
    document.querySelectorAll('.dropdown-item, .dropdown-menu-item, .context-menu-item').forEach(
      function (item) {
        if (item.dataset.idIcon) return;
        item.dataset.idIcon = '1';
        var text = (item.textContent || '').trim().toLowerCase();
        for (var i = 0; i < MENU_ICONS.length; i++) {
          if (text.indexOf(MENU_ICONS[i][0]) !== -1) {
            var glyph = document.createElement('span');
            glyph.className = 'id-menu-icon';
            glyph.style.setProperty('--id-icon', 'url("' + MENU_ICONS[i][1] + '")');
            item.insertBefore(glyph, item.firstChild);
            return;
          }
        }
      },
    );
  }

  function run() {
    prune();
    bindOpen();
    expandSections();
    var target = document.getElementById('wrapper') || document.body;
    if (!target) return;
    // React re-renders on every navigation, so re-apply rather than assuming
    // one pass at load is enough.
    new MutationObserver(prune).observe(target, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
