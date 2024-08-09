import sqlite3
import pandas as pd
from jinja2 import Template
from datetime import datetime


import os

def find_line_in_file(file_path, snippet):
    """Searches for the line containing the snippet in the given file and returns the line number."""
    with open(file_path, 'r', encoding='utf-8') as file:
        for i, line in enumerate(file, 1):  # Start line numbers at 1
            if snippet in line:
                return i
    return None

def annotate_diff(diff_text, file_name):
    base_directory = "C:/Users/pham/Downloads/doodlejump/doodlejump"
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
        elif line.startswith('+') or line.startswith('-'):
            # Extract a snippet from the line for searching
            snippet = line[1:15]  # Use the first 14 characters after the + or - as the snippet
            actual_line_num = find_line_in_file(full_file_path, snippet)

            if actual_line_num is not None:
                line_id = f"{file_name}-{actual_line_num}"
                if line.startswith('+'):
                    annotated_diff.append(f'<a href="#{line_id}" onclick="navigateToLine(\'{full_file_path}\', {actual_line_num})"><span id="{line_id}" class="diff-added">{line}</span></a>')
                else:
                    annotated_diff.append(f'<a href="#{line_id}" onclick="navigateToLine(\'{full_file_path}\', {actual_line_num})"><span id="{line_id}" class="diff-removed">{line}</span></a>')
            else:
                annotated_diff.append(f'<span class="diff-context">{line}</span>')
        else:
            if old_line_num is not None and new_line_num is not None:
                line_id = f"{file_name}-{old_line_num}-{new_line_num}"
                annotated_diff.append(f'<span id="{line_id}" class="diff-context">{line}</span>')
                old_line_num += 1
                new_line_num += 1

    return '\n'.join(annotated_diff)




def generate_content_timeline(db_path, output_html_path):
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Query to fetch relevant events
    cursor.execute("""
        SELECT notes, diff_text, time 
        FROM CodingEvents 
        WHERE notes LIKE 'code:%' OR notes LIKE 'output:%' 
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
                    // Try opening in VS Code Insiders first
                    const vscodeInsidersUrl = `vscode-insiders://file/${file}:${line}`;
                    const vscodeUrl = `vscode://file/${file}:${line}`;
                
                    // Create an anchor element and try to open VS Code Insiders
                    const a = document.createElement('a');
                    a.href = vscodeInsidersUrl;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                
                    // Check if VS Code Insiders opened; if not, fallback to regular VS Code
                    setTimeout(() => {
                        // Try opening regular VS Code after a slight delay
                        window.location.href = vscodeUrl;
                    }, 500);
                }
                </script>
        </head>
        <body>
            <div class="timeline">
        """

    for event in events:
        notes, diff_text, event_time = event
        file_name = notes.split(':')[1].strip()
        # remove ; from the end of the file name
        file_name = file_name[:-1] if file_name.endswith(';') else file_name

        # Annotate the diff with color
        annotated_diff = annotate_diff(diff_text, file_name)

        # Append the result to the final HTML
        # if file_name is output.txt only show timestamp
        # otherwise only show the file name and the code
        # Append the result to the final HTML based on the file name
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
db_path = 'gitData.db'  # Replace with the path to your SQLite database
output_html_path = 'doodlejump_content_timeline.html'  # Replace with your desired output file path

generate_content_timeline(db_path, output_html_path)

