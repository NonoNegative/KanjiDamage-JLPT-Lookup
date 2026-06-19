# KanjiDamage JLPT Lookup

A dictionary lookup application for Kanji combining JLPT levels, frequency, stroke count, and details from KanjiDamage.

## Data Sources

The lookup database (`kanjidamage_lookup.json`) is generated from the following source files:

1. **`inputs/kanji_jlpt.json`**: Obtained as `kanji_jlpt_only.json` from the [jlpt_kanji_json_msgpack](https://github.com/Renairisu/jlpt_kanji_json_msgpack) repository. It contains stroke counts, JLPT levels, frequency metrics (based on the Mainichi Shinbun), and meanings.
2. **`inputs/kanjidamage_listing.html`**: Obtained by saving the Kanji list page at [KanjiDamage](https://www.kanjidamage.com/kanji/) as HTML and stripping the header and footer, retaining primarily the core Kanji listing table.

## How it Works

The project consists of three main components: a build pipeline, a custom local server proxy, and a frontend interface.

### 1. Build Pipeline

The database build script, `build_lookup.py`, parses the source files and compiles them into a unified JSON lookup database:
- It processes the local HTML listing of KanjiDamage to extract mappings of Kanji to their respective KanjiDamage numerical IDs and English meanings.
- It parses the JLPT and frequency database.
- It merges the two datasets: using the JLPT, stroke count, and frequency data from the JSON file, while overriding English meanings and mapping KanjiDamage IDs from the HTML listing where matches exist.
- The results are written to `kanjidamage_lookup.json`.

### 2. Local Server Proxy

Browsers restrict loading pages in an iframe if the target server sends an `X-Frame-Options` header. Since `kanjidamage.com` prevents cross-origin framing, `server.py` implements a custom local proxy:
- The local server handles standard frontend static files (`index.html`, `style.css`, `script.js`, `kanjidamage_lookup.json`).
- Any page requests directed to Kanji (e.g., `/kanji/<id>`) are intercepted and fetched transparently from `https://www.kanjidamage.com/kanji/<id>`.
- The server strips the `X-Frame-Options` and connection-related headers before passing the response back to the client.
- The server injects a custom `<style>` block into the HTML header of the proxied page to hide the KanjiDamage navigation bar (`.navbar.fixed-top`), providing an integrated presentation.

### 3. Frontend Interface

The frontend (`index.html`, `style.css`, `script.js`) loads the generated JSON database to display a list of Kanji.
- Users can filter Kanji by JLPT level (N5 to N1).
- Kanji can be sorted by frequency or stroke count.
- Selecting a Kanji updates the integrated iframe, loading the proxied KanjiDamage page for that Kanji.

## Getting Started

### Prerequisites

- Python 3.x
- `beautifulsoup4` (only required if rebuilding the database)

### Installation

Install the required Python dependency for database generation:

```bash
pip install -r requirements.txt
```

### Building the Database

To rebuild the `kanjidamage_lookup.json` file from source inputs:

```bash
python build_lookup.py
```

### Running the Server

Start the local development server:

```bash
python server.py
```

Open a web browser and navigate to `http://localhost:8000` to use the application.

## Educational Disclaimer

This project is intended strictly for personal educational usage.
