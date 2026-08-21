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
    railSections();
    fileGlyphs();
    fileColumns();
    markActiveTab();
    bindContextMenu();
    scanMenus();
    foldedTitles();
    recentSection();
    deletedSection();
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
  // File links look like /workspace/lib/<repo>/file/<path>, confirmed in the
  // rendered DOM rather than assumed.
  var FILE_RE = /\/workspace\/lib\/[^/]+\/file\/(.+)$/;
  var REVISIONS_RE = /\/workspace\/repo\/file_revisions\//;

  function onClick(e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;

    // Nothing opens a second browsing context, whatever asked for it.
    if (a.target && a.target !== '_self') a.removeAttribute('target');

    var href = a.getAttribute('href') || '';

    // The context menu's "History" goes to seahub's own revisions page, which is
    // a dead end for anything it cannot render: pick a revision of a .docx there
    // and the answer is "Online view is not applicable to this file format",
    // because that page has no document renderer — it is not a permissions or a
    // data problem, seahub simply cannot draw the format. It also cannot RESTORE
    // a revision, which is the thing the analyst came for.
    //
    // Routed to the console's history panel instead, which reads the same
    // commits and can put a revision back.
    var rev = REVISIONS_RE.exec(href);
    if (rev) {
      var q = href.indexOf('?') >= 0 ? href.slice(href.indexOf('?') + 1) : '';
      var pm = /(?:^|&)p=([^&]*)/.exec(q);
      var target = pm ? decodeURIComponent(pm[1]).replace(/^\//, '') : '';
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        rememberRecent(target);
        parent.postMessage(
          { type: 'id:open-artifact', path: target, view: 'history' }, '*'
        );
        return;
      }
    }

    var m = FILE_RE.exec(href.split('?')[0]);
    if (!m) return;

    var path = decodeURIComponent(m[1]);
    e.preventDefault();
    e.stopPropagation();
    rememberRecent(path);
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


  // ── Rail sections ─────────────────────────────────────────────────────────
  // Seafile ships one heading ("Workspace") above a flat list. The console's
  // rails group their destinations, so the same grouping is applied here by
  // what each entry DOES:
  //
  //   Workspace — the libraries themselves (Seafile's own heading, kept)
  //   Activity  — what has happened (Activities)
  //   Knowledge — written material (Wikis)
  //   Govern    — who may see what (Share Admin)
  //
  // Inserted rather than invented in the markup: if Seafile adds or renames an
  // entry, an unmatched heading simply never appears instead of labelling the
  // wrong rows.
  var RAIL_GROUPS = [
    ['activities', 'Activity'],
    ['wikis', 'Knowledge'],
    ['share-admin', 'Govern'],
  ];

  function railSections() {
    // A heading is placed ONCE per group. Share Admin's own children carry
    // `share-admin` in their href too, so matching per item printed "Govern"
    // three times — above the section and again above each of its sub-entries.
    var placed = {};
    document
      .querySelectorAll('.side-nav .id-rail-heading')
      .forEach(function (h) {
        placed[(h.textContent || '').trim()] = true;
      });

    // TOP-LEVEL rows only. Seafile nests sub-entries in `ul.sub-nav`, and
    // Share Admin's children repeat `share-admin` in their href — matching
    // every .nav-item printed the heading above each of them as well.
    document.querySelectorAll('.side-nav ul.nav-container > .nav-item').forEach(
      function (item) {
        if (item.dataset.idGrouped) return;
        item.dataset.idGrouped = '1';
        var link = item.querySelector('.nav-link');
        if (!link) return;
        var href = (link.getAttribute('href') || '').toLowerCase();
        var text = (link.textContent || '').trim().toLowerCase();
        for (var i = 0; i < RAIL_GROUPS.length; i++) {
          var key = RAIL_GROUPS[i][0];
          var label = RAIL_GROUPS[i][1];
          if (placed[label]) continue;
          if (href.indexOf(key) !== -1 || text.indexOf(key.replace('-', ' ')) !== -1) {
            placed[label] = true;
            var h = document.createElement('div');
            h.className = 'id-rail-heading';
            h.textContent = label;
            item.parentNode.insertBefore(h, item);
            return;
          }
        }
      },
    );
  }


  // ── Quick-create glyphs ───────────────────────────────────────────────────
  // `.big-new-file-button` ships as "+ Markdown", "+ Word" and so on. The file
  // TYPE is the actual choice being made, so it is drawn as a glyph and the "+"
  // — which described the card, not the file — is dropped.
  // The SAME artwork the file rows use, not a drawn substitute.
  //
  // These were lucide outlines. Beside a list showing Seafile's own type icons
  // that meant two different pictures for the same kind of file in one view,
  // which is what makes a product feel assembled rather than designed. The
  // images already ship with the store.
  var FILE_GLYPHS = [
    ['markdown', '/workspace/media/img/file/256/md.png'],
    ['excel', '/workspace/media/img/file/256/excel.png'],
    ['ppt', '/workspace/media/img/file/256/ppt.png'],
    ['word', '/workspace/media/img/file/256/word.png'],
  ];

  function fileGlyphs() {
    document.querySelectorAll('.big-new-file-button').forEach(function (btn) {
      if (btn.dataset.idGlyph) return;
      btn.dataset.idGlyph = '1';
      var label = (btn.textContent || '').trim();
      var lower = label.toLowerCase();
      for (var i = 0; i < FILE_GLYPHS.length; i++) {
        if (lower.indexOf(FILE_GLYPHS[i][0]) !== -1) {
          // Drop the "+" and keep the type as the label.
          btn.textContent = label.replace(/^\s*\+\s*/, '');
          var g = document.createElement('span');
          g.className = 'id-file-glyph';
          g.style.backgroundImage = 'url("' + FILE_GLYPHS[i][1] + '")';
          btn.insertBefore(g, btn.firstChild);
          return;
        }
      }
    });
  }

  // ── Extra file columns ──────────────────────────────────────────────────
  // Seafile's list carries Name, Size and Last Update. An analyst looking at an
  // artifact also wants to know WHAT it is, WHO last touched it, and to reach its
  // history without opening it first.
  //
  // These are injected into the rendered table rather than patched into seahub,
  // for the same reason the rest of this file is injected: Seafile stays stock so
  // an upgrade cannot revert it. React owns this DOM and rebuilds it on every
  // navigation and sort, so every step here is idempotent and re-applied by the
  // observer — a cell is marked and skipped if it is already ours.
  var TYPE_NAMES = {
    md: 'Markdown', markdown: 'Markdown', txt: 'Text', json: 'JSON',
    csv: 'Spreadsheet', xlsx: 'Spreadsheet', xls: 'Spreadsheet', ods: 'Spreadsheet',
    docx: 'Document', doc: 'Document', odt: 'Document', rtf: 'Document',
    pptx: 'Presentation', ppt: 'Presentation', odp: 'Presentation',
    pdf: 'PDF', png: 'Image', jpg: 'Image', jpeg: 'Image', gif: 'Image',
    svg: 'Image', drawio: 'Diagram', ipynb: 'Notebook', py: 'Python',
    yaml: 'YAML', yml: 'YAML', sh: 'Shell', zip: 'Archive', tar: 'Archive',
    gz: 'Archive'
  };

  function typeLabel(name, isDir) {
    if (isDir) return 'Folder';
    var i = (name || '').lastIndexOf('.');
    if (i < 0) return 'File';
    var ext = name.slice(i + 1).toLowerCase();
    return TYPE_NAMES[ext] || (ext ? ext.toUpperCase() : 'File');
  }

  // Author is not in the rendered row; it comes from the directory listing. One
  // request per directory, cached, rather than one per file.
  var authorCache = {};

  function currentDirKey() {
    var m = /\/workspace\/library\/([^/]+)\/[^/]+(\/.*)?$/.exec(location.pathname);
    if (!m) return null;
    var dir = m[2] ? decodeURIComponent(m[2]) : '/';
    return { repo: m[1], dir: dir.replace(/\/$/, '') || '/' };
  }

  function loadAuthors(cb) {
    var key = currentDirKey();
    if (!key) return;
    var id = key.repo + '|' + key.dir;
    if (authorCache[id]) { cb(authorCache[id]); return; }
    var url = '/workspace/api2/repos/' + key.repo + '/dir/?p=' + encodeURIComponent(key.dir);
    fetch(url, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (list) {
        if (!list) return;
        var byName = {};
        list.forEach(function (e) {
          byName[e.name] = e.modifier_name || e.modifier_contact_email || '';
        });
        authorCache[id] = byName;
        cb(byName);
      })
      .catch(function () { /* the column simply stays blank */ });
  }

  // Locate the Size header by its POSITION IN THE ROW, not by a fixed index.
  // Inserting "before children[6]" put the second column before the first,
  // because by then children[6] WAS the first one — so the headers ended up in
  // the opposite order to the cells and every value sat under the wrong title.
  // A wrong number in the right column is worse than no column at all.
  function sizeHeader(head) {
    var kids = head.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].className.indexOf('id-col-') === -1 &&
          (kids[i].textContent || '').trim() === 'Size') {
        return kids[i];
      }
    }
    return null;
  }

  function addHeader(head, label, cls) {
    if (head.querySelector('th.' + cls)) return;
    var th = document.createElement('th');
    th.className = cls;
    th.textContent = label;
    // Always before Size, so repeated calls append in call order rather than
    // reversing each other.
    head.insertBefore(th, sizeHeader(head));
  }

  function fileColumns() {
    var table = document.querySelector('.cur-view-content table');
    if (!table) return;
    var head = table.querySelector('thead tr');
    if (!head || head.children.length < 7) return;

    addHeader(head, 'Type', 'id-col-type');
    addHeader(head, 'Author', 'id-col-author');
    if (!head.querySelector('th.id-col-history')) {
      var th = document.createElement('th');
      th.className = 'id-col-history';
      th.textContent = 'History';
      head.appendChild(th);
    }

    var rows = table.querySelectorAll('tbody tr');
    var names = [];
    rows.forEach(function (row) {
      var link = row.querySelector('td.name a, td.name');
      var name = link ? (link.textContent || '').trim() : '';
      if (!name) return;
      names.push(name);
      var isDir = !!row.querySelector('td .dir-icon img[src*="folder"]');

      var sizeCell = row.querySelector('td.file-size');
      if (!row.querySelector('td.id-col-type')) {
        var t = document.createElement('td');
        t.className = 'id-col-type';
        t.textContent = typeLabel(name, isDir);
        row.insertBefore(t, sizeCell);
      }
      if (!row.querySelector('td.id-col-author')) {
        var a = document.createElement('td');
        a.className = 'id-col-author';
        a.textContent = '';
        row.insertBefore(a, sizeCell);
      }
      if (!row.querySelector('td.id-col-history')) {
        var h = document.createElement('td');
        h.className = 'id-col-history';
        if (!isDir) {
          var btn = document.createElement('i');
          btn.className = 'id-history-icon';
          btn.setAttribute('role', 'button');
          btn.setAttribute('tabindex', '0');
          btn.setAttribute('title', 'Version history');
          btn.setAttribute('aria-label', 'Version history');
          // The console's own history panel, not Seafile's: it is the one that
          // can RESTORE a revision, and it reads the same commits.
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openHistoryModal(rowPath(row));
          });
          h.appendChild(btn);
        }
        row.appendChild(h);
      }
    });

    if (!names.length) return;
    loadAuthors(function (byName) {
      table.querySelectorAll('tbody tr').forEach(function (row) {
        var cell = row.querySelector('td.id-col-author');
        if (!cell || cell.textContent) return;
        var link = row.querySelector('td.name a, td.name');
        var n = link ? (link.textContent || '').trim() : '';
        if (n && byName[n]) cell.textContent = byName[n];
      });
    });
  }

  // ── Nothing opens a second browsing context ─────────────────────────────
  // Stripping target="_blank" from anchors covers only the links that ARE
  // anchors. The wiki cards are `div[role=button]` that call window.open()
  // directly, so they sailed straight past that and put the store in a bare
  // browser tab — outside the console, outside its chrome, and outside the
  // session the analyst is working in.
  //
  // Overriding window.open catches every such caller at once, whichever
  // component it lives in, instead of chasing them one component at a time.
  //
  // It returns a STUB rather than null: callers commonly do
  // `var w = window.open(...); w.focus()`, and null would throw inside Seafile's
  // own code and leave the UI half-navigated.
  function containNewWindows() {
    if (window.__idContained) return;
    window.__idContained = true;
    window.open = function (url) {
      if (url) {
        try {
          location.href = new URL(url, location.href).href;
        } catch (e) {
          location.href = url;
        }
      }
      return {
        focus: function () {},
        blur: function () {},
        close: function () {},
        closed: false,
        document: null,
        location: { href: url || '' }
      };
    };
  }

  // ── Folded rail: keep it legible ────────────────────────────────────────
  // Folded to 44px the rail is icons alone. An icon with no label and no tooltip
  // is a guess, so the label that was hidden becomes the title attribute — the
  // text already exists in the DOM, it was only being hidden.
  function foldedTitles() {
    document.querySelectorAll('.side-nav .nav-link').forEach(function (link) {
      if (link.getAttribute('title')) return;
      var label = link.querySelector('.nav-text, span:not([class*="sf3-font"])');
      var text = label ? (label.textContent || '').trim() : '';
      if (text) link.setAttribute('title', text);
    });
  }

  // ── Recently opened ─────────────────────────────────────────────────────
  // The rail lists places; it did not list WORK. An analyst returning to a
  // conversation is almost always going back to a file they had open a moment
  // ago, and finding it meant walking the tree again.
  //
  // Kept in localStorage rather than on the server: it is a per-person
  // convenience, it must survive a reload, and it is not worth a round trip or a
  // table. Paths only — no content, nothing that outlives the library itself.
  var RECENT_KEY = 'id.recent.files';
  var RECENT_MAX = 8;

  function readRecent() {
    try {
      var raw = localStorage.getItem(RECENT_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Object.prototype.toString.call(list) === '[object Array]' ? list : [];
    } catch (e) {
      return [];
    }
  }

  function rememberRecent(path) {
    if (!path) return;
    try {
      var list = readRecent().filter(function (p) { return p !== path; });
      list.unshift(path);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
    } catch (e) { /* private mode: the section simply stays empty */ }
  }

  // Trash is where deleted work goes, and the rail is where an analyst looks for
  // it. Seafile files it under an "Others" section that we take out of the tab
  // bar, so it moves to the rail under the name it actually has for the person
  // using it.
  function deletedSection() {
    var nav = document.querySelector('.side-nav .side-nav-con, .side-nav ul');
    var key = currentDirKey();
    if (!nav || !key) return;
    if (document.getElementById('id-deleted-item')) return;

    var li = document.createElement('li');
    li.className = 'nav-item';
    li.id = 'id-deleted-item';
    var a = document.createElement('a');
    a.className = 'nav-link';
    a.href = '/workspace/repo/' + key.repo + '/trash/';
    a.setAttribute('title', 'Deleted');
    var icon = document.createElement('span');
    icon.className = 'id-deleted-icon';
    var text = document.createElement('span');
    text.className = 'nav-text';
    text.textContent = 'Deleted';
    a.appendChild(icon);
    a.appendChild(text);
    li.appendChild(a);
    nav.appendChild(li);
  }

  function recentSection() {
    var nav = document.querySelector('.side-nav .side-nav-con, .side-nav ul');
    if (!nav) return;
    var list = readRecent();
    var existing = document.getElementById('id-recent-section');
    if (!list.length) {
      if (existing) existing.remove();
      return;
    }
    if (existing && existing.getAttribute('data-sig') === list.join('|')) return;
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.id = 'id-recent-section';
    wrap.setAttribute('data-sig', list.join('|'));

    var head = document.createElement('h2');
    head.className = 'id-rail-heading';
    head.textContent = 'Recent';
    wrap.appendChild(head);

    var ul = document.createElement('ul');
    ul.className = 'nav nav-pills flex-column';
    list.forEach(function (path) {
      var li = document.createElement('li');
      li.className = 'nav-item';
      var a = document.createElement('a');
      a.className = 'nav-link';
      a.href = '#';
      a.setAttribute('title', path);
      var icon = document.createElement('span');
      icon.className = 'id-recent-icon';
      var text = document.createElement('span');
      text.className = 'nav-text';
      text.textContent = path.split('/').pop();
      a.appendChild(icon);
      a.appendChild(text);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        parent.postMessage({ type: 'id:open-artifact', path: path }, '*');
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    nav.appendChild(wrap);
  }

  // ── Version history ─────────────────────────────────────────────────────
  // Our own dialog, fed by the console's versions API.
  //
  // It used to raise Seafile's Modification History by unfolding the Others
  // section and clicking its "History" entry. That is what made the section bar
  // flicker whenever the history icon was used, and why it opened only
  // sometimes: the entry is rendered lazily, so the click raced the render, and
  // any re-render in between collapsed the section again. Driving another
  // component's rail to open a dialog is a chain of assumptions, and every link
  // was one React change from breaking.
  //
  // It also showed the wrong thing. That dialog is the LIBRARY's history — every
  // change to every file — when what was asked for was the history of the row
  // that was clicked. This one is per file, and its revisions can be RESTORED,
  // which Seafile's cannot.
  function openHistoryModal(path) {
    var existing = document.getElementById('id-hist-modal');
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.id = 'id-hist-modal';
    wrap.className = 'id-perm-backdrop';
    wrap.innerHTML =
      '<div class="id-perm-dialog" role="dialog" aria-modal="true" aria-label="Version history">' +
      '<div class="id-perm-head"><span class="id-perm-title"></span>' +
      '<button type="button" class="id-perm-close" aria-label="Close">\u00d7</button></div>' +
      '<div class="id-perm-body">Loading\u2026</div></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('.id-perm-title').textContent =
      (path || '').split('/').pop() + ' \u2014 version history';
    wrap.querySelector('.id-perm-close').addEventListener('click', function () {
      wrap.remove();
    });
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) wrap.remove();
    });
    loadHistory(wrap, path);
  }

  function loadHistory(wrap, path) {
    var body = wrap.querySelector('.id-perm-body');
    body.textContent = 'Loading\u2026';
    fetch(
      '/api/cloudguard/vfs/versions?conversation_id=' + encodeURIComponent(convId()) +
        '&path=' + encodeURIComponent(path) + '&store=artifacts',
      { credentials: 'same-origin' }
    )
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) {
          body.textContent = 'Could not read this file\u2019s history.';
          return;
        }
        if (!data.versioned) {
          body.textContent = 'This store does not keep per-file history.';
          return;
        }
        if (!data.versions.length) {
          body.textContent = 'No earlier versions of this file.';
          return;
        }
        var html =
          '<table class="id-perm-table id-hist-table"><thead><tr>' +
          '<th>When</th><th>Author</th><th>Size</th><th></th></tr></thead><tbody>';
        data.versions.forEach(function (v) {
          html +=
            '<tr class="' + (v.is_current ? 'id-hist-current' : '') + '">' +
            '<td class="id-hist-when">' + formatWhen(v.created_at) +
            (v.is_current ? ' <span class="id-hist-tag">current</span>' : '') + '</td>' +
            '<td>' + (v.author || '') + '</td>' +
            '<td>' + formatSize(v.size) + '</td>' +
            '<td>' + (v.is_current ? '' :
              '<button type="button" class="id-hist-restore" data-version="' +
              v.id + '">Restore</button>') + '</td></tr>';
        });
        html += '</tbody></table>';
        body.innerHTML = html;
        body.querySelectorAll('.id-hist-restore').forEach(function (btn) {
          btn.addEventListener('click', function () {
            btn.disabled = true;
            btn.textContent = 'Restoring\u2026';
            fetch('/api/cloudguard/vfs/revert-file', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversation_id: convId(),
                path: path,
                version_id: btn.getAttribute('data-version'),
                store: 'artifacts'
              })
            })
              .then(function () { loadHistory(wrap, path); })
              .catch(function () {
                btn.disabled = false;
                btn.textContent = 'Restore';
              });
          });
        });
      })
      .catch(function () {
        body.textContent = 'Could not read this file\u2019s history.';
      });
  }

  function convId() {
    try {
      return (parent && parent.__idConversationId) || '';
    } catch (e) {
      return '';
    }
  }

  function formatWhen(value) {
    if (!value) return '';
    var n = Number(value);
    var d = isFinite(n) && String(value).trim() !== ''
      ? new Date(n > 1e12 ? n : n * 1000)
      : new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }

  function formatSize(bytes) {
    if (!bytes) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = 0;
    var n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
    return (i ? n.toFixed(1) : n) + ' ' + units[i];
  }

  // ── One context menu, everywhere ────────────────────────────────────────
  // Seafile offers a different menu depending on what you clicked: a folder has
  // no Properties and no History, a file gains "More", and both offer "Open via
  // Client". An analyst should not have to learn which item exists where, so one
  // menu is presented for everything, in one order, and entries that do not
  // apply are DISABLED with the reason rather than silently absent — a missing
  // item reads as a bug, a disabled one explains itself.
  //
  // The actions are DELEGATED, not reimplemented: choosing an item opens
  // Seafile's own menu behind the scenes and clicks the real entry, so every
  // dialog, API call and permission check is the one Seafile already performs.
  // Only the three things it has no equivalent for are ours.
  var MENU = [
    { id: 'open', label: 'Open' },
    { id: 'pin', label: 'Pin', native: ['Star', 'Unstar'] },
    { sep: true },
    { id: 'share', label: 'Share', native: ['Share'] },
    { id: 'context', label: 'Add to agent context' },
    { sep: true },
    { id: 'move', label: 'Move', native: ['Move'] },
    { id: 'copy', label: 'Copy', native: ['Copy'] },
    { id: 'duplicate', label: 'Duplicate' },
    { id: 'transfer', label: 'Transfer', native: ['Transfer'] },
    { sep: true },
    { id: 'history', label: 'Version history' },
    { id: 'permission', label: 'Permissions' },
    { id: 'rename', label: 'Rename', native: ['Rename'] },
    { sep: true },
    { id: 'properties', label: 'Properties', native: ['Properties'] }
  ];

  var MENU_ICON = {
    open: "<path d='M15 3h6v6'/><path d='M10 14 21 3'/><path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/>",
    pin: "<path d='M12 17v5'/><path d='M15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1v3.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76z'/>",
    share: "<circle cx='18' cy='5' r='3'/><circle cx='6' cy='12' r='3'/><circle cx='18' cy='19' r='3'/><path d='m8.59 13.51 6.83 3.98'/><path d='m15.41 6.51-6.82 3.98'/>",
    context: "<path d='M12 8V4H8'/><rect width='16' height='12' x='4' y='8' rx='2'/><path d='M2 14h2'/><path d='M20 14h2'/><path d='M15 13v2'/><path d='M9 13v2'/>",
    move: "<path d='M5 9v6'/><path d='m9 5-4 4 4 4'/><path d='M19 9v6'/><path d='m15 19 4-4-4-4'/>",
    copy: "<rect width='14' height='14' x='8' y='8' rx='2'/><path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/>",
    duplicate: "<rect width='12' height='12' x='9' y='9' rx='2'/><path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'/><path d='M15 12v6'/><path d='M12 15h6'/>",
    transfer: "<path d='M16 3h5v5'/><path d='M8 3H3v5'/><path d='M21 3 3 21'/>",
    history: "<path d='M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'/><path d='M3 3v5h5'/><path d='M12 7v5l4 2'/>",
    permission: "<rect width='18' height='11' x='3' y='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/>",
    rename: "<path d='M12 20h9'/><path d='M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'/>",
    properties: "<circle cx='12' cy='12' r='10'/><path d='M12 16v-4'/><path d='M12 8h.01'/>"
  };

  // Seafile's own menu, opened and read WITHOUT being shown. Taking the entries
  // any other way would mean re-deriving which of them are available for this
  // row, which is exactly the duplication this avoids.
  // Seafile's menu is ENHANCED IN PLACE rather than replaced.
  //
  // The first attempt built a menu of our own and delegated each action by
  // opening Seafile's menu behind the scenes and clicking the real entry. That
  // cannot work here: the row's menu button is rendered on HOVER, and a
  // synthetic pointerover does not produce it — only a real pointer does. The
  // same wall as the fold caret. Anything built on synthesising user input
  // against this UI is one React change away from silently doing nothing.
  //
  // So the real menu is reordered, restyled and extended where it stands. Every
  // click stays a real click on the element Seafile rendered, with its own
  // handler, and the analyst still sees one menu in one order everywhere.
  // 'History' is dropped because our own Version history entry replaces it and
// opens the Modification History dialog rather than seahub's revisions page.
var DROP_ITEMS = ['Open via Client', 'More', 'History'];

  // The dropdown is PORTALED out of its row — it renders as a child of a div
  // near the body, not inside the <tr> — so `menu.closest('tr')` finds nothing
  // and the row it belongs to has to be remembered when the toggle is clicked.
  // Reading the DOM upwards looked obvious and was wrong.
  var lastMenuRow = null;
  var pendingMenuAt = null;

  function trackMenuRow(e) {
    var toggle = e.target && e.target.closest
      ? e.target.closest('.sf-dropdown-toggle, .sf3-font-more')
      : null;
    if (!toggle) return;
    var row = toggle.closest('tbody tr');
    if (row && row.querySelector('td.name')) lastMenuRow = row;
    // The observer watches #wrapper, and the dropdown is portaled OUTSIDE it, so
    // opening one produces no mutation the scan would ever see. Enhancing has to
    // be driven from the click that opens it.
    var tries = 0;
    var timer = setInterval(function () {
      var menu = document.querySelector('.dropdown-menu.show');
      if (menu) {
        clearInterval(timer);
        enhanceNativeMenu(menu);
      } else if (++tries > 20) {
        clearInterval(timer);
      }
    }, 25);
  }

  function enhanceNativeMenu(menu) {
    if (!menu || menu.getAttribute('data-id-menu') === '1') return;
    var row = lastMenuRow;
    if (!row || !row.isConnected || !row.querySelector('td.name')) return;
    menu.setAttribute('data-id-menu', '1');
    menu.classList.add('id-ctx-menu', 'id-ctx-native');
    if (pendingMenuAt) {
      placeAtCursor(menu, pendingMenuAt);
      pendingMenuAt = null;
    }

    var byLabel = {};
    var items = [].slice.call(menu.querySelectorAll('.dropdown-item, button'));
    items.forEach(function (el) {
      var text = (el.textContent || '').trim();
      if (DROP_ITEMS.indexOf(text) !== -1) {
        el.style.display = 'none';
        return;
      }
      el.classList.add('id-ctx-item');
      byLabel[text] = el;
    });

    var path = rowPath(row);
    var folder = isFolderRow(row);

    MENU.forEach(function (entry) {
      if (entry.sep) {
        var hr = document.createElement('div');
        hr.className = 'id-ctx-sep';
        menu.appendChild(hr);
        return;
      }
      var el = null;
      if (entry.native) {
        for (var i = 0; i < entry.native.length && !el; i++) {
          el = byLabel[entry.native[i]] || null;
        }
      }
      if (el) {
        // MOVED, not recreated — the node keeps the handler Seafile attached.
        // Only the wording is ours; the state it reflects is still Seafile's, so
        // Star/Unstar becomes Pin/Unpin rather than a fixed label that would lie
        // about whether the item is already pinned.
        if (entry.id === 'pin') {
          relabel(el, /^Unstar$/.test((el.textContent || '').trim()) ? 'Unpin' : 'Pin');
        }
        setIcon(el, entry.id);
        menu.appendChild(el);
        return;
      }
      if (entry.native) {
        // Seafile does not offer this one here. Shown disabled with the reason,
        // because an item that vanishes on some rows reads as a bug.
        menu.appendChild(ownItem(entry, row, path, 'Not available for this item'));
        return;
      }
      menu.appendChild(ownItem(entry, row, path, entry.id === 'history' && folder
        ? 'History is kept per file' : ''));
    });
  }

  function relabel(el, text) {
    for (var i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i].nodeType === 3 && (el.childNodes[i].textContent || '').trim()) {
        el.childNodes[i].textContent = text;
        return;
      }
    }
    el.appendChild(document.createTextNode(text));
  }

  function placeAtCursor(menu, at) {
    menu.style.position = 'fixed';
    menu.style.transform = 'none';
    menu.style.inset = 'auto';
    // Measured after it is placed, so a menu near the edge folds back on screen
    // instead of being clipped by the frame.
    var box = menu.getBoundingClientRect();
    var left = Math.min(at.x, window.innerWidth - box.width - 8);
    var top = Math.min(at.y, window.innerHeight - box.height - 8);
    menu.style.left = Math.max(8, left) + 'px';
    menu.style.top = Math.max(8, top) + 'px';
  }

  function setIcon(el, id) {
    if (!MENU_ICON[id] || el.querySelector('.id-ctx-icon')) return;
    var icon = document.createElement('span');
    icon.className = 'id-ctx-icon';
    icon.style.setProperty(
      '--id-icon',
      'url("data:image/svg+xml;utf8,' +
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' " +
        "stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
        MENU_ICON[id] + '</svg>")'
    );
    el.insertBefore(icon, el.firstChild);
  }

  function ownItem(entry, row, path, reason) {
    var item = document.createElement('button');
    item.type = 'button';
    item.className = 'id-ctx-item';
    setIcon(item, entry.id);
    item.appendChild(document.createTextNode(entry.label));
    if (reason) {
      item.disabled = true;
      item.title = reason;
      return item;
    }
    item.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      runOwnAction(entry, row, path);
    });
    return item;
  }

  function runOwnAction(entry, row, path) {
    if (entry.id === 'open') {
      var link = row.querySelector('td.name a');
      if (link) realClick(link);
      return;
    }
    if (entry.id === 'context') {
      rememberRecent(path);
      parent.postMessage({ type: 'id:add-to-context', path: path }, '*');
      return;
    }
    if (entry.id === 'history') { openHistoryModal(path); return; }
    if (entry.id === 'permission') { openPermissionModal(path); return; }
    if (entry.id === 'duplicate') { duplicate(path); return; }
  }

  function rowPath(row) {
    var link = row.querySelector('td.name a, td.name');
    var name = link ? (link.textContent || '').trim() : '';
    var key = currentDirKey();
    if (!name || !key) return name;
    return key.dir !== '/' ? key.dir.replace(/^\//, '') + '/' + name : name;
  }

  function isFolderRow(row) {
    return !!row.querySelector('td .dir-icon img[src*="folder"]');
  }

  // Seafile has no Duplicate. Copying an item into its OWN directory is one, and
  // the server renames the copy rather than refusing the collision — the same
  // auto-rename that has to be defended against elsewhere is the wanted
  // behaviour here.
  function duplicate(path) {
    var key = currentDirKey();
    if (!key) return;
    var name = path.split('/').pop();
    var body = new FormData();
    body.append('operation', 'copy');
    body.append('dst_repo', key.repo);
    body.append('dst_dir', key.dir);
    body.append('file_names', name);
    fetch(
      '/workspace/api2/repos/' + key.repo + '/fileops/copy/?p=' + encodeURIComponent(key.dir),
      { method: 'POST', credentials: 'same-origin', body: body }
    ).then(function () { location.reload(); });
  }

  // The open section carries no class of its own, so the active tab is marked
  // here. Presentation only: the tab itself is Seafile's real fold control.
  // `el.click()` dispatches a bare click, and several of Seafile's controls
  // react to the POINTER sequence instead — a lone click reaches them and
  // nothing happens. This is what a mouse actually sends.
  function realClick(el) {
    if (!el) return;
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(
      function (type) {
        var Ctor = type.indexOf('pointer') === 0 && window.PointerEvent
          ? window.PointerEvent
          : window.MouseEvent;
        el.dispatchEvent(
          new Ctor(type, { bubbles: true, cancelable: true, view: window })
        );
      }
    );
  }

  function markActiveTab() {
    document.querySelectorAll('.dir-content-nav .tree-section').forEach(function (section) {
      section.classList.toggle('id-tab-active', section.children.length > 1);
    });
  }

  function bindContextMenu() {
    if (window.__idCtxBound) return;
    window.__idCtxBound = true;
    // A right-click opens the row's OWN menu, so both gestures land on the same
    // control rather than on two menus that have to be kept in step.
    document.addEventListener('mousedown', trackMenuRow, true);
    document.addEventListener('click', trackMenuRow, true);
    document.addEventListener('contextmenu', function (e) {
      var row = e.target && e.target.closest ? e.target.closest('tbody tr') : null;
      if (!row || !row.querySelector('td.name')) return;
      var toggle = row.querySelector('.sf-dropdown-toggle, .sf3-font-more');
      if (!toggle) return;  // the button only exists once the row is hovered
      lastMenuRow = row;
      // Seafile anchors the menu to the row's own button, which on a wide table
      // is hundreds of pixels from where the pointer actually is — measured at
      // 406px away. A menu that opens somewhere else is not the menu you asked
      // for, so it is moved to the cursor once it exists.
      pendingMenuAt = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      e.stopPropagation();
      realClick(toggle);
    }, true);
  }

  function scanMenus() {
    document.querySelectorAll('.dropdown-menu.show').forEach(enhanceNativeMenu);
  }

  // ── Permissions ─────────────────────────────────────────────────────────
  // Shows what the ENGINE would allow, for both principals it distinguishes:
  // the human at the console, who is the trusted control plane, and the agent,
  // which is untrusted and bound by the capability manifest, the WORM zones and
  // the mode gate. Those two get materially different answers on the same file
  // and that difference is the point of the panel.
  //
  // The answers come from the policy itself rather than being restated here. A
  // matrix that drifts from the engine is worse than none: it would tell someone
  // an artifact is protected when it is not.
  function openPermissionModal(path) {
    var existing = document.getElementById('id-perm-modal');
    if (existing) existing.remove();

    var wrap = document.createElement('div');
    wrap.id = 'id-perm-modal';
    wrap.className = 'id-perm-backdrop';
    wrap.innerHTML =
      '<div class="id-perm-dialog" role="dialog" aria-modal="true" aria-label="Permissions">' +
      '<div class="id-perm-head"><span class="id-perm-title"></span>' +
      '<button type="button" class="id-perm-close" aria-label="Close">×</button></div>' +
      '<div class="id-perm-body">Loading…</div></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('.id-perm-title').textContent = path.split('/').pop();
    wrap.querySelector('.id-perm-close').addEventListener('click', function () {
      wrap.remove();
    });
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) wrap.remove();
    });

    var cid = (parent && parent.__idConversationId) || '';
    fetch(
      '/api/cloudguard/vfs/permissions?conversation_id=' + encodeURIComponent(cid) +
        '&path=' + encodeURIComponent(path) + '&store=artifacts',
      { credentials: 'same-origin' }
    )
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var body = wrap.querySelector('.id-perm-body');
        if (!data) {
          body.textContent = 'Could not read the permissions for this item.';
          return;
        }
        var actors = [
          { key: 'human', label: 'You (console)' },
          { key: 'agent', label: 'Agent' }
        ];
        var html = '<table class="id-perm-table"><thead><tr><th>Principal</th>';
        data.ops.forEach(function (op) {
          html += '<th>' + op.charAt(0).toUpperCase() + op.slice(1) + '</th>';
        });
        html += '</tr></thead><tbody>';
        var notes = [];
        actors.forEach(function (actor) {
          var row = data.matrix[actor.key] || {};
          html += '<tr><td class="id-perm-actor">' + actor.label + '</td>';
          data.ops.forEach(function (op) {
            var cell = row[op] || {};
            var mark = cell.allow ? 'yes' : (cell.needs_approval ? 'ask' : 'no');
            var glyph = cell.allow ? '✓' : (cell.needs_approval ? '○' : '✗');
            html += '<td class="id-perm-cell id-perm-' + mark + '" title="' +
              (cell.reason || '').replace(/"/g, '') + '">' + glyph + '</td>';
            if (cell.reason) notes.push(actor.label + ' — ' + op + ': ' + cell.reason);
          });
          html += '</tr>';
        });
        html += '</tbody></table>';
        html +=
          '<p class="id-perm-note">✓ allowed · ○ needs approval · ' +
          '✗ refused. Answers come from the policy the engine applies, not ' +
          'from this panel.</p>';
        if (notes.length) {
          html += '<ul class="id-perm-reasons"><li>' + notes.join('</li><li>') + '</li></ul>';
        }
        body.innerHTML = html;
      })
      .catch(function () {
        wrap.querySelector('.id-perm-body').textContent =
          'Could not read the permissions for this item.';
      });
  }

  function run() {
    containNewWindows();
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
