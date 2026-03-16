import multiprocessing

from workers.analysis.pipeline import analysis_worker


def test_analysis_worker_processes_article_and_forwards_result() -> None:
    input_queue: multiprocessing.Queue = multiprocessing.Queue()
    output_queue: multiprocessing.Queue = multiprocessing.Queue()

    input_queue.put(
        {
            "headline": "China announces major infrastructure stimulus package",
            "description": "The plan is expected to support industrial demand and materials pricing.",
            "source": "Financial Times",
            "severity": "HIGH",
            "event_sentiment": "POSITIVE",
            "market_pressure": "RISK_ON",
            "prediction_horizon": "MEDIUM_TERM",
            "context_meta": {"context_confidence": 0.8},
        }
    )
    input_queue.put(None)

    analysis_worker(input_queue, output_queue)

    event = output_queue.get(timeout=1)
    sentinel = output_queue.get(timeout=1)

    assert event["macro_effect"] == "Fiscal stimulus"
    assert event["affected_assets"][0]["prediction"] == "BULLISH"
    assert sentinel is None