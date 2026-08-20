"""A signed document link authorises ONE store, not a path in whichever store.

The sandbox and the durable library hold different documents at the same relative
path. If the signature covered only (cid, path, exp), a link minted for one could
be replayed against the other by editing a query parameter — reading a library
document under a sandbox grant, or writing a sandbox edit into the library.
"""

import pytest
from fastapi import HTTPException

from openhands.server.routes.cloudguard_onlyoffice import (
    _callback_sig,
    _file_sig,
    _normalise_store,
    _signed_callback_url,
    _signed_file_url,
)


class TestStoreNormalisation:
    def test_default_is_the_sandbox(self):
        assert _normalise_store(None) == 'sandbox'
        assert _normalise_store('') == 'sandbox'

    def test_known_stores_pass(self):
        assert _normalise_store('artifacts') == 'artifacts'
        assert _normalise_store('  Artifacts ') == 'artifacts'

    def test_unknown_store_is_refused_not_defaulted(self):
        """Defaulting on a typo edits the wrong file under a valid signature."""
        with pytest.raises(HTTPException) as e:
            _normalise_store('artifact')  # note: singular
        assert e.value.status_code == 400


class TestSignatureBindsTheStore:
    def test_file_signature_differs_per_store(self):
        a = _file_sig('c1', 'reports/final.docx', 9999999999, 'sandbox')
        b = _file_sig('c1', 'reports/final.docx', 9999999999, 'artifacts')
        assert a != b

    def test_a_sandbox_link_does_not_verify_against_the_library(self):
        exp = 9999999999
        sandbox_sig = _file_sig('c1', 'reports/final.docx', exp, 'sandbox')
        assert sandbox_sig != _file_sig('c1', 'reports/final.docx', exp, 'artifacts')

    def test_callback_signature_differs_per_store(self):
        assert _callback_sig('c1', 'a.docx', 'sandbox') != _callback_sig(
            'c1', 'a.docx', 'artifacts'
        )

    def test_signed_urls_carry_the_store(self):
        url = _signed_file_url('c1', 'a.docx', 60, 'artifacts')
        assert 'store=artifacts' in url
        cb = _signed_callback_url('c1', 'a.docx', 'artifacts')
        assert 'store=artifacts' in cb

    def test_the_default_signature_is_the_sandbox_one(self):
        """Callers that never pass a store keep their existing behaviour."""
        assert _file_sig('c1', 'a.docx', 5) == _file_sig('c1', 'a.docx', 5, 'sandbox')
        assert _callback_sig('c1', 'a.docx') == _callback_sig('c1', 'a.docx', 'sandbox')
