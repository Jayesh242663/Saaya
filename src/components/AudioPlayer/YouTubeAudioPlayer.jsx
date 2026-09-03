import './YouTubeAudioPlayer.css';

export function YouTubeAudioPlayer() {
  return (
    <div
      id="youtube-audio-container"
      aria-hidden="true"
      className="youtube-audio-container"
    >
      <div id="youtube-audio-engine" />
    </div>
  );
}
