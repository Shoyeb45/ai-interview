"""Video pipeline placeholder. Add video processing here when needed.

Session will own: self.video_pipeline = VideoPipeline(self)
No touching audio, agent, or transport.
"""


class VideoPipeline:
    def __init__(self, session):
        self.session = session
        # Add video processing logic when needed
