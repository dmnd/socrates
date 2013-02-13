# Socrates

This is a repository of all _Socrates questions_ for Khan Academy.

## What are Socrates questions?

Socrates questions are small questions that pop up during a video. They aim to
change videos into a more active experience, giving the viewer feedback about
how well they are learning the content.

Here are some examples of videos that have Socrates questions:

  * [Equivalet fractions](https://www.khanacademy.org/math/arithmetic/fractions/Equivalent_fractions/v/equivalent-fractions)
  * [Fractions in lowest terms](https://www.khanacademy.org/math/arithmetic/fractions/Equivalent_fractions/v/fractions-in-lowest-terms)
  * [Meet the heart!](https://www.khanacademy.org/science/healthcare-and-medicine/the-heart/v/meet-the-heart)
  * Many more can be found here: [https://www.khanacademy.org/labs/socrates]()

## How can I create my own questions?

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
Khan Academy. You can also [read more about the how to create questions](https://sites.google.com/a/khanacademy.org/forge/for-video-creators/creating-socrates-questions).

## License

Copyright (c) 2013 Khan Academy

All questions are considered part of the video they are associated with and are
under the same license as this video.
