import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function YouTubeModal({ open, onClose, url, title }) {
  // Extract YouTube video ID from various URL formats
  const getYouTubeVideoId = (url) => {
    if (!url) return null

    try {
      const urlObj = new URL(url)

      // Handle different YouTube URL formats
      // youtu.be/VIDEO_ID
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1)
      }

      // youtube.com/shorts/VIDEO_ID (check before watch parameter)
      if (urlObj.pathname.startsWith('/shorts/')) {
        return urlObj.pathname.split('/')[2]
      }

      // youtube.com/embed/VIDEO_ID
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/')[2]
      }

      // youtube.com/watch?v=VIDEO_ID
      if (urlObj.hostname.includes('youtube.com')) {
        const searchParams = new URLSearchParams(urlObj.search)
        return searchParams.get('v')
      }
    } catch (e) {
      console.error('Error parsing YouTube URL:', e)
      return null
    }

    return null
  }

  const videoId = getYouTubeVideoId(url)
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title || 'YouTube Video'}</DialogTitle>
        </DialogHeader>

        <div className="w-full">
          {embedUrl ? (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={embedUrl}
                title={title || 'YouTube video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex items-center justify-center p-12 bg-gray-100 rounded-lg">
              <p className="text-gray-500">Unable to load video. Invalid YouTube URL.</p>
            </div>
          )}
        </div>

        {/* Show URL link */}
        {url && (
          <div className="mt-4 text-sm">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 hover:underline"
            >
              Open in YouTube →
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
