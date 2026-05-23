// src/utils/eventColors.js
// Mapping of event type strings to CSS color values (used for calendar event badges)

const EVENT_COLORS = {
  meeting: 'hsl(210, 70%, 70%)',   // soft blue
  briefing: 'hsl(45, 80%, 70%)',   // warm amber
  travel: 'hsl(340, 70%, 80%)',    // gentle pink
  default: 'hsl(200, 10%, 80%)'   // neutral gray
};

/**
 * Returns the background color for a given event type.
 * @param {string} type - Event type (e.g., 'meeting', 'briefing', 'travel')
 * @returns {string} CSS color string.
 */
export function getEventColor(type) {
  return EVENT_COLORS[type] || EVENT_COLORS.default;
}

export default EVENT_COLORS;
