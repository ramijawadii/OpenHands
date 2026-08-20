"""The stylesheet rewriter must not mistake a text colour for a surface.

These are regressions, not coverage. Each case below shipped as a visible defect
that took a browser to find, because the rewrite happens one indirection away
from the rule that fails.
"""

from openhands.server.routes.cloudguard_seafile_proxy import (
    _decl_is_text,
    _retheme_css,
)


class TestDeclarationClassification:
    def test_plain_text_properties_are_text(self):
        assert _decl_is_text('color')
        assert _decl_is_text('-webkit-text-fill-color')

    def test_surface_properties_are_not_text(self):
        assert not _decl_is_text('background-color')
        assert not _decl_is_text('border-color')

    def test_custom_property_named_color_is_text(self):
        """`--bs-body-color: #212529` is the colour of TEXT.

        Read as a surface it became `var(--id-bg-active)` — the pale fill used
        for a selected row — so every control drawing `color: var(--bs-body-color)`
        rendered near-white text on a white page. The rule at the point of use
        was correct, which is what made it hard to see.
        """
        assert _decl_is_text('--bs-body-color')
        assert _decl_is_text('--bs-emphasis-color')

    def test_custom_property_naming_a_surface_is_not_text(self):
        """`-color` alone cannot decide it: a border ends the same way."""
        assert not _decl_is_text('--bs-border-color')
        assert not _decl_is_text('--bs-body-bg')
        assert not _decl_is_text('--bs-th-bg')
        assert not _decl_is_text('--bs-box-shadow-color')


class TestRetheme:
    def test_body_colour_variable_maps_to_the_text_token(self):
        out = _retheme_css(':root { --bs-body-color: #212529; }')
        assert 'var(--id-text)' in out
        assert 'var(--id-bg-active)' not in out

    def test_background_variable_still_maps_to_a_surface(self):
        out = _retheme_css(':root { --bs-body-bg: #fff; }')
        assert 'var(--id-bg-rail)' in out

    def test_a_dark_background_stays_a_surface(self):
        """A dark FILL is a selected row, not text; it must not become --id-text."""
        out = _retheme_css('.row.selected { background-color: #212529; }')
        assert 'var(--id-bg-active)' in out

    def test_icon_artwork_inside_url_is_untouched(self):
        css = ".i { background: url(\"data:image/svg+xml;utf8,<svg fill='#fff'/>\"); }"
        assert "fill='#fff'" in _retheme_css(css)

    def test_six_digit_hex_is_consumed_whole(self):
        """`{3,8}` matched only the first three chars and corrupted the rest."""
        out = _retheme_css('.a { background-color: #ffffff; }')
        assert 'fff}' not in out.replace(' ', '')
        assert out.count('var(--id-bg-rail)') == 1

    def test_declaration_value_is_not_replaced_by_its_own_colon(self):
        out = _retheme_css('.a { background-color: #fff; }')
        assert '::' not in out
