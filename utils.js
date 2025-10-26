export function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function linkify(text) {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})(?:\S+)?$/;

    // This regex is simplified to just process URLs, not Markdown
    return text.replace(urlRegex, (url) => {
        const match = url.match(youtubeRegex);
        const videoId = match ? match[1] : null;

        if (videoId) {
            // Use href="#" to prevent navigation, as Alpine will handle the click
            return `<a class="youtube-link" data-video-id="${videoId}" href="#">${url}</a>`;
        } else {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        }
    });
}

export function getYoutubeVideoId(url) {
    if (!url) return null; // Safety check for bad data
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})(?:\S+)?$/;
    const match = url.trim().match(youtubeRegex);
    return match ? match[1] : null;
}
