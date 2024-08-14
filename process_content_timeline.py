import sqlite3
import re
from datetime import datetime

# Existing function to find line numbers in files
def find_line_in_file(file_path, snippet):
    """Searches for the line containing the snippet in the given file and returns the line number."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            for i, line in enumerate(file, 1):  # Start line numbers at 1
                if snippet in line:
                    return i
    except FileNotFoundError:
        return None
    return None

# Updated function to annotate diffs with color and links
def annotate_diff(diff_text, file_name):
    if diff_text is None:
        return ""

    base_directory = r"C:\Users\thien\Desktop\doodleJump"  # Update this as needed
    full_file_path = f"{base_directory}/{file_name}"

    annotated_diff = []
    old_line_num = None
    new_line_num = None

    for line in diff_text.splitlines():
        if line.startswith('@@'):
            parts = line.split(' ')
            old_range = parts[1]
            new_range = parts[2]
            old_line_num = int(old_range.split(',')[0].replace('-', ''))
            new_line_num = int(new_range.split(',')[0].replace('+', ''))
            annotated_diff.append(f'<span class="diff-hunk">{line}</span>')
        elif line.startswith('+'):
            snippet = line[1:15]  # Use the first 14 characters after the + as the snippet
            actual_line_num = find_line_in_file(full_file_path, snippet)

            if actual_line_num is not None:
                line_id = f"{file_name}-{actual_line_num}"
                annotated_diff.append(f'<a href="#{line_id}" onclick="navigateToLine(\'{full_file_path}\', {actual_line_num})"><span id="{line_id}" class="diff-added" style="color: green;">{line}</span></a>')
            else:
                annotated_diff.append(f'<span class="diff-added" style="color: green;">{line}</span>')
        elif line.startswith('-'):
            snippet = line[1:15]  # Use the first 14 characters after the - as the snippet
            actual_line_num = find_line_in_file(full_file_path, snippet)

            if actual_line_num is not None:
                line_id = f"{file_name}-{actual_line_num}"
                annotated_diff.append(f'<a href="#{line_id}" onclick="navigateToLine(\'{full_file_path}\', {actual_line_num})"><span id="{line_id}" class="diff-removed" style="color: red;">{line}</span></a>')
            else:
                annotated_diff.append(f'<span class="diff-removed" style="color: red;">{line}</span>')
        else:
            annotated_diff.append(f'<span class="diff-context">{line}</span>')

    return '\n'.join(annotated_diff)

# Function to handle selection events
import json


def format_selection_event(selectedText, coords):
    # Parse the coords from the JSON dump
    start_line, end_line = json.loads(coords)

    # Split the selected text into lines
    selected_lines = selectedText.split("\n")

    # Map the selected text to the line numbers that start from coords
    line_map = {}
    current_line = start_line
    for line in selected_lines:
        line_map[current_line] = line
        current_line += 1

    # Format the lines with line numbers and bold the entire text line
    formatted_text = ""
    for line_number, line_text in line_map.items():
        if line_text.strip():  # Check if the line has any text (not just whitespace)
            formatted_text += f"{line_number}: <b>{line_text}</b>\n"
        else:
            formatted_text += f"{line_number}: {line_text}\n"

    return formatted_text


# Function to generate the HTML content timeline
def generate_content_timeline(db_path, output_html_path):
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Query to fetch relevant events including selections
    cursor.execute("""
        SELECT notes, diff_text, code_text, time, timed_url, coords
        FROM CodingEvents 
        WHERE notes LIKE 'save:%' OR notes LIKE 'selection:%' OR notes LIKE 'code:%' OR notes LIKE 'output:%' 
        ORDER BY time;
        """)

    events = cursor.fetchall()
    conn.close()

    html_output = """
        <html>
        <head>
            <style>
                .diff-added { color: green; text-decoration: none; }
                .diff-removed { color: red; text-decoration: none; }
                .diff-hunk { color: blue; text-decoration: none; }
                .diff-context { color: black; text-decoration: none; }
                .filename { font-weight: bold; margin-bottom: 5px; }
                .timestamp { color: #95a5a6; font-size: 0.9em; margin-top: 10px; }
                .code { background-color: #f4f4f4; padding: 10px; border-radius: 5px; font-family: "Courier New", monospace; margin-top: 5px; }
                .event { margin-bottom: 20px; }
                a { text-decoration: none; } /* Removes underline from all links */
            </style>

            <script>
                function navigateToLine(file, line) {
                    const vscodeInsidersUrl = `vscode-insiders://file/${file}:${line}`;
                    const vscodeUrl = `vscode://file/${file}:${line}`;
                
                    const a = document.createElement('a');
                    a.href = vscodeInsidersUrl;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                
                    setTimeout(() => {
                        window.location.href = vscodeUrl;
                    }, 500);
                }
                </script>
        </head>
        <body>
            <div class="timeline">
        """

    for event in events:
        notes, diff_text, code_text, event_time, file_name, coords = event
        file_name = notes.split(':')[1].strip()
        file_name = file_name[:-1] if file_name.endswith(';') else file_name

        if 'output.txt' in file_name and 'selection:' in notes:
            # Skip selection events in output.txt
            continue

        if 'selection:' in notes:
            # Handle selection event
            formatted_selection = format_selection_event(code_text, coords)
            html_output += f"""
                <div class="event">
                    <div class="filename">{file_name}</div>
                    <div class="code"><pre>{formatted_selection}</pre></div>
                    <div class="timestamp">Click: {datetime.fromtimestamp(event_time).strftime('%m/%d/%Y %I:%M %p')}</div>
                </div>
                <hr>
                """
        elif 'save:' in notes:
            # Handle save event, do not show "No changes available" if diff_text is None
            annotated_diff = annotate_diff(diff_text, file_name)
            if annotated_diff:
                html_output += f"""
                    <div class="event">
                        <div class="filename">{file_name}</div>
                        <div class="code"><pre>{annotated_diff}</pre></div>
                        <div class="timestamp">SAVE {datetime.fromtimestamp(event_time).strftime('%m/%d/%Y %I:%M %p')}</div>
                    </div>
                    <hr>
                    """
        elif 'code:' in notes or 'output:' in notes:
            # Handle code changes and output (build) events
            annotated_diff = annotate_diff(diff_text, file_name)
            if file_name == "output.txt":
                html_output += f"""
                    <div class="event">
                        <div class="timestamp">BUILD {datetime.fromtimestamp(event_time).strftime('%m/%d/%Y %I:%M %p')}</div>
                    </div>
                    <hr>
                    """
            else:
                html_output += f"""
                    <div class="event">
                        <div class="filename">{file_name}</div>
                        <div class="code"><pre>{annotated_diff}</pre></div>
                        <div class="timestamp">SAVE {datetime.fromtimestamp(event_time).strftime('%m/%d/%Y %I:%M %p')}</div>
                    </div>
                    <hr>
                    """

    html_output += """
            </div>
        </body>
        </html>
        """

    # Save the generated HTML to a file
    with open(output_html_path, 'w') as file:
        file.write(html_output)

    print(f"HTML content timeline generated: {output_html_path}")

# Example usage
db_path = 'new_doodleJump_history.db'  # Update with the correct path to your SQLite database
output_html_path = 'doodlejump_content_timeline.html'  # Update with your desired output file path

generate_content_timeline(db_path, output_html_path)
