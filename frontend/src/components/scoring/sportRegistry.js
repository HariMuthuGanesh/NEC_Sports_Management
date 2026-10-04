/**
 * sportRegistry.js
 *
 * Maps sport names (as stored in the DB / returned by the matches API)
 * to their dedicated scoreboard components.
 *
 * To add a new sport:
 *  1. Create  frontend/src/components/scoring/YourSportScoreboard.jsx
 *  2. Import it here and add one line to SPORT_REGISTRY.
 *
 * Any sport not in the registry falls back to GenericScoreboard automatically.
 */

import GenericScoreboard    from "./GenericScoreboard";
import CricketScoreboard    from "./CricketScoreboard";
import FootballScoreboard   from "./FootballScoreboard";
import VolleyballScoreboard from "./VolleyballScoreboard";
import BasketballScoreboard from "./BasketballScoreboard";

/** Maps the exact sport name string returned by the API to a component. */
const SPORT_REGISTRY = {
  Cricket:    CricketScoreboard,
  Football:   FootballScoreboard,
  Volleyball: VolleyballScoreboard,
  Basketball: BasketballScoreboard,
  // Kabaddi:    KabaddiScoreboard,
  // Badminton:  BadmintonScoreboard,
};

/**
 * Returns the scoreboard component for a given sport.
 * Falls back to GenericScoreboard for unknown sports.
 *
 * @param {string} sportName - Sport name from the matches API.
 * @returns {React.ComponentType}
 */
export function getScoreboardComponent(sportName) {
  return SPORT_REGISTRY[sportName] || GenericScoreboard;
}

export default SPORT_REGISTRY;
