/**
 * Fetches HTML content from a file within the /views/ directory and injects it into a specified DOM element.
 * @param {string} fileName - The name of the HTML file (without the .html extension).
 * @param {string} targetElementId - The ID of the DOM element where the HTML should be injected.
 */
export async function loadAndInjectHtml(fileName, targetElementId) {
    try {
        const response = await fetch(`views/${fileName}.html`);

        if (!response.ok) {
            throw new Error(`Could not fetch ${fileName}.html. Status: ${response.status}`);
        }

        const html = await response.text();
        const targetElement = document.getElementById(targetElementId);

        if (targetElement) {
            targetElement.innerHTML = html;
        } else {
            console.error(`Error: Target element with ID '${targetElementId}' not found.`);
        }
    } catch (error) {
        console.error(`Error loading view '${fileName}':`, error);
    }
}