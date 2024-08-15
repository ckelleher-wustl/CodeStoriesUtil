import sqlite3
import difflib
import subprocess
import tempfile
import os
from datetime import datetime
import json


def generate_diff(prev_code_text, code_text, filename):
    """Generate a unified diff between prev_code_text and code_text."""
    if prev_code_text is None or code_text is None:
        return ""  # Return an empty string if either is None

    diff = difflib.unified_diff(
        prev_code_text.splitlines(),
        code_text.splitlines(),
        fromfile=f'a/{filename}',
        tofile=f'b/{filename}',
        lineterm=''
    )
    return '\n'.join(diff)


def generate_side_by_side_diff_html(diff_string, base_directory, file_name):
    """Create a side-by-side diff HTML with clickable content."""
    diff_lines = diff_string.splitlines()
    left_lines = []
    right_lines = []
    old_line_num = None
    new_line_num = None
    full_file_path = f"{base_directory}/{file_name}"

    for line in diff_lines:
        if line.startswith('@@'):
            # Extract the line numbers for before and after from the hunk header
            hunk_info = line.split(' ')
            old_line_info = hunk_info[1][1:].split(',')
            new_line_info = hunk_info[2][1:].split(',')
            old_line_num = int(old_line_info[0])
            new_line_num = int(new_line_info[0])

            left_lines.append(f'<span class="diff-hunk">{line}</span>')
            right_lines.append(f'<span class="diff-hunk">{line}</span>')
        elif line.startswith('+') and new_line_num is not None:
            # Find the line number in the most recent file for the added line
            snippet = line[1:].strip()  # Remove the + and get the rest of the line
            actual_line_num = find_line_in_file(full_file_path, snippet)
            line_content = f"{new_line_num}: {line}"
            if actual_line_num:
                line_content = (
                    f'<a href="vscode://file/{full_file_path}:{actual_line_num}" '
                    f'target="_blank" style="text-decoration:none; color:inherit;">'
                    f'{new_line_num}: {line}</a>'
                )
            right_lines.append(f'<span class="diff-added" style="color: green;">{line_content}</span>')
            left_lines.append('<span class="diff-context"> </span>')  # Empty space for alignment
            new_line_num += 1
        elif line.startswith('-') and old_line_num is not None:
            # Find the line number in the previous version of the file for the removed line
            snippet = line[1:].strip()  # Remove the - and get the rest of the line
            actual_line_num = find_line_in_file(full_file_path, snippet)
            line_content = f"{old_line_num}: {line}"
            if actual_line_num:
                line_content = (
                    f'<a href="vscode://file/{full_file_path}:{actual_line_num}" '
                    f'target="_blank" style="text-decoration:none; color:inherit;">'
                    f'{old_line_num}: {line}</a>'
                )
            left_lines.append(f'<span class="diff-removed" style="color: red;">{line_content}</span>')
            right_lines.append('<span class="diff-context"> </span>')  # Empty space for alignment
            old_line_num += 1
        elif old_line_num is not None and new_line_num is not None:
            # Context line (unchanged)
            snippet = line.strip()
            left_line_num = find_line_in_file(full_file_path, snippet) or old_line_num
            right_line_num = find_line_in_file(full_file_path, snippet) or new_line_num

            left_lines.append(
                f'<a href="vscode://file/{full_file_path}:{left_line_num}" '
                f'target="_blank" style="text-decoration:none; color:inherit;">'
                f'<span class="diff-context">{old_line_num}: {line}</span></a>'
            )
            right_lines.append(
                f'<a href="vscode://file/{full_file_path}:{right_line_num}" '
                f'target="_blank" style="text-decoration:none; color:inherit;">'
                f'<span class="diff-context">{new_line_num}: {line}</span></a>'
            )
            old_line_num += 1
            new_line_num += 1

    left_html = '\n'.join(left_lines)
    right_html = '\n'.join(right_lines)

    # Combine left and right in a table for side-by-side view with a split in between
    return f"""
    <table style="width: 100%;">
        <tr>
            <td style="vertical-align: top; width: 50%; background-color: #f4f4f4; border-right: 1px solid #ccc;"><pre>{left_html}</pre></td>
            <td style="vertical-align: top; width: 50%; background-color: #f4f4f4;"><pre>{right_html}</pre></td>
        </tr>
    </table>
    """


def create_side_by_side_diff_html(diff_string):
    """Create side-by-side diff HTML using diff2html without external styling."""
    with tempfile.NamedTemporaryFile(suffix=".diff", delete=False, mode='w') as diff_file:
        diff_file.write(diff_string)
        diff_file_path = diff_file.name

    output_html_path = tempfile.mktemp(suffix=".html")

    # Use the full path to diff2html.cmd without style options
    diff2html_command = "C:/Program Files/nodejs/diff2html.cmd"

    try:
        subprocess.run(
            [diff2html_command, "-i", "file", "-s", "side", "-F", output_html_path, "--", diff_file_path],
            check=True
        )
        with open(output_html_path, 'r') as html_file:
            diff_html = html_file.read()
    finally:
        os.remove(diff_file_path)
        if os.path.exists(output_html_path):
            os.remove(output_html_path)

    return diff_html


def process_all_new_additions(diff_text, base_directory, file_name):
    """Process a diff text that contains only additions and annotate line numbers."""
    diff_lines = diff_text.splitlines()
    processed_lines = []
    new_line_num = None

    for line in diff_lines:
        if line.startswith('@@'):
            # Extract the line number for the new additions from the hunk header
            hunk_info = line.split(' ')
            new_line_info = hunk_info[2][1:].split(',')
            new_line_num = int(new_line_info[0])

            processed_lines.append(f'<span class="diff-hunk">{line}</span>')
        elif line.startswith('+++') or line.startswith('---'):
            continue  # Skip the file name lines
        elif line.startswith('+'):
            snippet = line[1:15].strip()  # Use the first 14 characters after the + as the snippet
            full_file_path = os.path.join(base_directory, file_name)
            actual_line_num = find_line_in_file(full_file_path, snippet)
            line_content = f"{new_line_num}: {line[1:].strip()}"
            if actual_line_num:
                line_content = (
                    f'<a href="vscode://file/{full_file_path}:{actual_line_num}" '
                    f'target="_blank" style="text-decoration:none; color:inherit;">'
                    f'{new_line_num}: {line[1:].strip()}</a>'
                )
            processed_lines.append(f'<span class="diff-added" style="color: green;">{line_content}</span>')
            new_line_num += 1
        else:
            processed_lines.append(f'<span class="diff-context">{line}</span>')

    return '\n'.join(processed_lines)

def find_line_in_file(file_path, snippet):
    """Searches for the line containing the snippet in the given file and returns the line number."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            for i, line in enumerate(file, 1):  # Start line numbers at 1
                if snippet.strip() in line:
                    return i
    except UnicodeDecodeError:
        print(f"Skipping file {file_path} due to encoding error.")
        return None
    except FileNotFoundError:
        return None
    return None

def format_selection_event(file_name, selectedText, coords, base_directory):
    """Formats the selection event by bolding the selected lines and adding clickable content."""
    full_file_path = f"{base_directory}/{file_name}"

    # Parse the coords from the JSON dump
    start_line, end_line = json.loads(coords)

    # Split the selected text into lines
    selected_lines = selectedText.split("\n")

    # Map the selected text to the line numbers that start from coords
    line_map = {}
    current_line = start_line
    for line in selected_lines:
        # Find the actual line number in the most recent file
        actual_line_number = find_line_in_file(full_file_path, line)
        line_map[current_line] = (line, actual_line_number)
        current_line += 1

    # Format the lines with clickable links based on content and maintaining linenum: content format
    formatted_text = ""
    for line_number, (line_text, actual_line_number) in line_map.items():
        line_text = line_text.strip()  # Remove any extra whitespace
        if line_text:  # Check if the line has any text (not just whitespace)
            if actual_line_number:
                formatted_text += (
                    f'<a href="vscode://file/{full_file_path}:{actual_line_number}" '
                    f'target="_blank" style="text-decoration:none; color:inherit;">'
                    f'{line_number}: <b>{line_text}</b></a>\n'
                )
            else:
                # If the exact line is not found, just bold the text without a link
                formatted_text += f"{line_number}: <b>{line_text}</b>\n"
        else:
            formatted_text += f"{line_number}: {line_text}\n"  # Preserve empty lines

    return formatted_text



def generate_content_timeline(db_path, output_html_path, base_directory):
    # Connect to the SQLite database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Query to fetch relevant events including selections
    cursor.execute("""
        SELECT notes, diff_text, code_text, prev_code_text, time, coords
        FROM CodingEvents 
        WHERE notes LIKE 'save:%' OR notes LIKE 'selection:%' OR notes LIKE 'code:%' OR notes LIKE 'output:%' 
        ORDER BY time;
        """)

    events = cursor.fetchall()

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
        notes, diff_text, code_text, prev_code_text, event_time, coords = event
        file_name = notes.split(':')[1].strip()
        file_name = file_name[:-1] if file_name.endswith(';') else file_name

        if 'output.txt' in file_name and 'selection:' in notes:
            # Skip selection events in output.txt
            continue

        if 'selection:' in notes:
            # Handle selection event
            formatted_selection = format_selection_event(file_name, code_text, coords, base_directory)
            html_output += f"""
                <div class="event">
                    <div class="filename">{file_name}</div>
                    <div class="code"><pre>{formatted_selection}</pre></div>
                    <div class="timestamp">Click: {datetime.fromtimestamp(event_time).strftime('%m/%d/%Y %I:%M %p')}</div>
                </div>
                <hr>
                """

        elif 'save:' in notes:
            # html_output += f"""
            #     <div class="event">
            #         <div class="filename">{file_name}</div>
            #         <div class="timestamp">SAVE {datetime.fromtimestamp(event_time).strftime('%m/%d/%Y %I:%M %p')}</div>
            #     </div>
            #     <hr>
            #     """
            continue
        elif 'code:' in notes or 'output:' in notes:
            # Handle code changes and output (build) events
            diff_string = generate_diff(prev_code_text, code_text, file_name)
            if diff_string.strip():
                diff_html = generate_side_by_side_diff_html(diff_string, base_directory, file_name)
            else:
                diff_html = process_all_new_additions(diff_text, base_directory, file_name)

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
                        <div class="code"><pre>{diff_html}</pre></div>
                        <div class="timestamp">SAVE {datetime.fromtimestamp(event_time).strftime('%m/%d/%Y %I:%M %p')}</div>
                    </div>
                    <hr>
                    """

    html_output += """
            </div>
        </body>
        </html>
        """

    conn.close()

    # Save the generated HTML to a file
    with open(output_html_path, 'w') as file:
        file.write(html_output)

    print(f"HTML content timeline generated: {output_html_path}")

# Example usage
if __name__ == "__main__":
    db_path = 'new_doodleJump_history.db'  # Replace with the path to your SQLite database
    output_html_path = 'doodlejump_content_timeline.html'  # Replace with your desired output file path
    base_directory = r"C:\Users\thien\Desktop\doodleJump"  # Replace with the base directory of your project files

    generate_content_timeline(db_path, output_html_path, base_directory)
