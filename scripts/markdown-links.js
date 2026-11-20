export function markdownLinks(text) {
  const links = [];
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf("[", cursor);
    if (start < 0) break;
    const labelEnd = text.indexOf("]", start + 1);
    if (labelEnd < 0) break;
    if (text[labelEnd + 1] !== "(") {
      cursor = labelEnd + 1;
      continue;
    }
    const destination = labelEnd + 2;
    const end = text.indexOf(")", destination);
    if (end < 0) break;
    if (end > destination) links.push(text.slice(destination, end));
    cursor = end + 1;
  }
  return links;
}
