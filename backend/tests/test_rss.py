### rss test script delete later ###

import multiprocessing
from workers.rssfetch import read_rss_feeds
from analysis import analyze_data

def start_rss_reader(queue):
    print("Starting RSS feed reader...")
    read_rss_feeds(queue)

def start_analysis_worker(queue):
    print("Starting analysis worker...")
    analyze_data(queue)

if __name__ == "__main__":
    queue = multiprocessing.Queue()

    rss_process = multiprocessing.Process(target=start_rss_reader, args=(queue,))
    analysis_process = multiprocessing.Process(target=start_analysis_worker, args=(queue,))

    rss_process.start()
    analysis_process.start()

    try:
        rss_process.join()
        analysis_process.join()
    except (KeyboardInterrupt, SystemExit):
        rss_process.terminate()
        analysis_process.terminate()