import DOMPurify from "dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Use this for any user-generated content rendered as HTML.
 */
export const sanitizeHtml = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [
            "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li",
            "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre",
            "table", "thead", "tbody", "tr", "th", "td", "span", "div", "hr",
        ],
        ALLOWED_ATTR: ["href", "target", "rel", "class", "id"],
        ALLOW_DATA_ATTR: false,
    });
};

/**
 * Strip all HTML tags — returns plain text only.
 * Use this for inputs that should never contain HTML (names, descriptions).
 */
export const stripHtml = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
};

/**
 * Sanitize text input — strips HTML and trims whitespace.
 * Use for form inputs before sending to the backend.
 */
export const sanitizeInput = (value: string): string => {
    return stripHtml(value).trim();
};
