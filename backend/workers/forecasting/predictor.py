### THIS IS ONLY PLACEHOLDER, WE STILL HAVE TO MAKE THE ACTUAL ANALYSIS THINGE ###
### THIS PRINTS THE FEEDS FROM THE RSS FETCHER ###

import multiprocessing

def analyze_data(queue):
    while True:
        if not queue.empty():
            data = queue.get()
            print("Analyzing data:", data)

if __name__ == "__main__":
    print("Starting analysis worker...")
    queue = multiprocessing.Queue()
    process = multiprocessing.Process(target=analyze_data, args=(queue,))
    process.start()
    try:
        while True:
            pass  # Keep the script running
    except (KeyboardInterrupt, SystemExit):
        process.terminate()