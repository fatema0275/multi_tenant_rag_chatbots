import asyncio
import time
from main import split_sentences, _eval_single_nli, nli_batch, NLIBatchRequest

def test_sent_tokenize():
    text = "Dr. Smith arrived at Jan. 1 at 5 p.m. He was very happy."
    sentences = split_sentences(text)
    print("Split sentences:", sentences)
    assert len(sentences) == 2, f"Expected 2 sentences, got {len(sentences)}"
    assert sentences[0] == "Dr. Smith arrived at Jan. 1 at 5 p.m."
    print("✅ sent_tokenize abbreviation handling confirmed!")

async def test_nli_batch_parallel():
    premise = "SiteMind is a multi-tenant RAG platform that runs on PostgreSQL and Supabase."
    hypotheses = [
        "SiteMind is a multi-tenant RAG platform.",
        "SiteMind supports PostgreSQL database.",
        "SiteMind is written entirely in Assembly language."
    ]

    req = NLIBatchRequest(premise=premise, hypotheses=hypotheses)
    
    start_time = time.time()
    resp = await nli_batch(req)
    duration = time.time() - start_time
    
    print(f"Parallel NLI batch processed in {duration:.4f}s")
    print("Results:", resp)
    
    assert len(resp.results) == 3
    assert resp.results[0].label == "entailment"
    assert resp.results[1].label == "entailment"
    assert resp.results[2].label == "contradiction"
    assert resp.verdict == "unsupported" # Because sentence 3 is contradiction
    print("✅ Parallel NLI batch test passed successfully!")

async def main():
    test_sent_tokenize()
    await test_nli_batch_parallel()
    print("✅ ALL PART 2 PYTHON MICROSERVICE TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(main())
