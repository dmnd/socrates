# Socrates

This is a repository of all _Socrates questions_ for Khan Academy.

Socrates questions are small questions that pop up during a video. They aim to
change videos into a more active experience, giving the viewer feedback about
how well they are learning the content.

## Creating your own questions

This repo also contains a very simple question previewer that lets you test
questions independently of Khan Academy. To see it, run the following from the
root of your working copy:

    python -m SimpleHTTPServer

Then go to [http://localhost:8000/editor]() in your browser. From here you can load
an arbitary YouTube video into the page, and load an arbitary question file
into that video.

To create new questions for a new video, it's probably simplest to copy an
existing question file and edit it. Question files are in YAML format.

Once you are happy with your questions, contact dmnd and he will get them onto
Khan Academy.

## License

Copyright (c) 2013 Khan Academy

All questions are considered part of the video they are associated with and are
under the same license as this video.
