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

  function prune() {
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

  function run() {
    prune();
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
