import os
import sys
import unittest

# Set python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.routes.labs import _fetch_arxiv_metadata, _arxiv_cache

class TestArxivReliability(unittest.TestCase):
    def setUp(self):
        # Clear cache before tests
        _arxiv_cache.clear()

    def test_valid_paper(self):
        print("Testing valid arXiv paper retrieval (ID: 2103.00020)...")
        metadata = _fetch_arxiv_metadata("2103.00020")
        self.assertIsNotNone(metadata)
        self.assertIn("title", metadata)
        self.assertIn("abstract", metadata)
        self.assertIn("authors", metadata)
        self.assertIn("categories", metadata)
        self.assertIn("publication_date", metadata)
        self.assertEqual(metadata["id"], "2103.00020")
        print(f"[SUCCESS] Valid Paper Title: {metadata['title']}")
        print(f"[SUCCESS] Categories: {metadata['categories']}")
        print(f"[SUCCESS] Publication Date: {metadata['publication_date']}")

    def test_caching_performance(self):
        print("\nTesting caching performance...")
        # First query (uncached)
        import time
        start_uncached = time.time()
        metadata_1 = _fetch_arxiv_metadata("1706.03762") # Attention Is All You Need
        duration_uncached = time.time() - start_uncached
        
        # Second query (cached)
        start_cached = time.time()
        metadata_2 = _fetch_arxiv_metadata("1706.03762")
        duration_cached = time.time() - start_cached
        
        self.assertIsNotNone(metadata_1)
        self.assertEqual(metadata_1["title"], metadata_2["title"])
        print(f"[SUCCESS] First Query Time: {duration_uncached:.4f}s")
        print(f"[SUCCESS] Second (Cached) Query Time: {duration_cached:.4f}s")
        self.assertLess(duration_cached, 0.01) # Cached should be instantaneous (<10ms)

    def test_invalid_paper(self):
        print("\nTesting invalid arXiv paper ID handling...")
        metadata = _fetch_arxiv_metadata("invalid_id_format_9999")
        self.assertIsNone(metadata)
        print("[SUCCESS] Invalid ID returned None as expected.")

    def test_empty_query_failure(self):
        print("\nTesting empty query handling...")
        metadata = _fetch_arxiv_metadata("")
        self.assertIsNone(metadata)
        print("[SUCCESS] Empty ID returned None as expected.")

if __name__ == "__main__":
    unittest.main()
