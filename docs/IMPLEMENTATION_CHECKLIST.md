# SiteMind — Implementation Checklist

## Module 1: Web Crawler & Scraper
- ☑ Set up Python crawl microservice architecture (Flask app & task runner)
- ☑ Implement URL discovery engine with sitemap parsing and BFS web crawling
- ☑ Implement domain boundary enforcement and URL normalization
- ☑ Integrate `robots.txt` compliance parser and crawl politeness checks
- ☑ Build asynchronous HTML page fetcher with rate limiting and timeout management
- ☑ Create database schema & queries for `crawl_jobs` and `crawl_logs` tracking
- ☑ Implement backend crawl triggering service & REST API endpoints (`POST /api/websites/:id/crawl`)
- ☑ Build UI components (`StartCrawlCard` & `CrawlStatusPanel`) for real-time crawl monitoring

## Module 2: Content Extraction & Cleaning
- ☑ Integrate Trafilatura & BeautifulSoup HTML parser for clean text extraction
- ☑ Implement automated boilerplate removal (scripts, styles, headers, footers, navs)
- ☑ Implement HTML title and page metadata extraction
- ☑ Add content threshold validation (`MIN_TEXT_LENGTH`) and MD5 content hashing for change detection
- ☑ Create database schema & storage layer for scraped web pages (`pages` table)
- ☑ Implement real-time crawl logging for page extraction statuses

## Module 3: Knowledge Base Generation
- ☑ Step 0: Checklist file created
- ☑ Step 1: pgvector extension and document_chunks table set up
- ☑ Step 2: Python embedding microservice running
- ☑ Step 3: Node.js HTTP client for embedding service built
- ☑ Step 4: LangChain RecursiveCharacterTextSplitter integrated
- ☑ Step 5: Chunk storage function written
- ☑ Step 6: Module 3 pipeline wired end-to-end
- ☑ Step 7: Smoke test passes
