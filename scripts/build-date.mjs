// Use the same UTC day for git timestamps, build checks and live checks.
export const utcDate = timestamp => new Date(timestamp).toISOString().slice(0, 10);
