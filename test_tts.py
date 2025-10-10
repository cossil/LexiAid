import os
from google.cloud import texttospeech_v1beta1 as texttospeech
from google.cloud.texttospeech_v1beta1 import types

def synthesize_text_with_word_timepoints(text):
    client = texttospeech.TextToSpeechClient()

    # Convert plain text to SSML with <mark> tags around each word
    # This is a simplified approach; a more robust solution might involve
    # a proper SSML generation library or more complex parsing.
    words = text.split()
    ssml_text = "<speak>" + " ".join([f'<mark name="{word}"/>{word}' for word in words]) + "</speak>"

    input_text = types.SynthesisInput(ssml=ssml_text)

    # Select the type of audio file you want to be returned
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    # Perform the text-to-speech request on the SSML input
    request = types.SynthesizeSpeechRequest(
        input=input_text,
        voice=types.VoiceSelectionParams(language_code="en-US", name="en-US-Standard-C"),
        audio_config=audio_config,
        enable_time_pointing=[types.SynthesizeSpeechRequest.TimepointType.SSML_MARK]
    )

    response = client.synthesize_speech(request=request)
    return response

def generate_html_output(audio_filename, timepoints):
    # Generate table rows for timepoints
    timepoints_rows = ''.join([f'<tr><td>{tp.mark_name}</td><td>{tp.time_seconds:.3f}</td></tr>' for tp in timepoints])

    # Create a simple HTML file to display the timepoints
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>TTS Output</title>
        <style>
            table, th, td {{
                border: 1px solid black;
                border-collapse: collapse;
            }}
            th, td {{
                padding: 5px;
                text-align: left;
            }}
        </style>
    </head>
    <body>
        <h1>Synthesized Audio</h1>
        <audio controls src="{audio_filename}"></audio>
        <h1>Word Timepoints</h1>
        <table id="timepointsTable">
            <tr>
                <th>Mark Name</th>
                <th>Time (seconds)</th>
            </tr>
            {timepoints_rows}
        </table>
    </body>
    </html>
    """
    return html_content

if __name__ == "__main__":
    input_file = "input.txt"
    output_mp3 = "output.mp3"
    output_html = "output.html"

    # Read input text from file
    try:
        with open(input_file, "r", encoding="utf-8") as f:
            text_to_synthesize = f.read()
    except FileNotFoundError:
        print(f"Error: {input_file} not found. Please create it with text.")
        exit(1)

    if not text_to_synthesize.strip():
        print("Error: input.txt is empty. Please add some text.")
        exit(1)

    print(f"Synthesizing speech for text: '{text_to_synthesize}'")
    response = synthesize_text_with_word_timepoints(text_to_synthesize)

    # Write audio content to MP3 file
    with open(output_mp3, "wb") as out:
        out.write(response.audio_content)
    print(f"Audio content written to {output_mp3}")

    # Process the response to get audio content and timepoints
    audio_content = response.audio_content
    timepoints = response.timepoints

    # Generate and write HTML output
    html_output = generate_html_output(output_mp3, timepoints)
    with open(output_html, "w", encoding="utf-8") as f:
        f.write(html_output)
    print(f"HTML output written to {output_html}")

    print("Script finished successfully. Check output.mp3 and output.html.")
